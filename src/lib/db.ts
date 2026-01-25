import Dexie, { Table } from 'dexie';
import { Product } from '@/types';

// Define the Offline Sale structure
export interface OfflineSale {
    id?: number; // Auto-increment for local
    tempId: string; // UUID generated locally
    customerName?: string;
    totalValue: number;
    discountValue: number;
    finalValue: number;
    items: any[]; // Store simply as JSON
    createdAt: string;
    synced: number; // 0 = false, 1 = true
}

export class PharmaFlowDatabase extends Dexie {
    products!: Table<Product>;
    offlineSales!: Table<OfflineSale>;

    constructor() {
        super('PharmaFlowDB');
        this.version(1).stores({
            products: 'id, name, ean, manufacturer, category', // Indexes for search
            offlineSales: '++id, tempId, synced, createdAt' // Indexes for sync
        });
    }
}

export const db = new PharmaFlowDatabase();
