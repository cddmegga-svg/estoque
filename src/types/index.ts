export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'sales' | 'cashier' | 'stock' | 'viewer';
  filialId: string;
  permissions?: string[];
}

export interface Filial {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  type: 'store' | 'warehouse';
}

export interface Product {
  id: string;
  name: string;
  activeIngredient?: string;
  manufacturer?: string;
  ean?: string;
  ncm?: string;
  costPrice?: number;
  salePrice?: number;
  imageUrl?: string;
  category?: string;
  distributor?: string;
  minStock?: number;
  maxStock?: number; // Sugestão de compra
  abcCurve?: 'A' | 'B' | 'C' | 'D'; // Curva ABC
  pmcPrice?: number; // Preço Máximo ao Consumidor

  // Extended Data
  profitMargin?: number;
  taxCfop?: string;
  taxIcms?: number;
  taxPis?: number;
  taxCofins?: number;
  taxIpi?: number;
}

export const PRODUCT_CATEGORIES = [
  'Éticos',
  'Genéricos',
  'Similares',
  'Perfumaria e Higiene',
  'Leites e Nutrição',
  'Dermocosméticos',
  'Correlatos / Acessórios',
  'Outros'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

export interface StockItem {
  id: string;
  productId: string;
  filialId: string;
  lote: string;
  expirationDate: string; // ISO date string
  manufacturingDate?: string; // Data de Fabricação
  quantity: number;
  unitPrice: number;
  entryDate: string; // ISO date string
  nfeNumber?: string;
}

export interface Transfer {
  id: string;
  productId: string;
  fromFilialId: string;
  toFilialId: string;
  lote: string;
  quantity: number;
  transferDate: string;
  userId: string;
  userName: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Movement {
  id: string;
  productId: string;
  filialId: string;
  lote: string;
  type: 'entry' | 'exit' | 'transfer_in' | 'transfer_out';
  quantity: number;
  date: string;
  userId: string;
  userName: string;
  notes?: string;
  nfeNumber?: string;
  transferId?: string;
}

export interface NFeItem {
  name: string;
  ean: string;
  ncm: string;
  quantity: number;
  unitPrice: number;
  manufacturer: string;
  lote?: string;
  expirationDate?: string;
  manufacturingDate?: string;
  cfop?: string;
  taxes?: {
    icms?: number;
    pis?: number;
    cofins?: number;
    ipi?: number;
  };
}

export interface NFeDuplicate {
  number: string;
  dueDate: string;
  value: number;
}

export interface NFe {
  number: string;
  date: string;
  supplier: string;
  cnpj: string;
  recipientCnpj: string;
  items: NFeItem[];
  duplicates?: NFeDuplicate[]; // Faturas/Duplicatas
}

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface AccountPayable {
  id: string;
  description: string;
  supplierId?: string;
  entityName?: string; // Fornecedor manual/cedente
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'pending' | 'paid' | 'overdue';
  barcode?: string;
  invoiceNumber?: string;
  filialId: string;
  notes?: string;
}

export interface PurchaseRequest {
  id: string;
  user_id: string;
  user_name?: string;
  client_name: string;
  client_contact?: string;
  item_description: string;
  priority: 'normal' | 'urgent';
  status: 'pending' | 'ordered' | 'arrived' | 'picked_up' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  customerName?: string;
  customerCpf?: string;
  totalValue: number;
  discountValue: number;
  finalValue: number;
  status: 'open' | 'completed' | 'cancelled';
  paymentMethod?: string;
  userId?: string;
  userName?: string;
  filialId: string;
  createdAt: string;
  items?: SaleItem[];
}

export interface TransferSuggestion {
  filial_id: string;
  filial_name: string;
  product_id: string;
  product_name: string;
  current_qty: number;
  velocity: number;
  min_stock?: number;
  max_stock?: number;
  status: 'LOW' | 'HIGH' | 'OK';
}
