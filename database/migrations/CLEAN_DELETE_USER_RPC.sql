-- Function: admin_reassign_and_delete_user
-- Description: Reassigns all records from a target user to a new owner (usually the Admin) and then deletes the target user.
-- Updated to fix column name mismatch (purchase_requests uses user_id, not created_by).

CREATE OR REPLACE FUNCTION admin_reassign_and_delete_user(target_user_id UUID, new_owner_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Reassign Cash Registers
    UPDATE cash_registers SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 2. Reassign Sales
    UPDATE sales SET user_id = new_owner_id WHERE user_id = target_user_id;
    -- Note: Sales also has 'employee_id' which links to 'employees'. 
    -- If the user being deleted is also an employee, we might need to handle that, 
    -- but usually 'users' table deletion only blocks foreign keys to 'users'.
    
    -- 3. Reassign Movements
    UPDATE movements SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 4. Reassign Transfers
    UPDATE transfers SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 5. Reassign Purchase Requests (Success Correction: uses user_id)
    UPDATE purchase_requests SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 6. Reassign Suppliers (created_by/updated_by if exists)
    -- We use a safe check ensuring the column exists or we just rely on the API definition which says it does.
    UPDATE suppliers SET created_by = new_owner_id WHERE created_by = target_user_id;

    -- 7. Delete the User
    DELETE FROM users WHERE id = target_user_id;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
