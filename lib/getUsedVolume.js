function getUsedVolume(products) {
    const warehouseCapmm = 50000000
    let packageVolume = 0;
    const volume = Number((products.map((i => {
        if (i.SKU) {  //only count items with a custom SKU, not produced by box purchase orders.
            return i.quantity * i.volume
        }
        packageVolume += (i.quantity ? Math.ceil(i.quantity / i.pack) * i.packVolume : 0);
        return 0
    })).reduce((a, c) => a + c, 0) / warehouseCapmm).toFixed(2));
    console.log("Packaging Space: ", (packageVolume / warehouseCapmm).toFixed(2))
    return volume;
}