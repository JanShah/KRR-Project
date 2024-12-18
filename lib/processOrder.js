function processOrder(order, inventoryList, boxes, stockShortage, boxDemand, currentDay, salesOrders) {
    const package = packageCalculation(order.items, boxes);
    const packageAvailable = inventoryList.find(e => e.code === package.code && e.quantity > 0);
    if (!packageAvailable) {
        boxDemand.push(package)
        // console.log('cannot ship, packaging not in stock')
        return true;
    }
    let shortage = false;
    for (item of order.items) {
        if (item.product.quantity === 0 && item.units <= 2 && randInt(1, 200) <randInt(1,4)) {
            //1 in 100 chance of low stock item going out of stock and being backordered
            item.product.quantity -= item.units;
            const product = item.product;
            const supplier = product.supplier;
            const SKU = product.SKU;
            if (!stockShortage[supplier.supplier_id]) {
                stockShortage[supplier.supplier_id] = {
                    supplier,
                    [SKU]: { units: item.units, product: product }
                }

            } else if (!stockShortage[supplier.supplier_id][SKU]) {
                stockShortage[supplier.supplier_id][SKU] = { units: item.units, product: product }
            }
            else stockShortage[supplier.supplier_id][SKU].units += item.units
            shortage = true;



        }
        if (shortage) return true;

    }
    order.packageUsed = package;
    package.quantity -= weightedRandom([{ weight: 0.85, v: 1 }, { weight: 0.45, v: 2 }, { weight: 0.05, v: 3 }]).v; //simulate potential for package damage
    order.status = "delivered";

    order.shippedDate = new Date(currentDay);
    order.deliveredDate = new Date(new Date(currentDay).setDate(currentDay.getDay() + 2));


    //1 point off for each delayed day
    order.satisfactionRating = 5 - Math.floor(new Date(order.shippedDate - order.paidDate) / 1000 / 60 / 60 / 24)
    // console.log("Shipped order!")
    salesOrders['delivered'].push(order)
    return false;
}