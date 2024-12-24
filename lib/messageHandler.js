import createTable from "./createTable.js";
import "./shortDate.js";

const shortDate = globalThis._sharedLogic.shortDate
// import orderVolumes from "./orderVolumes.js";
import createChartDataFromArray from "./createChartDataFromArray.js";

export default function messageHandler(worker, data) {
    const messageBox = document.getElementById('message');
    switch (data.type) {
        case "settings":
            const settings = data.settings;
            if(!settings) return
            document.getElementById('startDateInput').value = settings.startDate
            document.getElementById('endDateInput').value = settings.endDate
            document.getElementById('startingBudgetInput').value = settings.startingBudget
            break;
        case "message":
            messageBox.innerHTML = data.message;
            break;
        case "summary":
            createSummaryCharts(data.summary)
            break
        case "configured":
            window.location.reload();
        case "starting":
            // console.log("init called");
            messageBox.innerHTML = "Initialising. This takes a while...";
            break;
        case "invoices":
            const invoices = data.invoices.map(i => {
                delete i.products;
                i.supplier = i.supplier.ID !== undefined ? i.supplier.ID : i.supplier.supplier_id
                if (i.purpose === "EXPENSES") i.supplier = "Various"
                const values = [shortDate(i.orderDate), shortDate(i.paidDate), i.invoiceNumber, Number(i.amount).toFixed(2), i.purpose, i.supplier]
                return values;
            })

            createTable("#invoicesTable", invoices)
            worker.postMessage({ action: "getSummary" })
            break;
        case "purchaseOrders":
            const purchaseOrders = data.orders.map(i => {
                delete i.products
                delete i.weight
                i.paymentDate = i.paymentDate ? shortDate(i.paymentDate) : ""
                i.paidDate = i.paidDate ? shortDate(i.paidDate) : ""
                i.date = shortDate(i.date)
                i.supplier = i.supplier.supplier_id
                i.orderValue = Number(i.orderValue).toFixed(2)
                const values = Object.values(i)
                return values
            })
            createTable('#purchasesTable', purchaseOrders)
            break;
        case "products":
            messageBox.innerHTML = "Loading Inventory"
            const products = data.products.map(p => {
                delete p.weight
                p.supplier = p.supplier.supplier_id
                p.added = p.added.toJSON().split("T")[0]
                const arr = Object.values(p);
                return arr
            })

            createTable('#inventoryTable', Array.from(products), worker)
            overlay.classList.add("hidden");
            break;
        case "sales":
            // console.log("orders called")
            messageBox.innerHTML = "Loading Sales Orders"
            const orderData = data.sales;
            if (orderData) {

                createTable('#ordersTable', orderData);
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
                createSalesChart(createChartDataFromArray(orderData, "weekly"), "Weekly")

            }
            break;
        case "setup":
            messageBox.innerHTML = "Initialising. This might take a while..."
            if (data.success) {
                //post message AFTER db setup
                worker.postMessage({ "action": "getOrders" });
                worker.postMessage({ "action": "getSales" });
                worker.postMessage({ "action": "getPackaging" });
                worker.postMessage({ "action": "getCustomers" })
                worker.postMessage({ "action": "getSuppliers" })
                worker.postMessage({ "action": "getProducts" })
                worker.postMessage({ "action": "getInvoices" })
                worker.postMessage({ "action": "getSettings" })
            } else {
                alert("Failed to setup database");
            }
            break;
        case "packaging":
            messageBox.innerHTML = "Loading Packaging"

            const packages = data.boxes.map(box => {
                const dt = [
                    box.code,
                    box.type,
                    box.pack,
                    box.size.join('x'),
                    box.volume,
                ];
                box['price breaks']['price per pack'].forEach((price, index, arr) => {
                    dt.push("£" + price.toFixed(2))
                    if (index == arr.length - 1) {
                        dt.push(box['price breaks']['quantities'][index])
                    }
                })
                dt.push(box.used || 0)
                dt.push(box.quantity)

                return dt


            })
            // console.log(data.packages)
            createTable('#packagingTable', packages)
            break;

        case "customers":
            loadCustomersTable(data.customers, messageBox)
            break;
        case "suppliers":
            messageBox.innerHTML = "Loading Suppliers";
            const allKeys = ['supplier_id', 'name', 'street', 'city', 'postcode', 'lead_time', 'credit_limit', 'credit_time']
            const suppliers = data.suppliers.map(e => {
                return Object.values(e)
            })
            createTable('#suppliersTable', suppliers)
            break;
        case "supplierSummary":
            openSupplierSummaryModal(data.summary)
            break;
        default:
            console.log(data, "<< could be unhandled data.. ");

    }

}

function createSummaryCharts(data) {

    const warehouseVolume = getPeriodicDataAndLabels(data, "warehouseSpaceUsed", 7)
    warehouseVolume.values = warehouseVolume.values.map(v => (v / 7).toFixed(2))
    const packagingVolume = getPeriodicDataAndLabels(data, "packagingSpaceUsed", 7)
    packagingVolume.values = packagingVolume.values.map(v => (v / 7).toFixed(2))

    const categories = data.reduce((acc, cur) => {
        const labels = Object.keys(cur.counts.categorySales)
        labels.forEach(label => {
            if (acc[label]) acc[label] += cur.counts.categorySales[label]
            else acc[label] = cur.counts.categorySales[label]
        })
        return acc

    }, {})

    const chartData = {
        labels: Object.keys(categories),
        datasets: [{
            label: 'Category Sales',
            data: Object.keys(categories).map(k => categories[k]),
            backgroundColor: [
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(75, 192, 192)',
                'rgb(255, 205, 86)',
                'rgb(153, 102, 255)'
            ],
            hoverOffset: 7
        }]
    };
    const ctx = document.getElementById("summary1");
    const c = new Chart(ctx, {
        type: "pie",
        data: chartData
    });
    c.draw()
    const monthlySalesOrders = getPeriodicDataAndLabels(data, "salesOrdersShipped", 28)
    const monthlyCancelledOrders = getPeriodicData(getDataColumn(data, "salesCancelled"), 28)
    const salesRevenue = getPeriodicDataAndLabels(data, "salesRevenue", 7)
    const refunds = getPeriodicData(getDataColumn(data, "amountRefunded"), 7)
    const outgoing = getPeriodicData(getDataColumn(data, "paidOut"), 7)
    const newCustomers = getPeriodicDataAndLabels(data, "customersGained", 14)
    const inactiveCustomers = getPeriodicData(getDataColumn(data, "customersLost"), 14)

    createComparisonChart(6, [
        createDataset("New Customers", newCustomers.values, "rgba(75, 192, 192, 0.6)"),
        createDataset("Lost Customers", inactiveCustomers, "rgba(54, 162, 235, 0.6)")
    ], newCustomers.labels, "Customer Registrations", "Count");

    createComparisonChart(2, [
        createDataset("Revenue", salesRevenue.values, "rgba(54, 162, 235, 0.6)"),
        createDataset("Expenditure", outgoing, "rgba(255, 99, 132, 0.6)")
    ], salesRevenue.labels, "Revenue and Expenditure", "Amount (£)");


    createComparisonChart(3, [
        createDataset("Warehouse", warehouseVolume.values, "rgba(54, 162, 235, 0.6)"),
        createDataset("Packaging", packagingVolume.values, "rgba(255, 99, 132, 0.6)")
    ], packagingVolume.labels, "Average warehouse space used", "Amount (%)");

    createComparisonChart(4, [
        createDataset("Shipped", monthlySalesOrders.values, "rgba(54, 162, 235, 0.6)"),
        createDataset("Cancelled", monthlyCancelledOrders, "rgba(255, 99, 132, 0.6)")
    ], monthlySalesOrders.labels, "Shipped Orders", "Count");

    createComparisonChart(5, [
        createDataset("Sales Revenue", salesRevenue.values, "rgba(54, 162, 235, 0.6)"),
        createDataset("Amount Refunded", refunds, "rgba(255, 206, 86, 0.6)")
    ], salesRevenue.labels, "Revenue and Refunds", "Amount (£)");

    function createComparisonChart(id, datasets, labels, title, yLabel) {
        const ctx = document.getElementById(`summary${id}`);
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: title
                    }
                },
                responsive: true,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: yLabel
                        }
                    }
                }
            }
        });
    }
}

function openSupplierSummaryModal(summary) {
    //TODO: supplier summary. not needed but would be nice. 
    modal.showModal()
}

function loadCustomersTable(customers, messageBox) {
    messageBox.innerHTML = "Loading Customers";
    const allKeys = [
        "ID", "registeredDate",
        "Firstname", "Surname",
        "Street", "Town", "City",
        "County", "Postcode", "ordersPlaced",
        "totalSpent", "lastOrderDate", "active"
    ]
    customers = customers.map(i => {
        const customerInfo = [];
        allKeys.forEach(key => {
            if (key === "active") {
                customerInfo.push(i[key] ? "Active" : "Inactive")
            }
            if (["lastOrderDate", "registeredDate"].includes(key))
                return customerInfo.push(shortDate(i[key]))
            customerInfo.push(i[key] || 0)
        })
        return customerInfo
    })
    createTable('#customersTable', customers)
}
function getPeriodicData(columnData, reduction) {
    return columnData.values.reduce((acc, cur, index) => {
        const localIndex = Math.ceil(index / reduction);
        if (acc[localIndex]) acc[localIndex] += Number(cur)
        else acc[localIndex] = Number(cur)
        return acc
    }, [])
}
function getPeriodicDataLabels(columnData, summedArray, reduction) {
    return summedArray.map((_, i) => columnData.labels[i * reduction]);
}

function getPeriodicDataAndLabels(data, label, reduction) {
    const columnData = getDataColumn(data, label)
    const summedArray = getPeriodicData(columnData, reduction)
    return {
        values: summedArray,
        labels: getPeriodicDataLabels(columnData, summedArray, reduction)
    }
}

function getDataColumn(data, column) {
    return {
        values: data.map(i => i.counts[column]),
        labels: data.map(i => shortDate(i.day))
    };
}

// Helper function to create datasets
function createDataset(label, data, backgroundColor) {
    return {
        label: label,
        data: data,
        backgroundColor: backgroundColor,
        borderWidth: 1
    };
}