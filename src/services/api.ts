
import { supabase } from '@/lib/supabase';
import { Product, StockItem, Filial, Transfer, Movement, User, Supplier, AccountPayable, TransferSuggestion } from '@/types';

// Products
export const fetchProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
        .limit(5000);

    if (error) throw error;

    // Transform snake_case to camelCase
    return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        activeIngredient: item.active_ingredient,
        manufacturer: item.manufacturer,
        ean: item.ean,
        ncm: item.ncm,
        costPrice: item.cost_price || 0,
        salePrice: item.sale_price || 0,
        imageUrl: item.image_url,
        category: item.category,
        distributor: item.distributor,
        minStock: item.min_stock || 0,
        pmcPrice: item.pmc_price || 0,
        commissionRate: item.commission_rate || 0,
        // Extended Data
        profitMargin: item.profit_margin,
        taxCfop: item.tax_cfop,
        taxIcms: item.tax_icms,
        taxPis: item.tax_pis,
        taxCofins: item.tax_cofins,
        taxIpi: item.tax_ipi,
    }));
};

// Filiais
export const fetchFiliais = async (): Promise<Filial[]> => {
    const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .order('name');

    if (error) throw error;

    return data;
};

export const addFilial = async (filial: Omit<Filial, 'id'>) => {
    const { data, error } = await supabase
        .from('filiais')
        .insert([{
            name: filial.name,
            cnpj: filial.cnpj,
            address: filial.address,
            type: filial.type
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateFilial = async (id: string, updates: Partial<Filial>) => {
    const { data, error } = await supabase
        .from('filiais')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Stock
export const fetchStock = async (): Promise<StockItem[]> => {
    const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .limit(5000);

    if (error) throw error;

    return data.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        filialId: item.filial_id,
        lote: item.lote,
        expirationDate: item.expiration_date,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        entryDate: item.entry_date,
        nfeNumber: item.nfe_number
    }));
};

// Transfers
export const fetchTransfers = async (): Promise<Transfer[]> => {
    const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .order('transfer_date', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        fromFilialId: item.from_filial_id,
        toFilialId: item.to_filial_id,
        lote: item.lote,
        quantity: item.quantity,
        transferDate: item.transfer_date,
        userId: item.user_id,
        userName: item.user_name,
        status: item.status,
        notes: item.notes
    }));
};

export const createTransfer = async (transferData: any) => {
    // Calls the postgres function process_transfer
    const { data, error } = await supabase.rpc('process_transfer', {
        p_product_id: transferData.productId,
        p_from_filial_id: transferData.fromFilialId,
        p_to_filial_id: transferData.toFilialId,
        p_lote: transferData.lote,
        p_quantity: transferData.quantity,
        p_user_id: transferData.userId,
        p_user_name: transferData.userName,
        p_notes: transferData.notes
    });

    if (error) throw error;
    return data;
};

// Mutations
export const addProduct = async (product: any, userId?: string) => {
    // Prepare the object
    const productData: any = {
        name: product.name,
        active_ingredient: product.activeIngredient,
        manufacturer: product.manufacturer,
        ean: product.ean,
        ncm: product.ncm,
        cost_price: product.costPrice,
        sale_price: product.salePrice,
        image_url: product.imageUrl,
        category: product.category,
        distributor: product.distributor,
        min_stock: product.minStock,
        pmc_price: product.pmcPrice,
        commission_rate: product.commissionRate,
        created_by: userId,
        updated_by: userId
    };

    if (product.id) {
        productData.id = product.id;
    }

    const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

    if (error) throw error;
    return data;
};


export const updateProduct = async (id: string, updates: any, userId?: string) => {
    const productData: any = {};
    if (updates.name) productData.name = updates.name;
    if (updates.activeIngredient) productData.active_ingredient = updates.activeIngredient;
    if (updates.manufacturer) productData.manufacturer = updates.manufacturer;
    if (updates.ean) productData.ean = updates.ean;
    if (updates.ncm) productData.ncm = updates.ncm;
    if (updates.costPrice !== undefined) productData.cost_price = updates.costPrice;
    if (updates.salePrice !== undefined) productData.sale_price = updates.salePrice;
    if (updates.imageUrl !== undefined) productData.image_url = updates.imageUrl;
    if (updates.category !== undefined) productData.category = updates.category;
    if (updates.distributor !== undefined) productData.distributor = updates.distributor;
    if (updates.minStock !== undefined) productData.min_stock = updates.minStock;
    if (updates.pmcPrice !== undefined) productData.pmc_price = updates.pmcPrice;
    if (userId) productData.updated_by = userId;

    const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteProduct = async (id: string) => {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

export const addStockItem = async (item: any) => {
    const { data, error } = await supabase
        .from('stock_items')
        .insert([{
            product_id: item.productId,
            filial_id: item.filialId,
            lote: item.lote,
            expiration_date: item.expirationDate,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            entry_date: item.entryDate,
            nfe_number: item.nfeNumber
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateStockItem = async (id: string, updates: any) => {
    const { data, error } = await supabase
        .from('stock_items')
        .update({
            quantity: updates.quantity
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const addMovement = async (movement: any) => {
    const { data, error } = await supabase
        .from('movements')
        .insert([{
            product_id: movement.productId,
            filial_id: movement.filialId,
            lote: movement.lote,
            type: movement.type,
            quantity: movement.quantity,
            date: movement.date,
            user_id: movement.userId,
            user_name: movement.userName,
            notes: movement.notes,
            nfe_number: movement.nfeNumber,
            transfer_id: movement.transferId
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const addTransfer = async (transfer: any) => {
    return createTransfer(transfer);
};

export const fetchMovements = async (): Promise<Movement[]> => {
    const { data, error } = await supabase
        .from('movements')
        .select('*')
        .order('date', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        filialId: item.filial_id,
        lote: item.lote,
        type: item.type,
        quantity: item.quantity,
        date: item.date,
        userId: item.user_id,
        userName: item.user_name,
        notes: item.notes,
        nfeNumber: item.nfe_number,
        transferId: item.transfer_id
    }));
};

// Users
export const fetchUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

    if (error) throw error;

    return data.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        filialId: user.filial_id,
        permissions: user.permissions || []
    }));
};

export const addUser = async (user: User) => {
    const { data, error } = await supabase
        .from('users')
        .insert([{
            id: user.id, // ID should ideally come from Auth, but for manual add we use generated
            name: user.name,
            email: user.email,
            role: user.role,
            filial_id: user.filialId,
            permissions: user.permissions || []
        }])
        .select()
        .single();

    if (error) throw error;

    // Note: This user won't have a Supabase Auth account yet. 
    // They would need to Sign Up with this email (if logic supports linking) or we use Admin Auth API (server-side).
    return data;
};

export const updateUser = async (id: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.filialId) dbUpdates.filial_id = updates.filialId;
    if (updates.permissions) dbUpdates.permissions = updates.permissions;

    const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteUser = async (id: string) => {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
// Suppliers
export const fetchSuppliers = async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

    if (error) throw error;
    return data;
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>, userId?: string) => {
    const { data, error } = await supabase
        .from('suppliers')
        .insert([{
            ...supplier,
            created_by: userId,
            updated_by: userId
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateSupplier = async (id: string, updates: Partial<Supplier>, userId?: string) => {
    const { data, error } = await supabase
        .from('suppliers')
        .update({
            ...updates,
            updated_by: userId
        })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteSupplier = async (id: string) => {
    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// Financial (Accounts Payable)
export const fetchPayables = async (): Promise<AccountPayable[]> => {
    const { data, error } = await supabase
        .from('accounts_payable')
        .select('*')
        .order('due_date', { ascending: true });

    if (error) throw error;

    return data.map((item: any) => ({
        id: item.id,
        description: item.description,
        supplierId: item.supplier_id,
        entityName: item.entity_name,
        amount: item.amount,
        dueDate: item.due_date,
        status: item.status,
        barcode: item.barcode,
        invoiceNumber: item.invoice_number,
        filialId: item.filial_id,
        notes: item.notes
    }));
};

export const addPayable = async (payable: Omit<AccountPayable, 'id'>, userId?: string) => {
    const { data, error } = await supabase
        .from('accounts_payable')
        .insert([{
            description: payable.description,
            supplier_id: payable.supplierId,
            entity_name: payable.entityName,
            amount: payable.amount,
            due_date: payable.dueDate,
            status: payable.status,
            barcode: payable.barcode,
            invoice_number: payable.invoiceNumber,
            filial_id: payable.filialId,
            notes: payable.notes,
            created_by: userId,
            updated_by: userId
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updatePayable = async (id: string, updates: Partial<AccountPayable>, userId?: string) => {
    const dbUpdates: any = { ...updates };
    if (updates.supplierId !== undefined) dbUpdates.supplier_id = updates.supplierId;
    if (updates.entityName !== undefined) dbUpdates.entity_name = updates.entityName;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.invoiceNumber !== undefined) dbUpdates.invoice_number = updates.invoiceNumber;
    if (updates.filialId !== undefined) dbUpdates.filial_id = updates.filialId;
    if (userId) dbUpdates.updated_by = userId;

    const { data, error } = await supabase
        .from('accounts_payable')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deletePayable = async (id: string) => {
    const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// Purchase Requests
export const fetchPurchaseRequests = async () => {
    const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const addPurchaseRequest = async (request: any) => {
    const { data, error } = await supabase
        .from('purchase_requests')
        .insert(request)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updatePurchaseRequest = async (id: string, updates: any) => {
    const { data, error } = await supabase
        .from('purchase_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deletePurchaseRequest = async (id: string) => {
    const { error } = await supabase
        .from('purchase_requests')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- Sales ---
export const createSale = async (
    subtotal: number,
    discount: number,
    total: number,
    items: any[],
    customerName?: string,
    userId?: string,
    userName?: string,
    filialId?: string,
    salespersonId?: string,
    paymentStatus: 'pending' | 'paid' = 'paid',
    status: 'open' | 'completed' = 'completed',
    paymentMethod?: string, // Legacy/Primary method
    payments: { method: string, amount: number }[] = [], // NEW: Split Payments
    cashRegisterId?: string,
    cashierId?: string,
    customerId?: string
) => {
    // 1. Create Sale Header
    const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
            customer_name: customerName,
            total_value: subtotal,
            discount_value: discount,
            final_value: total,
            payment_status: paymentStatus,
            payment_method: payments.length > 1 ? 'split' : (payments[0]?.method || paymentMethod || 'money'),
            user_id: userId,
            user_name: userName,
            filial_id: filialId,
            employee_id: salespersonId,
            cashier_employee_id: cashierId && salespersonId !== cashierId ? cashierId : null,
            cash_register_id: cashRegisterId,
            customer_id: customerId
        })
        .select()
        .single();

    if (saleError) throw saleError;

    // 2. Create Sale Items
    const saleItems = items.map((item: any) => ({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.salePrice,
        total_price: item.quantity * item.product.salePrice,
        commission_value: (item.product.salePrice * item.quantity) * ((item.product.commissionRate || 0) / 100)
    }));

    const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

    if (itemsError) throw itemsError;

    // 2.1 Create Sale Payments (Split)
    if (payments.length > 0) {
        const paymentRecords = payments.map(p => ({
            sale_id: sale.id,
            method: p.method,
            amount: p.amount
        }));

        const { error: payError } = await supabase
            .from('sale_payments')
            .insert(paymentRecords);

        if (payError) throw payError;
    }

    // 3. Deduct Stock via FEFO (First Expired, First Out)
    for (const item of items) {
        await deductStockFEFO(
            item.product.id,
            item.quantity,
            filialId!,
            userId!,
            userName!,
            sale.id
        );
    }

    return sale;
};

// Helper: FEFO Stock Deduction
const deductStockFEFO = async (
    productId: string,
    quantity: number,
    filialId: string,
    userId: string,
    userName: string,
    saleId: string
) => {
    let remaining = quantity;

    // 1. Fetch valid stock items sorted by expiration date (FEFO)
    const { data: lots, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('product_id', productId)
        .eq('filial_id', filialId)
        .gt('quantity', 0)
        .order('expiration_date', { ascending: true });

    if (error) {
        console.error('FEFO Fetch Error:', error);
        throw error;
    }

    // 2. Iterate and Deduct
    for (const lot of (lots || [])) {
        if (remaining <= 0) break;

        const deduct = Math.min(lot.quantity, remaining);

        // Update Stock Item
        const { error: updateError } = await supabase
            .from('stock_items')
            .update({ quantity: lot.quantity - deduct })
            .eq('id', lot.id);

        if (updateError) throw updateError;

        // Create Movement
        await addMovement({
            productId,
            filialId,
            lote: lot.lote,
            type: 'exit',
            quantity: deduct,
            date: new Date().toISOString(), // Ensure date is set
            userId,
            userName,
            notes: `Venda #${saleId.slice(0, 8)} (Auto: ${lot.lote || 'Geral'})`,
            nfeNumber: lot.nfe_number // Track origin NFe if possible
        });

        remaining -= deduct;
    }

    // 3. Handle Insufficient Stock (Remaining > 0)
    // If we ran out of lots but still need to deduct, we assume a "General" deduction or allow negative
    // For now, we record a movement to track the inconsistency, but we don't have a "negative stock_item" to update easily without PK issues.
    if (remaining > 0) {
        console.warn(`Stock inconsistency for Product ${productId}. Sold ${quantity}, found ${quantity - remaining}.`);
        await addMovement({
            productId,
            filialId,
            lote: 'ESTOQUE_NEGATIVO',
            type: 'exit',
            quantity: remaining,
            date: new Date().toISOString(),
            userId,
            userName,
            notes: `Venda #${saleId.slice(0, 8)} (Saldo Descoberto)`
        });
    }
};

export const fetchTransferSuggestions = async (): Promise<TransferSuggestion[]> => {
    const { data, error } = await supabase
        .from('v_filial_stock_status')
        .select('*')
        .or('status.eq.LOW,status.eq.HIGH');

    if (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }
    return data as TransferSuggestion[];
};

// Conference API
export const fetchPendingConferences = async (filialId: string) => {
    // 1. Fetch transfers to this filial in the last 7 days (or simply all pending audits)
    // Assuming we want to audit "completed" transfers that haven't been audited yet.
    // Ideally we'd join with conference_sessions to see if already started.
    // For MVP, letting user pick from list of transfers.
    const { data: transfers, error } = await supabase
        .from('transfers')
        .select(`
            *,
            products (name, ean)
        `)
        .eq('to_filial_id', filialId)
        .eq('status', 'completed') // Only completed transfers arrive physically
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) throw error;
    return transfers;
};

export const createConferenceSession = async (sourceId: string, sourceType: 'transfer' | 'nfe', filialId: string, userId: string, userName: string) => {
    const { data, error } = await supabase
        .from('conference_sessions')
        .insert([{
            source_id: sourceId,
            source_type: sourceType,
            filial_id: filialId,
            user_id: userId,
            user_name: userName,
            status: 'in_progress'
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const fetchConferenceItems = async (conferenceId: string) => {
    const { data, error } = await supabase
        .from('conference_items')
        .select(`
            *,
            products (name, ean)
        `)
        .eq('conference_id', conferenceId);

    if (error) throw error;
    return data;
};

export const saveConferenceItem = async (conferenceId: string, productId: string, expected: number, scanned: number) => {
    const { data, error } = await supabase
        .from('conference_items')
        .insert([{
            conference_id: conferenceId,
            product_id: productId,
            expected_quantity: expected,
            scanned_quantity: scanned
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const completeConference = async (conferenceId: string, status: 'completed' | 'divergent', notes?: string) => {
    const { data, error } = await supabase
        .from('conference_sessions')
        .update({ status, finished_at: new Date().toISOString(), notes })
        .eq('id', conferenceId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// --- Employees Management ---
export const fetchEmployees = async () => {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('active', true)
        .order('name');

    if (error) throw error;
    return data || [];
};

export const addEmployee = async (employee: { name: string, role: string, pin: string, filial_id: string }) => {
    const { data, error } = await supabase
        .from('employees')
        .insert([{
            name: employee.name,
            role: employee.role,
            pin: employee.pin,
            filial_id: employee.filial_id,
            active: true
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateEmployee = async (id: string, updates: any) => {
    const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteEmployee = async (id: string) => {
    // Soft delete
    const { error } = await supabase
        .from('employees')
        .update({ active: false })
        .eq('id', id);

    if (error) throw error;
};

// --- Customers ---
export const fetchCustomers = async (search?: string) => {
    let query = supabase
        .from('customers')
        .select('*')
        .order('name');

    if (search) {
        query = query.or(`name.ilike.%${search}%,cpf.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(50);
    if (error) throw error;

    // Transform snake_case to camelCase
    return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        cpf: c.cpf,
        phone: c.phone,
        email: c.email,
        address: c.address,
        number: c.number,
        district: c.district,
        city: c.city,
        state: c.state,
        zipCode: c.zip_code,
        notes: c.notes,
        createdAt: c.created_at
    }));
};

export const createCustomer = async (customer: any) => {
    // Map to snake_case
    const dbCustomer = {
        name: customer.name,
        cpf: customer.cpf,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        number: customer.number,
        district: customer.district,
        city: customer.city,
        state: customer.state,
        zip_code: customer.zipCode,
        notes: customer.notes
    };

    const { data, error } = await supabase
        .from('customers')
        .insert([dbCustomer])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateCustomer = async (id: string, updates: any) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.cpf) dbUpdates.cpf = updates.cpf;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.number) dbUpdates.number = updates.number;
    if (updates.district) dbUpdates.district = updates.district;
    if (updates.city) dbUpdates.city = updates.city;
    if (updates.state) dbUpdates.state = updates.state;
    if (updates.zipCode) dbUpdates.zip_code = updates.zipCode;
    if (updates.notes) dbUpdates.notes = updates.notes;

    const { data, error } = await supabase
        .from('customers')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};
