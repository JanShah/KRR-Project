async function generateOrders(products, customers, boxData, suppliers) {

    const time = new Date()
    const allData = genOrders(customers, boxData, suppliers);
    const endTime = new Date() - time;
    console.log(`Generated orders in ${endTime} ms`);
    debugger
    const orders = await fetchData("./data/orderGenData.json");
    const orderData = [];
    const sortedProducts = products.sort((a, b) => parseFloat(a.sale_price) - parseFloat(b.sale_price));
    orders.forEach(group => {
        const monthlyOrders = group.data
        Object.keys(monthlyOrders).forEach((key, index) => {
            const month = monthlyOrders[key]; //add the year index
            //TODO: Need to add the year to each month
            //each month there are multiple order sizes
            month.forEach((monthData) => {
                const orderSize = monthData.size;
                const orderQuantity = monthData.number;

                const daysInMonth = new Date(Date.UTC(group.year, index + 1, 0)).getDate();
                for (let i = 1; i <= daysInMonth; i++) {
                    const noOfOrders = rand(...orderQuantity);

                    for (let j = 0; j < noOfOrders; j++) {
                        const noOfProducts = rand(...orderSize);
                        const customer = customers[rand(1, customers.length)];
                        const productSelection = getSkewedSelection(sortedProducts, noOfProducts);
                        const order = {
                            customer: customer.ID,
                            products: productSelection,
                            noOfProducts: noOfProducts,
                            orderDate: new Date(`${group.year}-${index + 1}-${i}`),
                            package: naiveBoxCalculation(productSelection, boxData)
                        };
                        orderData.push(order);
                    }
                }
            });


        });
    })


    return orderData
}




function generateOrderNumber(id, date, index) {
    const prefix = id.toString().padStart(3, '0');
    const suffix = date.toISOString().split("T")[0].split('-').reverse().join("");
    return prefix + suffix + index;
}

/**
    genOrders
 * @param {[{ "ID": Number,
    "Firstname": string,
    "Surname": string,
    "Street": string,
    "Town": string,
    "City": string,
    "County": string,
    "Postcode": string
    }]} customers
    @param {[{
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
function genOrders(customers, boxes, suppliers) {

    const packagingSupplier = suppliers.find(s => s.supplier_id.startsWith("B"));

    const salesOrders = [];
    let inventoryList = [];
    const invoices = [];
    let funds = 200000;
    const startingDate = new Date("01/04/2023");
    const endingDate = new Date("01/10/2024");
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

    class NObject extends Object {

        constructor() {
            super();
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
    const newSalesOrders = new NObject()
    purchaseOrders.pending = generatePurchaseOrders(supplierList, inventoryList, categories, startingDate, funds, 0)

    newSalesOrders['cancelled'] = [];
    // console.log("Purchase Orders", purchaseOrders)


    customers = customers.sort(() => Math.random() - 0.5);

    let activatedCustomers = activateCustomers(customers, 100, startingDate)
    let dayIndex = 0;
    while (today < endingDate) {
        //days till end date
        const daysTillEnd = daysBetween(endingDate, today);
        const newCustomerCount = Math.floor(customers.length / daysTillEnd);
        const newCustomers = activateCustomers(customers, newCustomerCount, today, activatedCustomers.length, true);
        const newStockShortage = {};
        const boxDemand = [];

        activatedCustomers = activatedCustomers.concat(newCustomers).filter(c => c.active);
        // check the purchase orders every day for delivery.  Delivery date is based on supplier after order date. 


        //deactivate some of the customers that have not ordered in 20 days or more
        activatedCustomers.forEach(c => {
            const diffDays = daysBetween(today, c.lastOrder);
            if (diffDays < 20 && c.active) c.active = Math.random() > 0.6
        });

        purchaseOrders['delivered'] = purchaseOrders['delivered'].filter(po => {
            if (today < po.paymentDate) return true
            
            if (funds - po.orderValue < 0) {
                const message = "Send pleading letter.. You might be in trouble!";
                console.error(message)
                po.supplier.credit_limit = Math.max(0, po.supplier.credit_limit - 100); //supplier drops credit limit when unpaid.. but not below 0
                return true;
            }
            po.status = 'paid';
            po.paidDate = new Date(today)
            funds -= po.orderValue;
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
            // console.log("Supplier paid")
            purchaseOrders.push(po, "paid")
            return false
        })

        purchaseOrders['pending'] = purchaseOrders['pending'].filter(po => {
            const daysSinceOrder = daysBetween(today, po.date);

            if (daysSinceOrder >= po.supplier.lead_time) {
                if (Math.random() <= 0.02) {
                    // console.log("Arrgh, a delivery did not arrive!");
                    return true
                }
                po.status = 'delivered';
                // console.log("Purchase order delivered!")
                po.paymentDate = new Date(new Date(today).setDate(today.getDate() + po.supplier.credit_time));
                po.products.forEach(orderItem => {
                    inventoryList[inventoryList.indexOf(orderItem.product)].quantity += orderItem.units;
                });
                purchaseOrders.push(po, "delivered")
                return false
            }
            return true
        })


        // generate some orders for each customer. 
        const inStockItems = inventoryList.filter(p => p.quantity > 0 && p.supplier);
        if (inStockItems.length > 0)
            activatedCustomers.forEach(_ => {
                const order = generateSalesOrder(activatedCustomers, inStockItems, today, newSalesOrders.length);
                if (order) {
                    newSalesOrders.push(order);
                }
            });

        newSalesOrders["paid"] = newSalesOrders["paid"].filter(order => {
            //check that the items are in stock before shipping..
            return processOrder(order, inventoryList, boxes, newStockShortage, boxDemand, today, newSalesOrders)
        })


        newSalesOrders["pending"] = newSalesOrders["pending"].filter(order => {
            order.paymentType = ["credit card", "paypal", "cash"][randInt(0, 3)];
            order.status = "paid";
            order.paidDate = new Date(today);
            funds += order.total;
            newSalesOrders["paid"].push(order);

            return false;
        })


        if (boxDemand.length) {
            console.warn("Packaging shortage")
            const order = createBoxOrder(boxDemand, packagingSupplier, today);
            if (order)
                purchaseOrders.push(order)
        }

        if (Object.keys(newStockShortage).length) {
            console.warn(`Stock shortage.`)
            Object.keys(newStockShortage).forEach(supplierID => {

                let orderTotal = 0;
                const supplier = newStockShortage[supplierID].supplier;
                const orders = newStockShortage[supplierID];
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
                    // console.log("Not enough credit to back order!")
                    //check if there's enough cash to pay
                    //if so, modify cashUsed, otherwise dunno yet. 
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
                orderNumber: generateOrderNumber(supplier.supplier_id, date, newSalesOrders.length),
                date: new Date(date),
                orderValue: totalCost,
                products: products,
                status: "pending",
                supplier: supplier
            }
        }


        // after a certain fixed time (say every week to start), generate some supplies based on demand history
        // ensure new products are available.

        // every week, reconcile the cash flow, and the amount owed to suppliers. 
        // ensure that the amount owed to suppliers does not exceed 50% of cash funds.

        // after every day, enrol new customers based on a certain probability (a % of total customers)

        // after every day, add a few new products to the list, keeping the order cycle the same should mean 
        // orders increase in variety. 

        // 


        //every day, add a few new products to the list of buyable products
        for (let i = 0; i < randInt(0, 15); i++) {
            const product = createProduct(suppliers, categories, inventoryList);
            product.added = new Date(today);
            product.products_id = inventoryList.length + 1;
            inventoryList.push(product);
        }
        if (dayIndex && dayIndex % 7 === 0) {

            //place a new purchase order every 7 days.  
            console.warn("Placing a new Purchase order")
            purchaseOrders.concat(generatePurchaseOrders(supplierList, inventoryList, categories, today, funds, purchaseOrders.length))

            // generate some returns based on a random subset of unhappy customers this week. 
            newSalesOrders["delivered"] = newSalesOrders["delivered"].filter(order => {
                if (daysBetween(today, order.shippedDate) <= 14) {
                    if (order.satisfactionRating < 3 && Math.random() > 0.5) {
                        order.customer.active = false //dissatisfied customer.
                        const returnedItems = []
                        order.status = "cancelled"
                        order.items.forEach(item => {
                            //2% chance item is returned damaged but full refund still required. 
                            if (Math.random() > 0.02)
                                inventoryList[inventoryList.indexOf(item.product)].quantity += item.units
                            // else console.log("BER", { code: item.product.code, units: item.units })
                            returnedItems.push({ code: item.product.code, units: item.units })

                        })
                        invoices.push({
                            orderDate: new Date(today),
                            invoiceNumber: order.id,
                            supplier: order.customer,
                            amount: order.total,
                            products: returnedItems,
                            date: today,
                            purpose: "RETURNS"
                        })
                        funds = Number((funds - order.total).toFixed(2));
                        newSalesOrders["cancelled"].push(order)
                        return false;
                    }
                }
                return true;
            })

            // poorOrders.forEach(order => {
            //     order.customer.active = false //dissatisfied customer.
            //     const returnedItems = []
            //     order.status = "cancelled"
            //     order.items.forEach(item => {
            //         //2% chance item is returned damaged but full refund still required. 
            //         if (Math.random() > 0.02)
            //             inventoryList[inventoryList.indexOf(item.product)].quantity += item.units
            //         // else console.log("BER", { code: item.product.code, units: item.units })
            //         returnedItems.push({ code: item.product.code, units: item.units })

            //     })
            //     invoices.push({
            //         orderDate: new Date(today),
            //         invoiceNumber: order.id,
            //         supplier: order.customer,
            //         amount: order.total,
            //         products: returnedItems,
            //         date: today,
            //         purpose: "RETURNS"
            //     })
            //     funds = Number((funds - order.total).toFixed(2));
            // })

        }

        if (dayIndex && dayIndex % 28 === 0) {
            // make the outgoings a proportion of remaining funds every 28 days
            const outgoings = funds * rand(0.2, 0.3)
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
            console.warn("Expenses this month: ", Math.ceil(dayIndex / 28), outgoings.toFixed(2))
        }
        dayIndex++
        today.setDate(today.getDate() + 1);
    }





    //generate purchase orders and sales orders..  
    //I will start with an outlay, some cash to spend.  I spend it on a selection of products (I will randomly select)
    //Then I generate some orders from these items. 
    //At the end of a given week, I order some more items. Some to replenish existing stock and a quantity of new lines. 
    //Make it such that the next 52 weeks bring in around 20 new items per week. 
    //I will also add customers every week such that I have the full complement by the end. 
    //The way this function worked before, a fixed lower and upper limit is put on the quantities.  This should be altered to reflect the stock, less inventory and less customers is less orders
    //I will make it a fraction of the total number of products. 
    return {
        inventory: inventoryList,
        customers: activatedCustomers,
        purchaseOrders: purchaseOrders,
        salesOrders: newSalesOrders,
        supplierInvoices: invoices
    }

}


function getCategories() {
    const categories = [
        {
            name: "Tools",
            weight: 0.1,
            priceRange: [10, 30],
            marginRange: [0.15, 0.3],
            volumeRange: [20, 150],
            packSizes: [5, 10, 12, 24]
        },
        {
            name: "Books",
            weight: 0.3,
            priceRange: [5, 15],
            marginRange: [0.3, 0.6],
            volumeRange: [1, 10],
            packSizes: [1, 5, 10]

        },

        {
            name: "Fashion",
            weight: 0.6,
            priceRange: [5, 20],
            marginRange: [0.2, 0.7],
            volumeRange: [10, 50],
            packSizes: [1, 3, 6, 12]

        },
        {
            name: "Electronics",
            weight: 0.8,
            priceRange: [50, 250],
            marginRange: [0.1, 0.2],
            volumeRange: [100, 500],
            packSizes: [2, 5]

        },
    ];
    return categories;
}