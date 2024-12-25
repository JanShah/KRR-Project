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
    "lib/shipSalesOrder.js",
    "lib/daysBetween.js",
    "lib/shortDate.js",
    "lib/createObjectStores.js",
    "lib/createDayCount.js",
    "lib/Record.js",
    "lib/processPayments.js",
    "lib/salesOrderPayment.js",
    "lib/backOrderItems.js"
);
const DEBUG = false;
var db;
var startingData = { startDate: "2023-01-01", endDate: "2023-04-01", startingBudget: 5000 }
var shouldDBInit = false; //change this to false when done
var request;
openDB();
function openDB() {
    request = indexedDB.open("salesDB", 1);
    request.onerror = function (event) {
        console.log("Error opening database");
    }
    request.onsuccess = async function (event) {
        db = event.target.result;
        if (shouldDBInit) {
            self.postMessage({ type: "starting" })
            await initDB(db, startingData);
            shouldDBInit = false;
            self.postMessage({ type: "configured", success: true })

        }

        self.postMessage({ type: "setup", success: true })
    }

    request.onupgradeneeded = function (event) {
        shouldDBInit = true;
        db = event.target.result;
        createObjectStores(event.target.result)
    }
}

function resetAndStartAgain(data) {
    db.close(e => console.log(e))
    resetRequest = indexedDB.deleteDatabase("salesDB");
    resetRequest.onsuccess = function (event) {
        startingData = JSON.parse(JSON.stringify(data.data))
        startingData.startingBudget = Number(startingData.startingBudget)
        openDB();
    }
    resetRequest.onerror = function (event) {

        console.log("An Error occurred")
    }

}

self.onmessage = async (e) => {
    const instruction = e.data.action || null;
    if (DEBUG) console.log("Message received from main script", instruction);
    if (!instruction) return;
    switch (instruction) {
        case "regen":
            return resetAndStartAgain(e.data)
        case "getSettings":
            return retrieveSettings()
        case "getSupplier":
            return getSupplierInfo(e.data.supplier);
        case "getProducts":
            return getProducts();
        case "getOrders":
            return getOrders();
        case "getSales":
            return getSales();
        case "getPackaging":
            return getPackaging();
        case "getCustomers":
            return getCustomers();
        case "getSuppliers":
            return getSuppliers();
        case "getInvoices":
            return getInvoices();
        case "getSummary":
            return getCounts();
        default:
            console.warn("possible unhandled request", e)
            return null;
    }
};

function retrieveSettings() {
    new ObjectStore(db, "settings").getOne(1, settings => {
        self.postMessage({ type: "settings", settings })
    })
}

function getSupplierInfo(ID) {
    const data = []
    function matchSupplier(obj) {
        return obj.supplier.supplier_id == ID
    }
    function matchSupplierSales(obj) {
        return obj.items.some(items => items.product.supplier.supplier_id == ID)
    }
    new ObjectStore(db, "suppliers").getOne(ID, (supplier) => {
        data.push({
            supplier
        });
        new ObjectStore(db, "orders").findBy(matchSupplier, (orders) => {
            data.push({
                orders
            });
            new ObjectStore(db, "invoices").findBy(matchSupplier, (invoice) => {
                data.push({
                    invoice
                });
                new ObjectStore(db, "sales").findBy(matchSupplierSales, (sales) => {
                    data.push({
                        sales
                    });
                    self.postMessage({ type: "supplierSummary", summary: data });
                });
            });
        });
    });
}

function getInvoices() {
    new ObjectStore(db, "invoices").getData(invoices => {
        self.postMessage({ type: "invoices", invoices });
    })
}

function getCounts() {
    new ObjectStore(db, "counts").getData(summary => {
        self.postMessage({ type: "summary", summary });
    })
}

function getSuppliers() {
    new ObjectStore(db, "suppliers").getData(suppliers => {
        self.postMessage({ type: "suppliers", suppliers })
    })


}

function getSales() {
    new ObjectStore(db, "sales").getData(sales => {
        const allKeys = ["paidDate", "id", "customer", "count", "total", "packageUsed"]
        const salesData = sales.map(i => {
            const arr = []
            allKeys.forEach(key => {
                if (key === "paidDate") {
                    arr.push(shortDate(i[key]))
                } else if (key === "customer") {
                    arr.push(i[key].ID)
                } else if (key === "packageUsed") {
                    if (!i[key]) arr.push(0)
                    else arr.push(i[key].code)
                } else if (key === "count") {
                    arr.push(i.items.reduce((a, c) => a + c.units, 0))
                } else {
                    arr.push(i[key])
                }
            })
            return arr;
        });
        self.postMessage({ type: "sales", sales: salesData })
    })

}

function getCustomers() {
    new ObjectStore(db, "customers").getData((customers) => {


        self.postMessage({ type: "customers", customers })
    })


}

function getPackaging() {
    new ObjectStore(db, "boxes").getData((boxes) => {
        self.postMessage({ type: "packaging", boxes })
    });
}

function getProducts() {
    new ObjectStore(db, "products").getData((products) => {

        self.postMessage({ type: "products", products });
    });
}

async function getOrders() {
    new ObjectStore(db, "orders").getData((orders) => {

        self.postMessage({ type: "purchaseOrders", orders });
    });
}