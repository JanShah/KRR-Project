

async function initDB(db) {
    let boxes = await fetchData("data/prices.json");
    let customersArray = textToJSON(parseCSV(await fetchData("data/customers.csv", 'text')));
    const suppliers = textToJSON(parseCSV(await fetchData("data/suppliers.csv", 'text')));

    //change this to get all the data genOrders. don't need to load products any more.
    const { customers, inventory, purchaseOrders, salesOrders, supplierInvoices, counts } = generateOrders(customersArray, boxes, suppliers);
    console.log(counts)

    boxes = inventory.splice(0, 69);

    const orders = [...purchaseOrders['pending'], ...purchaseOrders['paid'], ...purchaseOrders['delivered']];
    const sales = [...salesOrders['pending'], ...salesOrders['paid'], ...salesOrders['delivered'], ...salesOrders['cancelled'], ...salesOrders['completed']];

    /* 
    type IDBTransaction
    */
    // debugger

    new ObjectStore(db, "products").addAll(inventory);
    new ObjectStore(db, "boxes").addAll(boxes)
    new ObjectStore(db, 'customers').addAll(customers)
    new ObjectStore(db, 'sales').addAll(sales)
    new ObjectStore(db, 'orders').addAll(orders)
    new ObjectStore(db, 'suppliers').addAll(suppliers)
    new ObjectStore(db, 'invoices').addAll(supplierInvoices)
    new ObjectStore(db, 'counts').addAll(counts)
    console.log("Database setup complete");
}