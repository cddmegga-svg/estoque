export const calculateSmartPrice = (costPrice: number, marginPercent: number): number => {
    if (!costPrice || costPrice <= 0) return 0;

    // 1. Calculate base price with margin
    const basePrice = costPrice * (1 + (marginPercent / 100));

    // 2. Apply "Smart Rounding" (Always end in .90)
    // Rules:
    // - Always round UP to the next .90 to protect margin.
    // - Unless the price is already exactly X.90.

    // Algorithm: Math.ceil(price - 0.90) + 0.90
    // Examples:
    // 10.00 -> 9.10 -> ceil(10) -> 10.90 (+0.90 gain)
    // 10.89 -> 9.99 -> ceil(10) -> 10.90 (+0.01 gain)
    // 10.90 -> 10.00 -> ceil(10) -> 10.90 (0 change)
    // 10.91 -> 10.01 -> ceil(11) -> 11.90 (+0.99 gain)

    const smartPrice = Math.ceil(basePrice - 0.90) + 0.90;

    return parseFloat(smartPrice.toFixed(2));
};

export const calculateMargin = (costPrice: number, salePrice: number): number => {
    if (!costPrice || costPrice === 0) return 100; // Infinite margin
    const margin = ((salePrice - costPrice) / costPrice) * 100;
    return parseFloat(margin.toFixed(2));
};
