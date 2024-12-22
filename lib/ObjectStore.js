class ObjectStore {
    constructor(db, storeName) {
        this.db = db;
        this.storeName = storeName
    }

    addOne(data) {
        const transaction = this.db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName)
        const request = store.add(this.storeName, data)
        request.oncomplete = function () {
            console.log('added record');
        }
        request.onerror = function (error) {
            console.error(error)
        }
    }

    getAll(datasets, callback) {
        const transaction = this.db.transaction(datasets, "readonly");
        const objects = []
        datasets.forEach(ds => {
            const store = transaction.objectStore(ds);
            const request = store.getAll();
            request.onerror = function (error) {
                console.error(error)
            }
            request.onsuccess = function (e) {
                objects.push(e.target.result)
            }

        });
        transaction.oncomplete = function () {
            callback(objects)
        }
        transaction.onerror = () => {
            console.error(`Error getting ${this.storeName} from database`);
        };
        transaction.commit();

    }

    getData(callback) {
        const transaction = this.db.transaction(this.storeName, "readonly");
        let object = "";
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        request.onerror = function (error) {
            console.error(error)
        }
        request.onsuccess = function (e) {
            object = e.target.result;
        }


        transaction.oncomplete = function () {
            callback(object)
        }
        transaction.onerror = () => {
            console.error(`Error getting ${this.storeName} from database`);
        };
        transaction.commit();

    }

    addAll(dataset) {
        const transaction = this.db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName)
        dataset.forEach(item => {
            store.put(item);
        })

        transaction.oncomplete = () => {
            console.log(this.storeName + " added to database");
        };
        transaction.onerror = () => {
            console.error(`Error adding ${this.storeName} to database`);
        };
        transaction.commit();
    }

    deleteOne(index) {
        const transaction = this.db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(index);

        request.onsuccess = function () {
            console.log("Record deleted");
        };

        request.onerror = function (error) {
            console.error("Error deleting record:", error);
        };
    }

    updateOne(index, updatedData) {
        const transaction = this.db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(index);

        request.onsuccess = function () {
            const existingRecord = request.result;

            if (existingRecord) {
                Object.assign(existingRecord, updatedData);

                const updateRequest = store.put(existingRecord);

                updateRequest.onsuccess = function () {
                    console.log("Record updated");
                };

                updateRequest.onerror = function (error) {
                    console.error("Error updating record:", error);
                };
            } else {
                console.error("Record not found for update.");
            }
        };

        transaction.onerror = function (error) {
            console.error("Error accessing transaction:", error);
        };
    }

    findBy(condition, callback) {
        const transaction = this.db.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        const result = [];

        store.openCursor().onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                if (condition(cursor.value)) {
                    result.push(cursor.value);
                }
                cursor.continue();
            } else {
                callback(result);
            }
        };

        transaction.onerror = function (error) {
            console.error("Error finding records:", error);
        };
    }


    getOne(index, callback) {
        const transaction = this.db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(index);
        request.onsuccess = function () {
            callback(request.result);
        }
        request.onerror = function (error) {
            callback("Error obtaining record:", error);
        }
    }
}


if (typeof globalThis !== "undefined") {
    if (globalThis.hasOwnProperty("_sharedLogic")) {
        globalThis._sharedLogic.ObjectStore = ObjectStore
    } else
        globalThis._sharedLogic = { ObjectStore };
}



