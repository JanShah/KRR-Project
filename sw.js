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
const DEBUG = false;
var db;
var shouldDBInit = false; //change this to false when done
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

    const POtransaction = db.transaction(["products", "sales"], "readonly")
    const pRequest = POtransaction.objectStore("products").getAll()
    const oRequest = POtransaction.objectStore("sales").getAll()
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
    if (DEBUG) console.log("Message received from main script", instruction);
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
    if (!db) if (DEBUG) debugger;
    new ObjectStore(db, "suppliers").getData(process)

    function process(suppliers) {
        const allKeys = ['supplier_id', 'name', 'street', 'city', 'postcode', 'lead_time', 'credit_limit', 'credit_time']
        suppliers = suppliers.map(e => {
            return Object.values(e)
        })
        // debugger
        self.postMessage({ type: "suppliers", suppliers })
    }

}

function shortDate(date) {
    const dt = new Date(date);
    return `${dt.getUTCDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`
}

function getCustomers() {
    if (!db) if (DEBUG) debugger;
    new ObjectStore(db, "customers").getAll(["customers"], process)

    function process(data) {
        const allKeys = [
            "ID", "registeredDate",
            "Firstname", "Surname", 
            "Street", "Town", "City", 
            "County", "Postcode", "ordersPlaced", 
            "totalSpent", "lastOrderDate", "active"
        ]

        const customers = data[0].map(i => {
            const customerInfo = [];
            allKeys.forEach(key => {
                if(key==="active") {
                  customerInfo.push(i[key]?"Active": "Inactive")  
                }
                if(["lastOrderDate","registeredDate"].includes(key))
                    return customerInfo.push(shortDate(i[key]))
                    customerInfo.push(i[key] || 0)
            })
            return customerInfo
        })
        debugger

        self.postMessage({ type: "customers", customers })
    }

}

function getPackaging() {

    if (!db) if (DEBUG) debugger
    // const transaction = db.transaction("boxes", "readonly");
    new ObjectStore(db, "boxes").getData(process)

    function process(boxes) {
        const packages = boxes.map(box => {
            const dt = [
                box.code,
                box.type,
                box.pack,
                box.size.join('x'),
                box.volume
            ];
            box['price breaks']['price per pack'].forEach((price, index, arr) => {
                dt.push("£" + price.toFixed(2))
                if (index == arr.length - 1) {
                    dt.push(box['price breaks']['quantities'][index])
                }
            })
            dt.push(box.used || 0)
            return dt

        })
        // console.log("Packages retrieved successfully:");
        self.postMessage({ type: "packaging", packages })
    }

    // const store = transaction.objectStore("boxes");
    // const bRequest = store.getAll();
    // let boxes;

    // bRequest.onsuccess = function () {
    //     // console.log("Error retrieving packages");
    //     boxes = event.target.result;
    // };
    // bRequest.onerror = function () {
    //     // console.log("Error retrieving packages");
    //     self.postMessage({ type: "packages", packages: null });
    // };

    // transaction.oncomplete = function () {


    // }




    // bRequest.onsuccess = function (event) {
    //     boxes = event.target.result;
    //     // self.postMessage({ type: "packaging", packages });
    // }

}

function getProducts() {

    if (!db) if (DEBUG) debugger
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
    if (!db) if (DEBUG) debugger
    const transaction = db.transaction("orders", "readonly");
    const request = transaction.objectStore("orders").getAll();
    //if there are no records return failure or null 
    request.onerror = function () {
        // console.log("Error retrieving orders");
        self.postMessage({ type: "purchaseOrders", orders: null });
    };


    request.onsuccess = function (event) {
        if (DEBUG) console.log("Purchase orders retrieved successfully:", event.target.result);
        self.postMessage({ type: "purchaseOrders", orders: event.target.result });
    }
}