


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
function generateOrders(customers, boxes, suppliers, { startDate = "01/01/2023", endDate = "04/01/2023", startingBudget = 5000, packagingLeadTime = 5, useAdviser = false, preorder = undefined } = settings) {
    let backOrderBoxes
    let reOrderTimeHorizon = -1;
    if (preorder) {
        backOrderBoxes = preorder.reduce((acc, cur) => {
            acc[cur.item] = cur.quantity;
            return acc;
        }, {})
        reOrderTimeHorizon = preorder.timeHorizon;
    }
    const boxesObject = boxes.reduce((acc, cur) => {
        cur.quantity = 0;
        cur.volume = flatVolume(...cur.size)
        acc[cur.code] = cur;
        return acc;
    }, {})
    const packagingSupplier = suppliers.find(s => s.supplier_id.startsWith("B"));
    packagingSupplier.lead_time = packagingLeadTime;
    let inventoryList = [];
    const invoices = [];
    let funds = startingBudget;
    const startingDate = new Date(startDate);
    const endingDate = new Date(endDate);
    let today = startingDate;
    const startingCount = 30;
    const categories = getCategories();
    // boxes.forEach(box => {
    //     // if (!useAdviser) {
    //     //     box.quantity = 0;
    //     // } else if (backOrderBoxes && backOrderBoxes[box.code]) {
    //     //     box.quantity = backOrderBoxes[box.code] * box.pack
    //     // } else {
    //         box.quantity = 0;
    //     // }
    //     box.volume = flatVolume(...box.size)
    // })

    inventoryList = inventoryList.concat(boxes);
    //start with startingCount products on day 1
    for (let i = 0; i < startingCount; i++) {
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

    const purchaseOrders = new OrderRecord();
    const salesOrders = new SalesRecord();
    purchaseOrders.pending = generatePurchaseOrders(supplierList, inventoryList, categories, startingDate, funds, 0)

    if (useAdviser && backOrderBoxes) {
        Object.keys(backOrderBoxes).forEach(key => {
            backOrderBoxes[key] = backOrderBoxes[key] * boxesObject[key].pack;
        })
        const backdated = new Date(new Date(today).setDate(today.getDay() - (packagingSupplier.lead_time+1)))
        const boxOrder = createBoxOrder(backOrderBoxes, packagingSupplier, backdated, boxesObject, purchaseOrders);
        purchaseOrders.pending.push(boxOrder);
        debugger

    }


    const counts = []
    customers = customers.sort(() => Math.random() - 0.5);

    let activatedCustomers = activateCustomers(customers, startingCount, startingDate)
    let dayIndex = 0;
    if (DEBUG) console.warn("Starting: ", startingDate)
    if (DEBUG) console.warn(" Ending: ", endingDate);

    while (today < endingDate) {
        const daysTillEnd = Math.ceil(daysBetween(endingDate, today));
        const yesterdaysReputation = counts.length ? counts.slice(-1)[0].counts.rating : 5;
        const formattedDate = `${String(today.getDate()).padStart(2, '0')} ${String(today.getMonth()).padStart(2, '0')} ${today.getFullYear()}`;
        const dayMessage = "Creating Data for " + formattedDate + " <br>Remaining days " + daysTillEnd;
        self.postMessage({ type: "message", message: dayMessage })
        //days till end date
        const newCustomerCount = Math.min(randInt(5, 21), Math.floor(customers.length / daysTillEnd));
        const newCustomers = activateCustomers(customers, newCustomerCount, today, activatedCustomers.length, true);
        const stockShortage = {};
        const boxDemand = [];
        const dayCount = createDayCount(newCustomers.length, today);

        if (reOrderTimeHorizon > -1) {
            if (dayIndex && dayIndex % (14 * reOrderTimeHorizon) === 0) {
                const validOrders = [...salesOrders['paid'], ...salesOrders['delivered']]
                    .filter(o => daysBetween(o.paidDate, today) < (14 * reOrderTimeHorizon))
                let dt;
                const sortedOrders = validOrders.reduce((acc, cur, index) => {
                    if (cur.packageUsed) {
                        const code = cur.packageUsed.code
                        if (index % 7 === 0) {
                            dt = cur.paidDate;
                        }
                        if (!acc[dt])
                            acc[dt] = {}
                        if (!acc[dt][code])
                            acc[dt][code] = 1
                        else
                            acc[dt][code]++
                    }
                    return acc

                }, {});

                //TODO: this should be looking at posterior
                const futureDemandForecast = demandForecast(sortedOrders, reOrderTimeHorizon)
                const proposedOrder = proposePurchaseOrder(reOrderTimeHorizon, futureDemandForecast, boxesObject)
                .map(item => {
                    item.qty = Math.ceil(item.qty / boxesObject[item.code].pack)
                    return item;
                });
                // const recommendation = analyseProposedOrder(proposedOrder, boxesObject)
                //TODO: Finish this off. 

            }
        }



        activatedCustomers = activatedCustomers.concat(newCustomers).filter(c => c.active);
        // check the purchase orders every day for delivery.  Delivery date is based on supplier after order date. 


        // //deactivate some of the customers that have not ordered in 20 days or more
        // activatedCustomers.forEach(c => {
        //     const diffDays = daysBetween(today, c.lastOrder);
        //     if (daysBetween(startingDate, today) < 10) return
        //     const isActive = Math.random() > 0.7
        //     if (diffDays < 10 && c.active) c.active = isActive
        //     if (!isActive)
        //         dayCount.customersLost++
        // });

        [purchaseOrders['delivered'], funds] = processPayments(
            purchaseOrders, today, funds, dayCount, invoices);

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
                const order = generateSalesOrder(activatedCustomers, inStockItems, today, salesOrders.length, yesterdaysReputation);
                if (order) {
                    salesOrders.push(order);
                    dayCount.salesOrders++
                    order.items.forEach(item => {
                        if (dayCount.categorySales[item.product.category]) dayCount.categorySales[item.product.category]++
                        else dayCount.categorySales[item.product.category] = 1;
                    })
                }
            });

        salesOrders["paid"] = salesOrders["paid"].filter(order => {

            const isBackOrder = shipSalesOrder(order, inventoryList, boxes, stockShortage, boxDemand, today, salesOrders)
            if (!order.counted) {
                if (order.status === "delivered")
                    dayCount.salesOrdersShipped++
                else {
                    if (order.packageShort) {
                        dayCount.packageShortage++
                        order.packageShort = false
                    } else
                        dayCount.delayedOrders++
                }
                order.counted = true
            }
            return isBackOrder
        })

        const processedSalesOrders = salesOrderPayment(salesOrders, today, funds, dayCount);

        [salesOrders["pending"], funds] = processedSalesOrders;

        if (boxDemand.length) {
            if (DEBUG) console.warn("Packaging shortage", today)
            const order = createBoxOrder(createDemandObject(boxDemand), packagingSupplier, today, boxesObject, purchaseOrders);
            if (order) {
                purchaseOrders.push(order)
                dayCount.packagingOrders += boxDemand.length
            }
        }

        funds = backOrderItems(stockShortage, purchaseOrders, funds, today);





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
            purchaseOrders.concat(generatePurchaseOrders(supplierList, inventoryList, categories, today, funds, purchaseOrders.length))
            if (DEBUG) console.warn("Placing new Purchase orders", purchaseOrders.length)
            dayCount.purchaseOrders++
            // generate some returns based on a random subset of unhappy customers this week. 
            salesOrders["delivered"] = salesOrders["delivered"].filter(order => {
                if (daysBetween(today, order.shippedDate) <= 14 && order.satisfactionRating < 3) {
                    const cancelChance = (1 - (order.satisfactionRating) / 5) / 5
                    if (Math.random() < cancelChance) {
                        const isActiveNow = Math.random() > 0.7
                        order.customer.active = isActiveNow //dissatisfied customer.
                        const returnedItems = []
                        order.status = "cancelled"
                        dayCount.salesCancelled++

                        dayCount.customersLost += isActiveNow ? 0 : 1
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
            const outgoings = Math.max(12000 * rand(0.1, 0.4), Math.min(5000, funds * rand(0.2, 0.3)))
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
        const spaceUsedToday = getUsedVolume(inventoryList);
        dayCount.warehouseSpaceUsed = spaceUsedToday.warehouse;
        dayCount.packagingSpaceUsed = spaceUsedToday.packaging;
        const todaysRating = salesOrders.getRating(today);
        dayCount.rating = (yesterdaysReputation + todaysRating) / 2;
        counts.push({ day: new Date(today), counts: JSON.parse(JSON.stringify(dayCount)) })

        dayIndex++
        today.setDate(today.getDate() + 1);
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

class Category {
    constructor(name, weight, priceRange, marginRange, volumeRange, packSizes) {
        this.name = name;
        this.weight = weight;
        this.priceRange = priceRange;
        this.volumeRange = volumeRange;
        this.packSizes = packSizes;
        this.marginRange = marginRange;
    }
}

function createDemandObject(packages) {
    return packages.reduce((acc, cur) => {
        if (!acc[cur.code])
            acc[cur.code] = 0;
        acc[cur.code]++
        return acc;
    }, {})
}

function createBoxOrder(demand, supplier, date, boxesObject, orders) {
    let totalCost = 0;
    const products = [];

    Object.keys(demand).forEach(code => {
        const box = boxesObject[code];
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
        orderNumber: generateOrderNumber(supplier.supplier_id, date, orders.length),
        date: new Date(date),
        orderValue: totalCost,
        products: products,
        status: "pending",
        supplier: supplier
    }
}

function getCategories() {
    const categories = [
        new Category("Tools", 0.2, [1, 12], [0.5, 1.7], [79000, 5500000], [5, 10, 12, 24]),
        new Category("Books", 0.3, [2, 3], [0.5, 1.9], [10500, 5200000], [5, 20]),
        new Category("Gifts", 0.7, [4, 15], [0.5, 1.2], [15000, 17050000], [6, 10, 12, 24]),
        new Category("Fashion", 0.6, [3, 10], [0.5, 2.9], [450000, 50000000], [3, 6, 12]),
        new Category("Electronics", 0.7, [5, 50], [0.3, 0.5], [1000000, 50000000], [2, 5, 20]),
    ];
    return categories;
}
