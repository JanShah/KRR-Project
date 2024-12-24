function createProduct(suppliers, categories, inventoryList) {
    const category = weightedRandom(categories);
    const supplierRange = suppliers.filter(s => {
        return s.category === category.name;
    });
    const supplier = supplierRange[randInt(0, supplierRange.length)];
    const cIndex = categories.indexOf(category);
    const pIndex = category.name[0] + inventoryList.filter(p => { return p.category === category.name }).length;
    const pStockCode = stockCode(supplier.supplier_id, cIndex, pIndex);
    const cost = Number(rand(...category.priceRange).toFixed(2));
    const margin = Number(rand(...category.marginRange).toFixed(2));
    const salePrice = Number(Math.round(cost + (cost * margin)).toFixed(2)) - 0.01;
    const volume = Math.round(rand(...category.volumeRange) * 2000);
    const packSize = category.packSizes[randInt(0, category.packSizes.length)]
    return {
        code: pIndex,
        supplier: supplier,
        SKU: pStockCode,
        quantity: 0,
        sales: 0,
        volume: volume,
        cost_price: cost,
        sale_price: salePrice,
        margin: margin,
        category: category.name,
        packSize: packSize, 
        weight: rand(0.03, category.weight)
    }
}
