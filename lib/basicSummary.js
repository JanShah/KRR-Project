
function basicSummary(orders, period) {
    // TODO : This these summaries were failing to account for years.  
    let summary;

    let getWeekNumber;
    const firstYear = orders[0].orderDate.getFullYear();

    switch (period) {
        case 'daily':
            summary = orders.reduce((acc, curr) => {
                const date = curr.orderDate.toISOString().split('T')[0];
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(curr);
                return acc;
            }, {});
            break;
        case 'weekly':
            if (typeof globalThis !== "undefined") {
                getWeekNumber = globalThis._sharedLogic.getWeekNumber;
            }
            summary = orders.reduce((acc, curr) => {
                const date = new Date(curr.orderDate).toISOString().split('T')[0];

                const weekNumber = getWeekNumber(date, firstYear);
                if (!acc[weekNumber]) {
                    acc[weekNumber] = [];
                }
                acc[weekNumber].push(curr);
                return acc;
            }, {});
            break;
        case 'monthly':
            summary = orders.reduce((acc, curr) => {
                const date = new Date(curr.orderDate);
                const year = date.getFullYear() - firstYear;
                const monthNumber = date.getMonth() + 1 + (year * 12);
                if (!acc[monthNumber]) {
                    acc[monthNumber] = [];
                }
                acc[monthNumber].push(curr);
                return acc;
            }, {});
            break;
    }
    return summary;
}


if (typeof globalThis !== "undefined") {
    if (globalThis.hasOwnProperty("_sharedLogic")) {
        globalThis._sharedLogic.basicSummary = basicSummary
    } else
        globalThis._sharedLogic = { basicSummary };
}

