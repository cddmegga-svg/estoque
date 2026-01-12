# Enhancement Plan - Minimum Stock & Alerts

## Goal Description
Implement a Minimum Stock control system to alert the user when products need replenishment.

## Proposed Changes

### Database
#### [NEW] [ADD_MIN_STOCK.sql](file:///d:/Estoque/ADD_MIN_STOCK.sql)
-   `ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 0;`

### Type Definitions
#### [MODIFY] [types.ts](file:///d:/Estoque/src/types.ts)
-   Add `minStock?: number` to `Product` interface.

### Backend Services
#### [MODIFY] [api.ts](file:///d:/Estoque/src/services/api.ts)
-   Update `fetchProducts` to map `min_stock` -> `minStock`.
-   Update `addProduct` and `updateProduct` to handle `minStock`.

### UI Implementation
#### [MODIFY] [ProductsPage.tsx](file:///d:/Estoque/src/pages/ProductsPage.tsx)
-   Add "Estoque Mínimo" input to the Product Dialog (probably next to Price or Quantity).
-   **Visual Alert**: If `totalStock < minStock`, display a warning icon or color the row (e.g., yellow/orange border or background). But wait, `ProductsPage` currently doesn't fetch *stock quantity* per product, only product definitions. The stock is in `StockPage` or `fetchStock`.
-   **Strategic Change**:
    -   Ideally, `fetchProducts` should join with stock sum to know current total. OR
    -   We implement the alert on the **Stock Page** (Inventory).
    -   *Decision*: Users usually manage "catalog" in Products and "counts" in Stock. But a "Purchase List" makes sense in Products or a new "Relatórios" tab.
    -   *Simpler Approach*: We already load `stock` in `ProductsPage`? No, we don't.
    -   *Plan*: I will fetch `stock` summary in `ProductsPage` (or compute it) to show the alert.

#### [MODIFY] [StockPage.tsx](file:///d:/Estoque/src/pages/StockPage.tsx)
-   Highlight rows where `quantity` is low? (StockPage lists *batches*, so it's harder to see *total* product stock vs minimum).
-   *Better*: Focus on **ProductsPage** acting as the "Command Center". I will add a `currentStock` field to the mapped product by fetching stock sums, or just fetch all stock and sum up on client side (since we already bumped limit to 5000, consistent with that).

## Verification Plan
1.  Run SQL migration.
2.  Set `minStock` for a product to 10.
3.  Ensure actual stock is 5.
4.  Verify visual alert on the Product list.
