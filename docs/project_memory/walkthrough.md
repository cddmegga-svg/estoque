# Walkthrough - Estoque System

## Completed Features (Phase 15 - Minimum Stock)

### Control of Minimum Stock
We implemented a system to track and alert when product stock falls below a defined threshold.

### 1. Database & Setup
-   **New Field**: `min_stock` added to `products` table.
-   **Migration**: Created `ADD_MIN_STOCK.sql`. Run this if your products don't show the field.

### 2. Product Management
-   **Edit Product**: New field "Estoque Mínimo" in the product dialog.
    -   Set this to your desired safety stock level (e.g., 10 boxes).
    -   Default is 0 (disabled).

### 3. Visual Alerts (The "Command Center")
-   **Automatic Check**: The Products screen now automatically calculates the total stock for each product by summing up all batches/lots.
-   **Low Stock Warning**:
    -   If `Current Stock < Minimum Stock`, the product row turns **amber/yellow**.
    -   A badge appears next to the name: **"Repor (Current/Min)"**.
    -   Example: "Dipirona ... ⚠️ Repor (5/10)"

### 4. Smart Filtering
-   **New Filter**: In the "Filtrar Categoria" dropdown, there is now a special option: **"⚠️ Baixo Estoque (Comprar)"**.
-   **Purchase List**: Select this filter to see ONLY the products that need replenishment. You can print this screen (browser print) to give to your buyer.

## Verification
1.  **Set Minimum**: Edit a product, set Min Stock to 10.
2.  **Check Alert**: If you have 0 stock, it should highlight immediately.
3.  **Add Stock**: Add 15 items via Import or Manual Entry.
4.  **Verify**: The alert should disappear.
5.  **Filter**: Use the "Baixo Estoque" filter to verify it captures the item when stock is low.
