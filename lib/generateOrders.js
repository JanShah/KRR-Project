


function generateOrderNumber(id, date, index) {
    const prefix = id.toString().padStart(3, '0');
    const suffix = date.toISOString().split("T")[0].split('-').reverse().join("");
    return prefix + suffix + index;
}

/**
    generateOrders
 * @param {[{ "ID": Number,
    "Firstname": string,
    "Surname": string,
    "Street": string,
    "Town": string,
    "City": string,
    "County": string,
    "Postcode": string
    }]} customers
 * @param {[{
    "code": string,
    "price breaks": {
        "quantities": [
            Number
        ],
        "price per pack": [
            Number
        ]
    },
    "size": [
        Number, Number, Number
    ],
    "pack": Number,
    "type": string
    }]} boxes 

 * @param {[{
    "supplier_id": string,
    "category": string,
    "name": string,
    "street": string,
    "city": string,
    "postcode": string,
    "lead_time": Number,
    "credit_limit": Number,
    "credit_time": Number,
    "amount_owed": Number
}]} suppliers 
 * @returns 
 */
function generateOrders(customers, boxes, suppliers) {

    const packagingSupplier = suppliers.find(s => s.supplier_id.startsWith("B"));

    let inventoryList = [];
    const invoices = [];
    let funds = 20000;
    const startingDate = new Date("04/01/2023");
    const endingDate = new Date("08/01/2024");
    let today = startingDate;
    const startingProductCount = 100;
    const categories = getCategories();
    boxes.forEach(box => {
        box.quantity = 0;
        box.volume = flatVolume(...box.size)
    })
    inventoryList = inventoryList.concat(boxes);
    //start with startingProductCount products on day 1
    for (let i = 0; i < startingProductCount; i++) {
        const product = createProduct(suppliers, categories, inventoryList);
        product.added = new Date(today);
        product.products_id = inventoryList.length + 1;
        inventoryList.push(product);
    }


    //create a purchase order for each supplier;
    const supplierList = inventoryList.reduce((prev, curr) => {
        if (!curr.supplier) return prev;
        if (prev.indexOf(curr.supplier.supplier_id) > -1) {
            return prev
        }
        prev.push(curr.supplier.supplier_id);
        return prev
    }, []);

    class NObject {

        constructor() {
            this.pending = []
            this.paid = []
            this.delivered = []
        }

        push(element, status = "pending") {
            if (this[status]) this[status].push(element)
        }

        concat(elements) {
            if (this['pending']) this['pending'] = this['pending'].concat(elements)
        }

        get length() {
            return Object.keys(this).reduce((acc, cur) => acc + this[cur].length, 0)
        }
    }

    const purchaseOrders = new NObject()
    const salesOrders = new NObject()
    purchaseOrders.pending = generatePurchaseOrders(supplierList, inventoryList, categories, startingDate, funds, 0)

    salesOrders['cancelled'] = [];
    salesOrders['completed'] = [];
    // console.log("Purchase Orders", purchaseOrders)

    const counts = []
    customers = customers.sort(() => Math.random() - 0.5);

    let activatedCustomers = activateCustomers(customers, 100, startingDate)
    let dayIndex = 0;
    if (DEBUG) console.warn("Starting: ", startingDate)
    if (DEBUG) console.warn(" Ending: ", endingDate);

    while (today < endingDate) {

        console.log(`${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
        //days till end date
        const daysTillEnd = daysBetween(endingDate, today);
        const newCustomerCount = Math.min(randInt(5,21), Math.floor(customers.length / daysTillEnd));
        const newCustomers = activateCustomers(customers, newCustomerCount, today, activatedCustomers.length, true);
        const stockShortage = {};
        const boxDemand = [];
        const dayCount = {
            date: new Date(today),
            customersGained: activatedCustomers.length + newCustomerCount,
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
            warehouseSpaceUsed: 0,
            packagingSpaceUsed: 0,
            newProducts: 0,
            salesCancelled: 0,
            amountRefunded: 0
        }
        activatedCustomers = activatedCustomers.concat(newCustomers).filter(c => c.active);
        // check the purchase orders every day for delivery.  Delivery date is based on supplier after order date. 


        //deactivate some of the customers that have not ordered in 20 days or more
        activatedCustomers.forEach(c => {
            const diffDays = daysBetween(today, c.lastOrder);
            if (daysBetween(startingDate, today) < 10) return
            const isActive = Math.random() > 0.7
            if (diffDays < 10 && c.active) c.active = isActive
            if (!isActive)
                dayCount.customersLost++
        });

        purchaseOrders['delivered'] = purchaseOrders['delivered'].filter(po => {
            if (today < po.paymentDate) return true

            if (funds - po.orderValue < 0) {
                if (DEBUG) console.warn("Cannot pay supplier, credit limit reduced");
                po.supplier.credit_limit = Math.max(0, po.supplier.credit_limit - 100); //supplier drops credit limit when unpaid.. but not below 0
                return true;
            }
            po.status = 'paid';
            po.paidDate = new Date(today)
            funds -= po.orderValue;
            dayCount.paidOut += po.orderValue
            po.supplier.amount_owed = Number((po.supplier.amount_owed - po.orderValue).toFixed(2));
            if (po.cashUsed) po.supplier.amount_owed += Number(po.cashUsed);
            const invoice = {
                orderDate: new Date(po.date),
                invoiceNumber: po.orderNumber,
                supplier: po.supplier,
                amount: po.orderValue,
                products: po.products.map(i => ({ code: i.product.code, units: i.units })),
                paidDate: po.paidDate,
                purpose: "PURCHASES"
            }
            invoices.push(invoice);
            dayCount.invoices++
            if (DEBUG) console.log("Supplier paid")
            purchaseOrders.push(po, "paid")
            return false
        })

        purchaseOrders['pending'] = purchaseOrders['pending'].filter(po => {
            const daysSinceOrder = daysBetween(today, po.date);

            if (daysSinceOrder >= po.supplier.lead_time) {
                if (Math.random() <= 0.02) {
                    if (DEBUG) console.log("A delivery did not arrive on time");
                    return true
                }
                po.status = 'delivered';
                if (DEBUG) console.log("Purchase order delivered!")
                po.paymentDate = new Date(new Date(today).setDate(today.getDate() + po.supplier.credit_time));
                po.products.forEach(orderItem => {
                    inventoryList[inventoryList.indexOf(orderItem.product)].quantity += orderItem.units;
                });
                dayCount.ordersArrived++
                purchaseOrders.push(po, "delivered")
                return false
            }
            return true
        })


        // generate some orders for each customer. 
        const inStockItems = inventoryList.filter(p => p.quantity > 0 && p.supplier);
        if (inStockItems.length > 0)
            activatedCustomers.forEach(_ => {
                const order = generateSalesOrder(activatedCustomers, inStockItems, today, salesOrders.length);
                if (order) {
                    salesOrders.push(order);
                    dayCount.salesOrders++
                }
            });

        salesOrders["paid"] = salesOrders["paid"].filter(order => {
            //check that the items are in stock before shipping..
            processed = processOrder(order, inventoryList, boxes, stockShortage, boxDemand, today, salesOrders)
            
            if (order.status==="delivered")
                dayCount.salesOrdersShipped++
            else
                dayCount.delayedOrders++
            return processed
        })


        salesOrders["pending"] = salesOrders["pending"].filter(order => {
            order.paymentType = ["credit card", "paypal", "cash"][randInt(0, 3)];
            order.status = "paid";
            order.paidDate = new Date(today);
            funds += order.total;
            salesOrders["paid"].push(order);
            dayCount.salesRevenue += order.total
            return false;
        })


        if (boxDemand.length) {
            if (DEBUG) console.warn("Packaging shortage", today)
            const order = createBoxOrder(boxDemand, packagingSupplier, today);
            if (order) {
                purchaseOrders.push(order)
                dayCount.packagingOrders += boxDemand.length
            }
        }

        if (Object.keys(stockShortage).length) {
            if (DEBUG) console.warn(`Stock shortage.`, today)
            Object.keys(stockShortage).forEach(supplierID => {

                let orderTotal = 0;
                const supplier = stockShortage[supplierID].supplier;
                const orders = stockShortage[supplierID];
                const supplierProducts = []
                Object.keys(orders).forEach(sku => {
                    if (sku === "supplier") return
                    orders[sku].lineTotal = orders[sku].product.cost_price * orders[sku].units
                    orderTotal += orders[sku].lineTotal;
                    supplierProducts.push(orders[sku])
                    
                });

                const order = {
                    orderNumber: generateOrderNumber(supplierID, today, purchaseOrders.length),
                    supplier: supplier,
                    products: supplierProducts,
                    date: new Date(today),
                    orderValue: Number(orderTotal.toFixed(2)),
                    status: 'pending',
                    cashUsed: 0
                }
                if (supplier.credit_limit - (supplier.amount_owed + orderTotal) < 0) {

                    order.cashUsed = orderTotal
                    funds -= orderTotal
                } else {
                    supplier.amount_owed += orderTotal;
                }

                purchaseOrders.push(order);

            })
        }

        function createBoxOrder(packages, supplier, date) {
            let totalCost = 0;
            const products = [];
            const demand = packages.reduce((acc, cur) => {
                if (!acc[cur.code])
                    acc[cur.code] = 0;
                acc[cur.code]++
                return acc;
            }, {});
            Object.keys(demand).forEach(code => {
                const box = boxes.find(b => b.code === code);
                const quantity = Math.ceil(demand[code] / box.pack);
                const prbQuantity = box['price breaks']['quantities'].find(q => q <= quantity)
                const priceBreakIndex = box['price breaks']['quantities'].indexOf(prbQuantity);
                const lineTotal = box['price breaks']['price per pack'][priceBreakIndex] * quantity
                products.push({
                    units: box.pack * quantity,
                    product: box,
                    lineTotal: lineTotal
                });
                totalCost += lineTotal;

            });
            supplier.amount_owed = Number((supplier.amount_owed + totalCost).toFixed(2));
            return {
                // cashUsed:totalCost,
                orderNumber: generateOrderNumber(supplier.supplier_id, date, salesOrders.length),
                date: new Date(date),
                orderValue: totalCost,
                products: products,
                status: "pending",
                supplier: supplier
            }
        }


        //every day, add a few new products to the list of buyable products
        for (let i = 0; i < randInt(0, 12); i++) {
            const product = createProduct(suppliers, categories, inventoryList);
            product.added = new Date(today);
            product.products_id = inventoryList.length + 1;
            inventoryList.push(product);
            dayCount.newProducts++
        }
        if (dayIndex && dayIndex % 7 === 0) {

            //place a new purchase order every 7 days.  
            if (DEBUG) console.warn("Placing a new Purchase order")
            purchaseOrders.concat(generatePurchaseOrders(supplierList, inventoryList, categories, today, funds, purchaseOrders.length))
            dayCount.purchaseOrders++
            // generate some returns based on a random subset of unhappy customers this week. 
            salesOrders["delivered"] = salesOrders["delivered"].filter(order => {
                if (daysBetween(today, order.shippedDate) <= 14) {
                    if (order.satisfactionRating < 3 && Math.random() > 0.5) {
                        order.customer.active = false //dissatisfied customer.
                        const returnedItems = []
                        order.status = "cancelled"
                        dayCount.salesCancelled++
                        order.items.forEach(item => {
                            //2% chance item is returned damaged but full refund still required. 
                            if (Math.random() > 0.02)
                                inventoryList[inventoryList.indexOf(item.product)].quantity += item.units
                            else if (DEBUG) console.log("BER", { code: item.product.code, units: item.units })
                            returnedItems.push({ code: item.product.code, units: item.units })

                        })
                        invoices.push({
                            orderDate: new Date(today),
                            invoiceNumber: order.id,
                            supplier: order.customer,
                            amount: order.total,
                            products: returnedItems,
                            paidDate: today,
                            purpose: "RETURNS"
                        })
                        dayCount.amountRefunded += order.total
                        funds = Number((funds - order.total).toFixed(2));
                        salesOrders["cancelled"].push(order)
                        return false;
                    }
                } else {
                    salesOrders["completed"].push(order)
                    return false
                }
                return true;
            })

        }

        if (dayIndex && dayIndex % 28 === 0) {
            // make the outgoings a proportion of remaining funds every 28 days
            const outgoings = funds * rand(0.2, 0.3)
            dayCount.paidOut += outgoings
            funds = Number((funds - outgoings).toFixed(2));
            invoices.push({
                orderDate: new Date(today),
                invoiceNumber: generateOrderNumber("PIN", today, invoices.length),
                supplier: "various",
                amount: outgoings.toFixed(2),
                products: "various",
                paidDate: today,
                purpose: "EXPENSES"
            })
            if (DEBUG) console.warn("Expenses this month: ", Math.ceil(dayIndex / 28), outgoings.toFixed(2), "Sales: ",)
        }
        dayIndex++
        today.setDate(today.getDate() + 1);
        const spaceUsedToday = getUsedVolume(inventoryList)
        dayCount.warehouseSpaceUsed = spaceUsedToday.warehouse
        dayCount.packagingSpaceUsed = spaceUsedToday.packaging

        counts.push ({day:new Date(today),counts:JSON.parse(JSON.stringify(dayCount))})
    }


    return {
        inventory: inventoryList,
        customers: activatedCustomers,
        purchaseOrders: purchaseOrders,
        salesOrders: salesOrders,
        supplierInvoices: invoices,
        counts
    }

}


function getCategories() {
    const categories = [
        {
            name: "Tools",
            weight: 0.2,
            priceRange: [5, 15],
            marginRange: [0.3, 0.7],
            volumeRange: [20, 150],
            packSizes: [5, 10, 12, 24]
        },
        {
            name: "Books",
            weight: 0.3,
            priceRange: [3, 7],
            marginRange: [0.2, 0.5],
            volumeRange: [1, 10],
            packSizes: [1, 5, 20]

        },
        {
            name: "Gifts",
            weight: 0.7,
            priceRange: [4, 17],
            marginRange: [0.3, 1.2],
            volumeRange: [5, 75],
            packSizes: [6, 10, 12, 24]

        },
        {
            name: "Fashion",
            weight: 0.6,
            priceRange: [5, 20],
            marginRange: [0.5, 0.9],
            volumeRange: [10, 50],
            packSizes: [1, 3, 6, 12]

        },
        {
            name: "Electronics",
            weight: 0.7,
            priceRange: [15, 103],
            marginRange: [0.1, 0.2],
            volumeRange: [100, 500],
            packSizes: [2, 5]

        },
    ];
    return categories;
}
