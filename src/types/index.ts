export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
  filialId: string;
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
}

export interface NFe {
  number: string;
  date: string;
  supplier: string;
  cnpj: string;
  items: NFeItem[];
}
