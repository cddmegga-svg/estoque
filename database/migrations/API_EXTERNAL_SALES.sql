-- Migration: API_EXTERNAL_SALES
-- Description: Creates the RPC to safely receive external stock deductions from PDVs like Alpha7/Lothus.

CREATE OR REPLACE FUNCTION api_register_external_sale(
    p_pdv_source TEXT,
    p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_filial_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_current_stock INTEGER;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_errors JSONB[] := ARRAY[]::JSONB[];
BEGIN
    -- 1. Identify context (Security)
    -- We assume the caller authenticated natively via HTTP API (using owner's email/password) 
    -- Or we use the Service Role (which we shouldn't unless necessary).
    -- So get_current_tenant_id() should work if called correctly via REST.
    v_tenant_id := get_current_tenant_id();

    IF v_tenant_id IS NULL OR v_tenant_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tenant não identificado ou não autenticado.');
    END IF;

    -- Get a default filial for this tenant (ideally we should pass filial_id, but for now we pick the first)
    SELECT id INTO v_filial_id FROM filiais WHERE tenant_id = v_tenant_id AND type = 'store' LIMIT 1;

    -- 2. Loop through JSON items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- v_item ->> 'barcode'
        -- v_item ->> 'quantity'

        -- 2.1 Find Product (Match Barcode AND Tenant)
        SELECT id, stock INTO v_product_id, v_current_stock
        FROM products 
        WHERE barcode = (v_item->>'barcode')::TEXT 
          AND tenant_id = v_tenant_id
        LIMIT 1;

        IF v_product_id IS NULL THEN
            v_error_count := v_error_count + 1;
            v_errors := array_append(v_errors, jsonb_build_object(
                'barcode', v_item->>'barcode', 
                'error', 'Produto não encontrado'
            ));
            CONTINUE; -- Skip to next item
        END IF;

        -- 2.2 Deduct Stock
        UPDATE products 
        SET stock = stock - (v_item->>'quantity')::INTEGER,
            updated_at = NOW()
        WHERE id = v_product_id;

        -- 2.3 Record Movement (Auditing)
        INSERT INTO movements (
            product_id, 
            type, 
            quantity, 
            reason, 
            document, 
            created_by, 
            tenant_id
        ) VALUES (
            v_product_id,
            'SALE_EXTERNAL', -- New type indicating external POS
            -(v_item->>'quantity')::INTEGER, -- Negative because it's a deduction
            'Venda via integrador: ' || p_pdv_source,
            NULL,
            auth.uid(), -- The API user ID
            v_tenant_id
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    -- 3. Return results
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Lote de sincronização concluído.',
        'processed', v_success_count,
        'errors', v_error_count,
        'error_details', to_jsonb(v_errors)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Erro catastrófico no processamento.',
        'error_code', SQLSTATE,
        'error_msg', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
