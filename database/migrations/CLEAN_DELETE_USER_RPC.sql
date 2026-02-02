-- Function: admin_reassign_and_delete_user
-- Description: Reassigns all records from a target user to a new owner (usually the Admin) and then deletes the target user.
-- Use this to clean up old logins without losing financial data.

CREATE OR REPLACE FUNCTION admin_reassign_and_delete_user(target_user_id UUID, new_owner_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Reassign Cash Registers
    UPDATE cash_registers SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 2. Reassign Sales
    UPDATE sales SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 3. Reassign Movements
    UPDATE movements SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 4. Reassign Transfers
    UPDATE transfers SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 5. Reassign Purchase Requests
    UPDATE purchase_requests SET created_by = new_owner_id WHERE created_by = target_user_id; -- Assuming created_by column
    
    -- 6. Reassign Suppliers (created_by/updated_by if exists)
    UPDATE suppliers SET created_by = new_owner_id WHERE created_by = target_user_id;

    -- 7. Delete the User
    DELETE FROM users WHERE id = target_user_id;
    
    -- Note: Supabase Auth User deletion is separate and must be done via Admin API or manually if using pure Supabase Auth.
    -- Since we are managing a custom 'users' table that might mirror Auth, this handles our table.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
