function getUsedVolume(products) {
    const warehouseCapmm = 450000000000 / 100
    let packageVolume = 0;
    const volume = Number((products.filter(p => p.quantity > 0).map((i => {
        if (i.SKU) {  //only count items with a custom SKU, not produced by box purchase orders.
            return i.quantity * (i.volume * 10)
        }
        packageVolume += (i.quantity ? Math.ceil(i.quantity / i.pack) * (i.volume * i.pack) : 0);
        return 0
    })).reduce((a, c) => a + c, 0)).toFixed(2));
    if (DEBUG) console.log("Packaging Space Used: ", (packageVolume / warehouseCapmm).toFixed(2) + "%")
    return {
        warehouse: (volume / warehouseCapmm).toFixed(2),
        packaging: ((packageVolume * 10) / warehouseCapmm).toFixed(2)
    };
}