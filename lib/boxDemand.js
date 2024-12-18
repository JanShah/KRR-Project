function boxDemandSummary(allOrder = [], orderPeriod = "") {
    const summary = basicSummary(allOrder, orderPeriod);
    return Object.keys(summary).map(period => {
        return summary[period].reduce((acc, order) => {
            const package = order.package;
            if (!acc[package.code]) {
                acc[package.code] = {
                    totalOrders: 0,
                    totalVolume: 0,
                    goodsVolume: 0
                }
            }
            acc[package.code].totalOrders += 1;
            acc[package.code].totalVolume += package.boxVolume
            acc[package.code].goodsVolume += package.packVolume;
            return acc;
        }, {})
    })


}