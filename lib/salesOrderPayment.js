function salesOrderPayment(orders, date,funds, dayCount) {
    const processed = orders["pending"].filter(order => {
        order.paymentType = ["credit card", "paypal", "cash"][randInt(0, 3)];
        order.status = "paid";
        order.paidDate = new Date(date);
        funds += order.total;
        orders["paid"].push(order);
        dayCount.salesRevenue += order.total
        return false;
    });
    return [processed, Number(funds.toFixed(2))];
}