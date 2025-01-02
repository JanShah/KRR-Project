let worker;
function getBayesFormTimeHorizon(id = "parameters") {
    const form = document.forms[id];

    const timeHorizon = Number(form.timeHorizon.value) || 6
    form.timeHorizon.value = timeHorizon;

    const period = form.daysWeeksMonths.value;
    let multiplier
    switch (period) {
        case "months":
            multiplier = 28
            form.monthsOption.checked = true;
            break
        case "days":
            multiplier = 1;
            form.daysOption.checked = true;
            break;
        case "weeks":
        default:
            multiplier = 7;
            form.weeksOption.checked = true;
            break

    }
    return timeHorizon * multiplier;
}

function runAdviserModule(localWorker) {
    worker = localWorker;
    const form = document.forms.parameters;
    if (!form.dataset.listening) {
        form.dataset.listening = true
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            worker.postMessage({
                "action": "getFilteredPurchases", data: {
                    query: {
                        supplier: "B001",
                        noOfDays: getBayesFormTimeHorizon("parameters"),
                        postBack: "adviserModule",
                    }
                }
            });
        });
    }

    console.log("Adviser Module Started");
}

function demandForecast(orders, horizon = 12, alpha = 1.4, varianceFloor = 0, randomNoise = 0.1) {

    console.log("WEEKS OF COVER: ", horizon)
    const futureDemandForecast = {};
    let averageDemand = calculateAverageWeeklyDemand(orders);
    let variances = calculateVariance(orders, averageDemand);

    // Process observed data
    Object.keys(orders).forEach(key => {
        const currentObservation = orders[key]; // New observation for the current week
        const posteriorMeans = {};
        const posteriorVariances = {};
        const actualOrders = {};

        Object.keys(currentObservation).forEach(code => {
            // Prior information 
            if (!variances[code]) {
                averageDemand[code] = 0; // Default mean
                variances[code] = 1;     // Default variance
            }

            const noise = Math.random() * (randomNoise); // Small random noise
            const mu_prior = averageDemand[code];
            const sigma_prior = Math.max(Math.sqrt(variances[code]) + noise, varianceFloor);
            const observedDemand = currentObservation[code];
            const sigma_observed = Math.max(Math.sqrt(observedDemand) + noise, varianceFloor);

            // Bayesian update (Posterior mean and variance)
            const posteriorVariance = 1 / (1 / Math.pow(sigma_prior, 2) + 1 / Math.pow(sigma_observed, 2));
            const posteriorMean = posteriorVariance * (mu_prior / Math.pow(sigma_prior, 2) + observedDemand / Math.pow(sigma_observed, 2));

            posteriorMeans[code] = posteriorMean;
            posteriorVariances[code] = posteriorVariance;
            actualOrders[code] = observedDemand;
        });

        futureDemandForecast[key] = { posteriorMeans, posteriorVariances, actualOrders };

        // Update priors
        Object.keys(posteriorMeans).forEach(code => {
            averageDemand[code] = posteriorMeans[code];
            variances[code] = Math.max((1 - alpha) * variances[code] + alpha * posteriorVariances[code], varianceFloor);
        });
    });

    // Forward predictions
    for (let week = 1; week <= Number(horizon); week++) {
        const futureWeekKey = `FutureWeek${week}`;
        const posteriorMeans = {};
        const posteriorVariances = {};

        Object.keys(averageDemand).forEach(code => {
            const mu_prior = averageDemand[code];
            const sigma_prior = Math.sqrt(variances[code]);

            // Generate simulated demand for the future week
            const simulatedDemand = Math.max(0, mu_prior + sigma_prior * (Math.random() - 0.2) * 2); // normal distribution
            posteriorMeans[code] = simulatedDemand;

            // Update variance for forward predictions                                                                      
            posteriorVariances[code] = sigma_prior;

            // Update priors for the next future prediction
            averageDemand[code] = simulatedDemand;
        });

        futureDemandForecast[futureWeekKey] = { posteriorMeans, posteriorVariances };
    }

    return futureDemandForecast;
}


function adviserModule(worker, { prior, boxes }) {
    const predictionHorizon = document.getElementById("weeksOfCover").value || 12
    const variance = Number(document.getElementById("varianceTuning").value) || 1.4
    const minVariance = Number(document.getElementById('varianceFloor')) || 0
    const randomNoise = Number(document.getElementById("randomNoise").value) || 0.1
    const futureDemandForecast = demandForecast(prior, predictionHorizon, variance, minVariance, randomNoise);
    const boxObject = boxes.reduce((a, c) => {
        a[c.code] = c;
        return a;
    }, {})
    createBayesianChart(futureDemandForecast, boxObject)
    debugger
    const noOfWeeks = parseInt(document.getElementById("weeksOfCover").value, 10) || 12;
    const proposedOrder = proposePurchaseOrder(noOfWeeks, futureDemandForecast, boxObject)
    const analysedOrder = analyseProposedOrder(proposedOrder, boxObject)
    analysedOrder.timeHorizon = predictionHorizon
    analysedOrder.variance = variance
    analysedOrder.minVariance = minVariance
    analysedOrder.randomNoise = randomNoise
    analysedOrder.settings = 2;
    worker.postMessage({ action: "pre-order", data: analysedOrder });
    console.log(proposedOrder, analysedOrder)
}

function proposePurchaseOrder(noOfWeeks, demandForecastData, currentBoxes) {

    const predictedWeeks = Object.keys(demandForecastData).filter(o => o.startsWith("Future"))
    const itemTotals = {}; // To store aggregated demand
    const futureOrders = {}; // To store predicted orders for the next weeks
    // Aggregate demand data from all past weeks
    predictedWeeks.forEach(week => {
        const itemKeys = Object.keys(demandForecastData[week].posteriorMeans);
        itemKeys.forEach(itemKey => {
            if (!itemTotals[itemKey]) {
                itemTotals[itemKey] = demandForecastData[week].posteriorMeans[itemKey];
            } else {
                itemTotals[itemKey] += demandForecastData[week].posteriorMeans[itemKey];
            }
        });
    });

    // Calculate average weekly demand for each item
    const averageWeeklyDemand = {};
    Object.keys(itemTotals).forEach(itemKey => {
        averageWeeklyDemand[itemKey] = itemTotals[itemKey] / noOfWeeks;
    });

    // Predict demand for the next `noOfWeeks`
    Object.keys(averageWeeklyDemand).forEach(itemKey => {
        futureOrders[itemKey] = Math.ceil(averageWeeklyDemand[itemKey] * noOfWeeks);
    });
    debugger
    // Prepare the output in the required format
    const roundedOrders = Object.keys(futureOrders).map(key => {
        const box = currentBoxes[key];
        console.log(box)
        const qtyInStock = Math.round(box.quantity / box.pack)
        return {
            code: key,
            qty: Math.round(futureOrders[key] - qtyInStock)
        };
    });

    console.log(roundedOrders);
    return roundedOrders;
}


function analyseProposedOrder(proposedOrders, boxes) {
    const availableBudget = Number(document.getElementById('budget').value) || 500;
    const totalSpace = 450000000000;
    const availableSpace = totalSpace * (Number(document.getElementById("maxSpace").value) / 100 || 0.10); // 10% of 150m3
    const constrainedOrders = [];
    let runningTotal = 0, totalVolume = 0;
    console.log(availableSpace)
    // Calculate total demand volume and budget required
    let totalDemandVolume = 0;
    let totalDemandCost = 0;
    const demandData = proposedOrders.sort((a, b) => a.qty - b.qty).map(order => {
        const item = order.code;
        const quantity = order.qty - Math.round(boxes[item].quantity / boxes[item].pack)
        const itemVolume = boxes[item].packVolume;
        const itemCost = boxes[item]["price breaks"]['price per pack'][0];

        totalDemandVolume += itemVolume * quantity;
        totalDemandCost += itemCost * quantity;

        return { item, quantity, itemVolume, itemCost };
    });


    // Calculate proportional weights based on volume and adjust quantities
    for (const { item, quantity, itemVolume, itemCost } of demandData) {
        let differenceBetweenTotalAndAvailable = totalDemandVolume / availableSpace;
        const differenceBetweenTotalAndAvailableBudget = totalDemandCost / availableBudget;
        const isVolumeOK = differenceBetweenTotalAndAvailable <= 1;
        const isBudgetOK = differenceBetweenTotalAndAvailableBudget <= 1;


        let volumeMultiplier = 1;
        let qtyMultiplier = 1;
        let adjustedQuantity = quantity;
        if (!isVolumeOK) {
            volumeMultiplier = 1 / differenceBetweenTotalAndAvailable
        }
        if (!isBudgetOK) {
            qtyMultiplier = 1 / differenceBetweenTotalAndAvailableBudget
        }
        const oldVolume = itemVolume * adjustedQuantity;
        adjustedQuantity = Math.round(quantity * qtyMultiplier)
        let costForOrder = itemCost * adjustedQuantity

        let volumeForOrder = itemVolume * adjustedQuantity;
        let tries = 5;
        while (volumeForOrder / oldVolume > volumeMultiplier && tries) {
            //need to reduce to meet the space constraints
            adjustedQuantity = Math.round((quantity - (5 - tries)) * volumeMultiplier)
            volumeForOrder = itemVolume * adjustedQuantity
            tries -= 1;
            if (volumeForOrder === oldVolume) { //if nothing is changing, then just decrease by 1
                adjustedQuantity -= 1;
                volumeForOrder = itemVolume * adjustedQuantity
            }

        }
        volumeForOrder = itemVolume * adjustedQuantity
        costForOrder = itemCost * adjustedQuantity
        const originalOrderVolume = itemVolume * quantity
        const originalCost = itemCost * quantity
        const differenceInCost = originalCost - costForOrder
        const differenceInVolume = originalOrderVolume - volumeForOrder;
        totalDemandVolume -= differenceInVolume;
        totalDemandCost -= differenceInCost;


        if (
            runningTotal + costForOrder <= availableBudget &&
            totalVolume + volumeForOrder <= availableSpace &&
            adjustedQuantity > 0
        ) {

            constrainedOrders.push({ item, quantity: adjustedQuantity, aproxCost: itemCost });
            runningTotal += costForOrder;
            totalVolume += volumeForOrder;
        } else {
            // Further reduce quantity to fit within constraints
            const maxAffordableQuantity = Math.floor((availableBudget - runningTotal) / itemCost);
            const maxSpaceQuantity = Math.floor((availableSpace - totalVolume) / itemVolume);
            const maxQuantity = Math.min(adjustedQuantity, maxAffordableQuantity, maxSpaceQuantity);
            if (maxQuantity > 0) {

                constrainedOrders.push({ item, quantity: maxQuantity, aproxCost: itemCost });
                runningTotal += itemCost * maxQuantity;
                totalVolume += itemVolume * maxQuantity;
            }
        }
    }

    console.log("Constrained Orders:", constrainedOrders);

    const orderData = constrainedOrders.map(order => {
        const item = order.item;
        const quantity = order.quantity;

        const priceBreaks = boxes[item]["price breaks"];
        const maxUnitCost = priceBreaks['price per pack'][0];

        // Find the closest price break quantity
        let pb = priceBreaks['quantities'].find(q => Math.abs(q - quantity) < (quantity / 2));
        if (!pb) pb = priceBreaks['quantities'][4];

        let priceBreakIndex = priceBreaks['quantities'].indexOf(pb);
        let itemCost = priceBreaks['price per pack'][priceBreakIndex];
        const itemVolume = boxes[item].packVolume;

        const savingsPerPack = (maxUnitCost - itemCost).toFixed(2);
        const proposed = proposedOrders.find(o => o.code === item);
        // While the proposed quantity is less than the price break quantity, adjust it


        // Total cost and space usage calculation
        runningTotal = itemCost * quantity;
        let totalSpaceUsage = itemVolume * quantity;

        // Apply budget and space constraints
        let adjustedQuantity = quantity;

        // Check if total cost exceeds budget
        if (runningTotal > availableBudget) {
            // Scale down the quantity proportionally based on budget
            adjustedQuantity = Math.floor(availableBudget / itemCost);
            runningTotal = itemCost * adjustedQuantity; // Recalculate total cost after adjustment
        }

        // Check if total space usage exceeds available space
        if (totalSpaceUsage > availableSpace) {
            // Scale down the quantity proportionally based on space
            adjustedQuantity = Math.floor((availableSpace / itemVolume));
            totalSpaceUsage = itemVolume * adjustedQuantity; // Recalculate total space usage after adjustment
        }

        //finally adjust the price breaks for the new quantity
        while (adjustedQuantity < pb) {

            itemCost = priceBreaks['price per pack'][priceBreakIndex - 1];
            pb = priceBreaks['quantities'][priceBreakIndex - 1];
            priceBreakIndex--

        }

        return {
            Item: item,
            "Modelled Suggestion:": proposed.qty,
            "Order Qty": adjustedQuantity,
            "Price Break": pb,
            "Unit Cost": itemCost,
            "Highest Unit Cost": maxUnitCost,
            "Total": runningTotal.toFixed(2),
            "Savings": (savingsPerPack * adjustedQuantity).toFixed(2),
            "Space Used %": ((totalSpaceUsage * 100) / totalSpace).toFixed(2)
        };
    });

    const lastRow = orderData.reduce((acc, cur) => {

        ["Total", "Savings", "Space Used %"].forEach(e => {
            if (cur.hasOwnProperty(e)) {
                if (!acc[e]) acc[e] = Number(cur[e]).toFixed(2)
                else acc[e] = (Number(acc[e]) + Number(cur[e])).toFixed(2);
            }

        });
        return acc

    }, {})
    const tfoot = document.createElement(('tfoot'));
    const row = document.createElement('tr');
    const tdFirst = document.createElement('td')
    tdFirst.colSpan = 6;
    tdFirst.textContent = "Total";
    row.appendChild(tdFirst);

    Object.values(lastRow).forEach(value => {
        const td = document.createElement('td');

        td.textContent = value;
        row.appendChild(td);
    });
    tfoot.appendChild(row);
    debugger
    const table = createTableFromObjectArray(orderData)
    table.append(tfoot)
    console.table(orderData);
    const suggesterOrderSection = document.getElementById("suggestedOrder")
    suggesterOrderSection.innerHTML = "";
    orderData.tableID = "Order Suggestions"
    const heading = document.createElement("h2")
    heading.textContent = "Order Suggestions"
    suggesterOrderSection.appendChild(heading)
    table.id = "suggestedOrderTable";
    suggesterOrderSection.appendChild(table)
    new DataTable("#suggestedOrderTable")
    return constrainedOrders;
}


function createTableFromObjectArray(data) {
    // Ensure that data is an array and it's not empty
    if (!Array.isArray(data) || data.length === 0) {
        console.error('Invalid data. Expected a non-empty array.');
        return;
    }

    // Create the table element
    const table = document.createElement('table');
    const legend = document.createElement('legend')
    legend.innerHTML = data.tableID
    table.appendChild(legend)
    // Create the table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Extract the keys from the first object in the array to create table headers
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');

        th.textContent = key.charAt(0).toUpperCase() + key.slice(1); // Capitalize first letter
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create the table body
    const tbody = document.createElement('tbody');

    // Loop through the data to create rows for each object
    data.forEach(item => {
        const row = document.createElement('tr');

        Object.values(item).forEach(value => {
            const td = document.createElement('td');

            td.textContent = value;
            row.appendChild(td);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    return table;
}





function createBayesianChart(futureDemandForecast, boxes) {
    const weeks = Object.keys(futureDemandForecast);
    const products = weeks.reduce((acc, cur) => {
        const labels = Object.keys(futureDemandForecast[cur].posteriorMeans)
        labels.forEach(label => {
            if (!acc.includes(label))
                acc.push(label);
        })
        return acc
    }, []);

    const bayesianChartBtns = document.getElementById('bayesianChartBtns');
    bayesianChartBtns.innerHTML = "";
    products.forEach(product => {
        const btn = document.createElement('button');
        btn.id = product + "Btn";
        btn.dataset.product = JSON.stringify(boxes[product])
        btn.innerText = product;
        btn.addEventListener('click', showChart);
        bayesianChartBtns.appendChild(btn)

    })
    function showChart(e) {
        const skipped = (ctx, value) => ctx.p0.skip || ctx.p1.skip ? value : undefined;
        const down = (ctx, value) => ctx.p0.parsed.y > ctx.p1.parsed.y ? value : undefined;
        Object.keys(Chart.instances).forEach(id => {
            if (Chart.instances[id].canvas.id === "forecastChart") Chart.instances[id].destroy()
        })
        const value = e.target.innerText;
        const product = JSON.parse(e.target.dataset.product)
        const title = `Code: ${product.code}. Type: ${product.type}. Pack Size: ${product.pack} Units. Dimensions: ${product.size.join('x')}`
        const means = weeks.map(week => Math.ceil(futureDemandForecast[week].posteriorMeans[value]));
        const variances = weeks.map(week => futureDemandForecast[week].posteriorVariances[value]);
        const actual = weeks.map(week => futureDemandForecast[week].actualOrders ? futureDemandForecast[week].actualOrders[value] : null);
        const chartData = {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Forecast Demand',
                    data: means,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                    tension: 0.01,
                    segment: {
                        borderColor: ctx => skipped(ctx, 'rgb(0,0,0,0.2)') || down(ctx, 'rgb(192,192,75)'),
                        borderDash: ctx => skipped(ctx, [6, 6]),
                    },
                    spanGaps: true
                },
                {
                    label: 'Uncertainty',
                    data: variances,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(100, 200, 132, 0.2)',
                    fill: true,
                    tension: 0.1,
                    segment: {
                        borderColor: ctx => skipped(ctx, 'rgb(0,0,0,0.2)') || down(ctx, 'rgb(255,75,75)'),
                        borderDash: ctx => skipped(ctx, [6, 6]),
                    },
                    spanGaps: true
                },
                {
                    label: 'Actual Demand',
                    data: actual,
                    borderColor: 'rgb(104, 99, 255)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                    tension: 0.1,
                    segment: {
                        borderColor: ctx => skipped(ctx, 'rgb(0,0,0,0.2)') || down(ctx, 'rgb(104,75,255)'),
                        borderDash: ctx => skipped(ctx, [6, 6]),
                    },
                    spanGaps: true
                }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        text: "Demand Chart for " + title,
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: "Packs"
                        },
                    },
                    x: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: "Week Number"
                        },
                    }


                }
            }
        }
        new Chart(document.getElementById("forecastChart"), chartData);
    }

}


function calculateAverageWeeklyDemand(data) {
    const totals = {};
    const weekCounts = {};

    for (const week in data) {
        const weekData = data[week];
        for (const [productCode, demand] of Object.entries(weekData)) {
            if (!totals[productCode]) {
                totals[productCode] = 0;
                weekCounts[productCode] = 0;
            }
            totals[productCode] += demand;
            weekCounts[productCode] += 1;
        }
    }

    const averages = {};
    for (const productCode in totals) {
        averages[productCode] = totals[productCode] / weekCounts[productCode];
    }

    return averages;
};


const calculateVariance = (data, averages) => {
    const variances = {};
    const weekCounts = {};
    for (const productCode in averages) {
        variances[productCode] = 0;
        weekCounts[productCode] = 0;
    }

    for (const week in data) {
        const weekData = data[week];
        for (const [productCode, demand] of Object.entries(weekData)) {
            if (averages[productCode] !== undefined) {
                const diff = demand - averages[productCode];
                variances[productCode] += diff ** 2;
                weekCounts[productCode] += 1;
            }
        }
    }

    for (const productCode in variances) {
        if (weekCounts[productCode] > 0) {
            variances[productCode] /= weekCounts[productCode];
        }
    }

    return variances;
};




if (typeof globalThis !== "undefined") {
    if (globalThis.hasOwnProperty("_sharedLogic")) {
        globalThis._sharedLogic.runAdviserModule = runAdviserModule
        globalThis._sharedLogic.adviserModule = adviserModule
    } else
        globalThis._sharedLogic = { runAdviserModule, adviserModule };
}
