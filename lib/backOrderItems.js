function backOrderItems(shortage, purchaseOrders, funds, date) {
    if (Object.keys(shortage).length) {
        if (DEBUG) console.warn(`Stock shortage.`, date)
        Object.keys(shortage).forEach(supplierID => {

            let orderTotal = 0;
            const supplier = shortage[supplierID].supplier;
            const orders = shortage[supplierID];
            const supplierProducts = []
            Object.keys(orders).forEach(sku => {
                if (sku === "supplier") return
                orders[sku].lineTotal = orders[sku].product.cost_price * orders[sku].units
                orderTotal += orders[sku].lineTotal;
                supplierProducts.push(orders[sku])

            });

            const order = {
                orderNumber: generateOrderNumber(supplierID, date, purchaseOrders.length),
                supplier: supplier,
                products: supplierProducts,
                date: new Date(date),
                orderValue: Number(orderTotal.toFixed(2)),
                status: 'pending',
                cashUsed: 0
            }
            if (supplier.credit_limit - (supplier.amount_owed + orderTotal) < 0) {
                if(funds = orderTotal<0 ) return //cannot place back order 
                order.cashUsed = orderTotal
                funds -= orderTotal
            } else {
                supplier.amount_owed += orderTotal;
            }

            purchaseOrders.push(order);

        })
    }
    return funds;
}