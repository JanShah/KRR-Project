import createTable from "./createTable.js";
import "./getOrderValue.js";
const getOrderValue = globalThis._sharedLogic.getOrderValue;
import orderVolumes from "./orderVolumes.js";
import createChartDataFromArray from "./createChartDataFromArray.js";

export default function messageHandler(worker, data) {
    const messageBox = document.getElementById('message');
    switch (data.type) {
        case "message": 
            messageBox.innerHTML = data.message;
        case "starting":
            // console.log("init called");
            messageBox.innerHTML = "Initialising"

        case "orders":
            // console.log("orders called")
            messageBox.innerHTML = "Loading Orders"
            const orderData = data.orders;
            if (orderData) {
                const orderTableData = orderData.map((order, index) => {
                    return [
                        order.orderDate.toLocaleDateString('en-GB'), //date
                        index, //id
                        order.customer, //customer
                        order.noOfProducts, //quantity
                        getOrderValue(order), // total
                        order.package.code // package
                    ]
                })
                createTable('#ordersTable', orderTableData);
                const salesDailyBtn = document.getElementById('salesDailyBtn');
                const salesWeeklyBtn = document.getElementById('salesWeeklyBtn');
                const salesMonthlyBtn = document.getElementById('salesMonthlyBtn');


                [salesDailyBtn, salesWeeklyBtn, salesMonthlyBtn].forEach(btn => {
                    btn.addEventListener('click', function () {
                        if (btn === salesDailyBtn) {
                            createSalesChart(createChartDataFromArray(orderData, "daily"), "Daily");
                        } else if (btn === salesWeeklyBtn) {
                            createSalesChart(createChartDataFromArray(orderData, "weekly"), "Weekly");
                        } else if (btn === salesMonthlyBtn) {
                            createSalesChart(createChartDataFromArray(orderData, "monthly"), "Monthly");
                        }
                    });
                });
            }
            break;
        case "setup":
            messageBox.innerHTML = "Initialising"
            if (data.success) {
                //post message AFTER db setup
                worker.postMessage({ "action": "getOrders" });
                worker.postMessage({ "action": "getPackaging" });
                worker.postMessage({ "action": "getCustomers" })
                worker.postMessage({ "action": "getSuppliers" })
            } else {
                alert("Failed to setup database");
            }
            break;
        case "packaging":
            messageBox.innerHTML = "Loading Packaging"
            // console.log(data.packages)
            createTable('#packagingTable', data.packages)
            break;

        case "productOrderData":
            messageBox.innerHTML = "Loading Inventory"
            const orders = data.orders;
            // using the order volumes.  
            // It means products with no orders will not be in the table though
            const vol = orderVolumes(orders)

            const products = data.products.map(p => {
                p.quantityOrdered = vol[p.products_id] ? vol[p.products_id].quantityOrdered : 0
                return p;
            })

            createTable('#inventoryTable', Array.from(products))
            overlay.classList.add("hidden");
            break;
        case "customers":
            messageBox.innerHTML = "Loading Customers";
            const customers = data.customers;
            // debugger
            createTable('#customersTable', customers)
            break;
        case "suppliers":
            messageBox.innerHTML = "Loading Suppliers";
            const suppliers = data.suppliers;
            // debugger
            createTable('#suppliersTable', suppliers)
        default:
            console.log(data, "<< could be unhandled data.. ");

    }

}