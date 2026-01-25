import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { fetchProducts, createSale } from '@/services/api'; // Ensure createSale is imported
import { useToast } from '@/hooks/use-toast';

export const useProductSync = () => {
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);

    const pushOfflineSales = async () => {
        const offlineSales = await db.offlineSales.where('synced').equals(0).toArray();
        if (offlineSales.length === 0) return;

        console.log(`Found ${offlineSales.length} offline sales to sync...`);
        let syncedCount = 0;

        for (const sale of offlineSales) {
            try {
                // Determine user info fallback if missing
                const userId = 'offline-user'; // TODO: Store user info in offline sale

                await createSale(
                    sale.totalValue,
                    sale.discountValue,
                    sale.finalValue,
                    sale.items,
                    sale.customerName,
                    undefined, // userId
                    'Vendedor Offline', // userName
                    undefined // filialId - api might fail if strict
                );

                // Mark as synced OR delete
                await db.offlineSales.delete(sale.id!);
                syncedCount++;
            } catch (error) {
                console.error('Failed to sync sale:', sale.id, error);
            }
        }

        if (syncedCount > 0) {
            toast({
                title: 'Sincronização Concluída',
                description: `${syncedCount} vendas offline foram enviadas com sucesso.`
            });
        }
    };

    useEffect(() => {
        const syncData = async () => {
            if (!navigator.onLine) return;

            try {
                setIsSyncing(true);

                // 1. PUSH: Send Pending Sales first
                await pushOfflineSales();

                // 2. PULL: Update Product Cache
                const products = await fetchProducts();
                await db.transaction('rw', db.products, async () => {
                    await db.products.clear();
                    await db.products.bulkAdd(products);
                });

                console.log(`Synced ${products.length} products to offline cache.`);
            } catch (error) {
                console.error('Failed to sync data:', error);
            } finally {
                setIsSyncing(false);
            }
        };

        // Initial sync
        syncData();

        // Listen for online event
        window.addEventListener('online', syncData);

        // Interval sync
        const interval = setInterval(syncData, 5 * 60 * 1000); // 5 mins

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', syncData);
        };
    }, []);

    return { isSyncing };
};
