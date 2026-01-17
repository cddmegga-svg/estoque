
import { supabase } from '@/lib/supabase';
import { Product, StockItem, Filial, Transfer, Movement, User, Supplier, AccountPayable } from '@/types';

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
        minStock: item.min_stock || 0
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
        filialId: user.filial_id
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
            filial_id: user.filialId
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
export const createSale = async (subtotal: number, discount: number, total: number, items: any[], customerName?: string, userId?: string, userName?: string, filialId?: string) => {
    // 1. Create Sale Header
    const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
            customer_name: customerName,
            total_value: subtotal,
            discount_value: discount,
            final_value: total,
            status: 'completed',
            user_id: userId,
            user_name: userName,
            filial_id: filialId
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
        total_price: item.quantity * item.product.salePrice
    }));

    const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

    if (itemsError) throw itemsError;

    // 3. Deduct Stock via Movements
    for (const item of items) {
        await addMovement({
            productId: item.product.id,
            filialId: filialId!,
            lote: 'PRE-VENDA',
            type: 'exit',
            quantity: item.quantity,
            userId: userId!,
            userName: userName!,
            notes: `Venda #${sale.id.slice(0, 8)}`
        });
    }

    return sale;
};
