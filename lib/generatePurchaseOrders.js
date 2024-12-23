function generatePurchaseOrders(supplierList, inventoryList, categories, date, funds, index) {
    const capacityLeft = 100 - getUsedVolume(inventoryList).warehouse
    if(capacityLeft < 5) {
        if(DEBUG) console.log(`Warehouse has ${capacityLeft.toFixed(2)}% remaining, no more purchase orders should be generated.`);
        return [];
    }
    if(DEBUG) console.log(`Warehouse has ${capacityLeft.toFixed(2)}% remaining`);
    const PO = supplierList.map(supplierID => {
        const products = inventoryList.filter(item => {
            if (!item.supplier) return false;
            return item.supplier.supplier_id === supplierID;
        })
        const supplier = products[0].supplier;
        const category = categories.find(c => c.name === supplier.category)
        const po = createPurchaseOrder(products, category, date, funds, index++);
        if (po && po.fundsRemaining) {
            funds = po.fundsRemaining;
        }
        return po;
    }).filter(o => o !== null)
    

    return PO
}