function createPurchaseOrder(products, category, date, funds, index) {
    let orderTotal = 0;
    const productOrder = [];
    const originalFund = funds;
    let cashUsed = 0;
    let supplier = products[0].supplier; //supplier is the same for each batch
    let credit = supplier.credit_limit - (supplier.amount_owed ?? 0);
    if(supplier.amount_owed < 0) supplier.amount_owed = 0;
    products.forEach(p => {
        const qty = Math.max(1,randInt(1, 15));
        const lineTotal = Math.round(p.packSize * p.cost_price * 100 * qty) / 100;
        const willBuy = Math.random() < category.weight
        const canBuy = (orderTotal + lineTotal) < (credit + funds);
        if (!canBuy) {
            if(DEBUG) console.log("Cannot buy from supplier", supplier);
            return null;
        }
        if (willBuy) {
            if ((credit - lineTotal) < 0) {
                if(DEBUG) console.log("Credit limit will be exceeded for supplier", supplier, p, qty, lineTotal)
            }
            if (credit + funds - lineTotal < 0) {
                if(DEBUG) console.log("Total funds will be exceeded for supplier", supplier)
                return null;
            }
            orderTotal += lineTotal;
            productOrder.push({ product: p, supplier, lineTotal, units: p.packSize * qty })
            if (credit - lineTotal < 0) {

                cashUsed += lineTotal - credit;
                credit = 0
                funds -= cashUsed;
                supplier.amount_owed = supplier.credit_limit
            } else {
                credit -= lineTotal;
                supplier.amount_owed = Number((supplier.amount_owed + lineTotal).toFixed(2))
            }
            if(supplier.amount_owed < 0) debugger
        }
    })
    if (productOrder.length > 0) {
        const orderNumber = generateOrderNumber(supplier.supplier_id, date, index);
        const order = {
            orderNumber,
            supplier: supplier,
            products: productOrder,
            date: new Date(date),
            orderValue: Number(orderTotal.toFixed(2)),
            status: 'pending',
            cashUsed: Number((cashUsed).toFixed(2))
        };
        if (originalFund !== funds) {
            order.fundsRemaining = funds;
        }

        return order
    }

    return null

}
