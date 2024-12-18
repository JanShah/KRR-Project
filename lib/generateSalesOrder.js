/**
 * 
 * @param {*} customers 
 * @param {*} products 
 * @param {*} date 
 * @returns 
 */
function generateSalesOrder(customers, products, date, index) {
    const daysGone = new Date(date).setDate(new Date(date).getDate() - 30);

    const customer = weightedRandom(customers.filter(c =>
        !c.lastOrderDate ||
        c.lastOrderDate < daysGone
    ));
    if (!customer) return
    const order = { 
        id: generateOrderNumber(customer.ID, date, index),
        items: [], 
        total: 0, 
        volume: 0, 
        customer: customer };
    let amountToSpend = Number(rand(25, Math.max(25, customer.spendingPower)).toFixed(2));
    if (products.length > 0) {
        products = products.sort((a, b) => 0.5 - Math.random());
        for (const product of products) {
            if (amountToSpend < 0 || product.quantity <= 0) break // no stock left for this product. trying to lower orders.
            const weights = Array.from({ length: product.quantity }, (_, i) => ({
                q: i + 1,
                weight: 1 / ((!i ? i + 0.5 : i) + 1),
            }));
            
            const units = weightedRandom(weights).q;
            const totalCost = units * product.sale_price;
            const orderItem = { product: product, units: units, cost: totalCost };

            // Calculate probability of buying based on price and budget
            const ratio = (totalCost / amountToSpend);

            let buyProbability = Math.max(0, Math.min(0.05, 1 - ratio)); // Base probability based on price

            // Stock shortage penalty
            const shortage = units - product.quantity; // Number of units exceeding stock
            if (shortage > 0) {
                const shortageFactor = shortage / (product.quantity + 1); // Normalise shortage
                const penalty = Math.max(0.2, 1 - shortageFactor); // Ensure minimum 10% chance
                buyProbability *= penalty; // Apply penalty to the probability
            }

            if (Math.random() < buyProbability) {

                order.items.push(orderItem);
                order.total = Number((order.total + totalCost).toFixed(2));
                order.volume += (product.volume * units)
                amountToSpend -= (totalCost * rand(0.8, 1.2)); // Adjust budget by random factor
                product.quantity -= units //over ordering is happening because of this not being here. 
                // I will create a damaged goods process instead, so there is a random probability of orders
                // not being in stock because of damage and go on backorder. 
            }
        }

    }
    if (order.items.length) {
        customer.lastOrderDate = new Date(date);
        order.status = "pending"
        return order;
    }
    return null;
}
