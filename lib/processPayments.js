function processPayments(orders, date, funds, dayCount, invoices) {
    const delivered = orders['delivered'].filter(po => {
        if (date < po.paymentDate) return true

        if (funds - po.orderValue < 0) {
            if (DEBUG) console.warn("Cannot pay supplier, credit limit reduced");
            po.supplier.credit_limit = Math.max(0, po.supplier.credit_limit - 100); //supplier drops credit limit when unpaid.. but not below 0
            return true;
        }
        po.status = 'paid';
        po.paidDate = new Date(date)
        funds -= po.orderValue;
        dayCount.paidOut += po.orderValue
        po.supplier.amount_owed = Number((po.supplier.amount_owed - po.orderValue).toFixed(2));
        if (po.cashUsed) po.supplier.amount_owed += Number(po.cashUsed);
        const invoice = {
            orderDate: new Date(po.date),
            invoiceNumber: po.orderNumber,
            supplier: po.supplier,
            amount: po.orderValue,
            products: po.products.map(i => ({
                code: i.product.code,
                units: i.units
            })),
            paidDate: po.paidDate,
            purpose: "PURCHASES"
        }
        invoices.push(invoice);
        dayCount.invoices++
        if (DEBUG) console.log("Supplier paid")
        orders.push(po, "paid")
        return false
    })
    return [delivered, funds]

}