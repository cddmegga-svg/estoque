
import { supabase } from '@/lib/supabase';
import { Product, StockItem, Filial, Transfer, Movement, User } from '@/types';

// Products
export const fetchProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

    if (error) throw error;

    // Transform snake_case to camelCase
    return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        activeIngredient: item.active_ingredient,
        manufacturer: item.manufacturer,
        ean: item.ean,
        ncm: item.ncm
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
        .select('*');

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
export const addProduct = async (product: any) => {
    const { data, error } = await supabase
        .from('products')
        .insert([{
            id: product.id,
            name: product.name,
            active_ingredient: product.activeIngredient,
            manufacturer: product.manufacturer,
            ean: product.ean,
            ncm: product.ncm
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
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
