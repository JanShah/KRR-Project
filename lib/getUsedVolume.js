function getUsedVolume(products) {
    const warehouseCapmm = 5000000
    let packageVolume = 0;
    const volume = Number((products.filter(p => p.quantity > 0).map((i => {
        if (i.SKU) {  //only count items with a custom SKU, not produced by box purchase orders.
            return i.quantity * (i.volume / 2)
        }

        packageVolume += (i.quantity ? Math.ceil(i.quantity / i.pack) * i.packVolume : 0);
        return 0
    })).reduce((a, c) => a + c, 0)).toFixed(2));
    if (DEBUG) console.log("Packaging Space Used: ", (packageVolume / warehouseCapmm).toFixed(2) + "%")
    return {
        warehouse: (volume / warehouseCapmm).toFixed(2),
        packaging: (packageVolume / warehouseCapmm).toFixed(2)
    };
}