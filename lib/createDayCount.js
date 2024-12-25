function createDayCount(customersGained, date) {
    return {
        date: new Date(date),
        customersGained: customersGained,
        customersLost: 0,
        paidOut: 0,
        invoices: 0,
        salesOrders: 0,
        salesOrdersShipped: 0,
        salesRevenue: 0,
        ordersPlaced: 0,
        ordersArrived: 0,
        refunds: 0,
        packagingOrders: 0,
        delayedOrders: 0,
        packageShortage:0,
        warehouseSpaceUsed: 0,
        packagingSpaceUsed: 0,
        newProducts: 0,
        salesCancelled: 0,
        amountRefunded: 0,
        categorySales: {}
    }
}