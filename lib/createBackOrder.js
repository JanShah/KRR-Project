function createBackOrder(order, itemsNotInStock, stockShortage) {
    const suppliers = itemsNotInStock.reduce((acc, cur) => {
        if (acc.indexOf(cur.product.supplier) > -1)
            return acc;
        acc.push(cur.product.supplier);
        return acc;
    }, []);
    // console.log('cannot ship, item(s) not in stock')

    suppliers.forEach(supplier => {
        const sProducts = itemsNotInStock.filter(item => item.product.supplier === supplier);
        sProducts.forEach(item => {
            const units = item.units; //maintain the stock level? or are we running it down?
            const existingProductOrder = stockShortage[supplier.supplier_id] && stockShortage[supplier.supplier_id][item.product.SKU];
            if (existingProductOrder) {
                //units really depends on the total number, not the pack size... This will be done at order generation instead
                stockShortage[supplier.supplier_id][item.product.SKU]['units'] += units
            }
            else {
                if (!stockShortage[supplier.supplier_id]) stockShortage[supplier.supplier_id] = {supplier}
                stockShortage[supplier.supplier_id][item.product.SKU] = {
                    product: item.product,
                    supplier: supplier,
                    units: units
                }

            }
        })

    });
    order.isOnBackOrder = true;
}