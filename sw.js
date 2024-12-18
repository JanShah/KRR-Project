importScripts(
    "lib/load.js",
    "lib/simpleCSVParse.js",
    "lib/textToJSON.js",
    "lib/generateOrders.js",
    "lib/rand.js",
    "lib/skewedSelection.js",
    "lib/boxCalc.js",
    "lib/volume.js",
    "lib/initDB.js",
    "lib/flatVolume.js",
    "lib/boxDemandSummary.js",
    "lib/basicSummary.js",
    "lib/getWeekNumber.js",
    "lib/getOrderValue.js",
    "lib/ObjectStore.js",
    "lib/weightedRandom.js",
    "lib/packageCalculation.js",
    "lib/createPurchaseOrder.js",
    "lib/activateCustomers.js",
    "lib/createProduct.js",
    "lib/stockCode.js", 
    "lib/generatePurchaseOrders.js",
    "lib/generateSalesOrder.js",
    "lib/createBackOrder.js",
    "lib/getUsedVolume.js",
    "lib/processOrder.js",
    "lib/daysBetween.js"
);
var db;
var shouldDBInit = false; //change this when done
const request = indexedDB.open("salesDB", 1);
request.onerror = function (event) {
    console.log("Error opening database");
}
request.onsuccess = async function (event) {
    db = event.target.result;
    if (shouldDBInit) {
        self.postMessage({ type: "starting" })
        await initDB(db);
        shouldDBInit = false;
    }
    // console.log("Database opened successfully");

    const POtransaction = db.transaction(["products", "orders"], "readonly")
    const pRequest = POtransaction.objectStore("products").getAll()
    const oRequest = POtransaction.objectStore("orders").getAll()
    let orders, products;
    pRequest.onsuccess = () => {
        // console.log("Products:", pRequest.result);
        products = pRequest.result;
    };


    oRequest.onsuccess = () => {
        // console.log("Orders:", oRequest.result);
        orders = oRequest.result;
    };

    POtransaction.oncomplete = function (event) {

        self.postMessage({ type: "productOrderData", orders, products })
    }
    POtransaction.onerror = function () {
        // console.log("Error getting data from database");
    }
    self.postMessage({ type: "setup", success: true })
}

request.onupgradeneeded = function (event) {
    shouldDBInit = true;
    db = event.target.result;
    if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "code", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("boxes")) {
        db.createObjectStore("boxes", { keyPath: "code" });
    }
    if (!db.objectStoreNames.contains("customers")) {
        db.createObjectStore("customers", { keyPath: "ID", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("sales")) {
        db.createObjectStore("sales", { keyPath: "id", autoIncrement: true });
    }

    if (!db.objectStoreNames.contains("orders")) {
        db.createObjectStore("orders", { keyPath: "orderNumber", autoIncrement: true });
    }

    if (!db.objectStoreNames.contains("suppliers")) {
        db.createObjectStore("suppliers", { keyPath: "supplier_id", autoIncrement: true });
    }

    if (!db.objectStoreNames.contains("invoices")) {
        db.createObjectStore("invoices", { keyPath: "invoiceNumber", autoIncrement: true });
    }
    

    // console.log("Database tables complete");
}



self.onmessage = async (e) => {
    const instruction = e.data.action || null;
    console.log("Message received from main script", instruction);
    if (!instruction) return;
    switch (instruction) {
        case "getProducts":
            getProducts();
        case "getOrders":
            getOrders();
            break;
        case "getPackaging":
            getPackaging();
            break;
        case "getCustomers":
            getCustomers();
            break;
        case "getSuppliers":
            getSuppliers();
            break;
        default:
            return null;
    }
};

function getSuppliers() {
    if (!db) debugger;
    new ObjectStore(db, "suppliers").getAll(["suppliers"], process)

    function process(suppliers) {
        const allKeys = ['supplier_id', 'name', 'street', 'city', 'postcode', 'lead_time', 'credit_limit', 'credit_time']
        suppliers = suppliers[0].map(e => {
            return Object.values(e)
        })
        // debugger
        self.postMessage({ type: "suppliers", suppliers })
    }

}



function getCustomers() {
    if (!db) debugger;
    new ObjectStore(db, "customers").getAll(["customers", "orders"], process)

    function process([cData, orders] = data) {
        const allKeys = [
            "ID", "Firstname", "Surname", "Street", "Town", "City", "County", "Postcode"
        ]
        const customers = cData.map(customer => {
            const values = allKeys.map(key => {
                return customer[key] || ""
            })
            const cOrders = orders.filter(order => {
                return order.customer === Number(customer.ID);
            })
            const ordersValue = cOrders.reduce((acc, curr) => {
                return acc + getOrderValue(curr);
            }, 0)
            values.push(cOrders.length)
            values.push("£" + ordersValue.toFixed(2))
            return values
        });
        self.postMessage({ type: "customers", customers })
    }

}

function getPackaging() {

    if (!db) debugger
    const transaction = db.transaction(["boxes", "orders"], "readonly");
    const oRequest = transaction.objectStore("orders").getAll()
    const store = transaction.objectStore("boxes");
    const bRequest = store.getAll();
    let boxes, orders;
    oRequest.onsuccess = function (event) {
        orders = event.target.result;
    }
    oRequest.onerror = function (event) {
        console.error("Error: ", event)
    }

    bRequest.onerror = function () {
        // console.log("Error retrieving packages");
        self.postMessage({ type: "packages", packages: null });
    };

    transaction.oncomplete = function () {
        const boxesUsed = boxDemandSummary(orders, "monthly");

        const allBoxDemand = boxesUsed.reduce((acc, curr) => {
            Object.keys(curr).forEach(key => {
                if (!acc[key]) acc[key] = 0;
                acc[key] += curr[key].totalOrders;
            })
            return acc;
        }, {})
        const packages = boxes.sort((a, b) => {
            const pA = a['price breaks']['price per pack'][0] / a.pack
            const pB = b['price breaks']['price per pack'][0] / b.pack
            return pA - pB
        }).map(box => {
            const dt = [
                box.code,
                box.type,
                box.pack,
                box.size.join('x'),
                flatVolume(...box.size)
            ];
            box['price breaks']['price per pack'].forEach((price, index, arr) => {
                dt.push("£" + price.toFixed(2))
                if (index == arr.length - 1) {
                    dt.push(box['price breaks']['quantities'][index])
                }
            })
            dt.push(allBoxDemand[box.code] || 0)
            return dt

        })
        // console.log("Packages retrieved successfully:");
        self.postMessage({ type: "packaging", orders, packages })
    }

    bRequest.onsuccess = function (event) {
        boxes = event.target.result;
        // self.postMessage({ type: "packaging", packages });
    }

}

function getProducts() {

    if (!db) debugger
    const transaction = db.transaction("products", "readonly");
    const store = transaction.objectStore("products");
    const request = store.getAll();
    request.onerror = function () {
        // console.log("Error retrieving products");
        self.postMessage({ type: "products", products: null });
    };

    request.onsuccess = function (event) {
        // console.log("Products retrieved successfully:", event.target.result);
        self.postMessage({ type: "getProducts", products: event.target.result });
    }

}

async function getOrders() {
    if (!db) debugger
    const transaction = db.transaction("orders", "readonly");
    const request = transaction.objectStore("orders").getAll();
    //if there are no records return failure or null 
    request.onerror = function () {
        // console.log("Error retrieving orders");
        self.postMessage({ type: "orders", orders: null });
    };


    request.onsuccess = function (event) {
        // console.log("Orders retrieved successfully:", event.target.result);
        self.postMessage({ type: "orders", orders: event.target.result });
    }
}