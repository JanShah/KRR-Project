function createObjectStores(db) {
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
    if (!db.objectStoreNames.contains("counts")) {
        db.createObjectStore("counts", { keyPath: "day", autoIncrement: true });
    }
}