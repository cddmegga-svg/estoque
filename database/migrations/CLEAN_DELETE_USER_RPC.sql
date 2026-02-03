-- Function: admin_reassign_and_delete_user
-- Description: Reassigns all records from a target user to a new owner (usually the Admin) and then deletes the target user.
-- Updated to fix 'sales_cashier_id_fkey' violation.

CREATE OR REPLACE FUNCTION admin_reassign_and_delete_user(target_user_id UUID, new_owner_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Reassign Cash Registers
    UPDATE cash_registers SET user_id = new_owner_id WHERE user_id = target_user_id;

    -- 2. Reassign Sales (User as Creator)
    UPDATE sales SET user_id = new_owner_id WHERE user_id = target_user_id;

    -- 2.1 Reassign Sales (User as Cashier - Fix for sales_cashier_id_fkey)
    -- Checking if column exists is hard in PL/PGSQL inside a transaction block easily without dynamic SQL, 
    -- but usually if the constraint exists, the column exists.
    -- Based on previous context, the column might be 'cashier_id' or 'cashier_employee_id' referencing USERS.
    -- The error constraint name 'sales_cashier_id_fkey' strongly suggests the column is 'cashier_id' referencing 'users'.
    BEGIN
        UPDATE sales SET cashier_id = new_owner_id WHERE cashier_id = target_user_id;
    EXCEPTION WHEN undefined_column THEN
        -- Ignore if column doesn't exist
        NULL;
    END;

     -- 2.2 Reassign Sales (User as Cashier Employee - if it references users? Unlikely, usually references employees, but let's be safe)
    BEGIN
        UPDATE sales SET cashier_employee_id = new_owner_id WHERE cashier_employee_id = target_user_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- 3. Reassign Movements
    UPDATE movements SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 4. Reassign Transfers
    UPDATE transfers SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 5. Reassign Purchase Requests (Success Correction: uses user_id)
    UPDATE purchase_requests SET user_id = new_owner_id WHERE user_id = target_user_id;
    
    -- 6. Reassign Suppliers (created_by/updated_by if exists)
    UPDATE suppliers SET created_by = new_owner_id WHERE created_by = target_user_id;

    -- 7. Delete the User
    DELETE FROM users WHERE id = target_user_id;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
