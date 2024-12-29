import variance from './variance.js';

function getBayesFormTimeHorizon() {
    const form = document.forms.parameters;

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

function runAdviserModule(worker) {
    const form = document.forms.parameters;
    if (!form.dataset.listening) {
        form.dataset.listening = true
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            worker.postMessage({
                "action": "getFilteredPurchases", data: {
                    query: {
                        supplier: "B001",
                        noOfDays: getBayesFormTimeHorizon(),
                        postBack: "adviserModule",
                    }
                }
            });
        });
    }

    console.log("Adviser Module Started");
}

function demandForecast(olderOrders, currentOrders, predictionHorizon = 12) {
    const futureDemandForecast = {};
    const combined = { ...olderOrders, ...currentOrders };
    let averageDemand = calculateAverageWeeklyDemand(olderOrders);
    let variances = calculateVariance(olderOrders, averageDemand);
    const alpha = 1.3; // Variance tuning
    const minVariance = 0;
    const varianceFloor = 0;

    // Process observed data
    Object.keys(combined).forEach(key => {
        const currentObservation = combined[key]; // New observation for the current week
        const posteriorMeans = {};
        const posteriorVariances = {};
        const actualOrders = {};

        Object.keys(currentObservation).forEach(code => {
            // Prior information 
            if (!variances[code]) {
                averageDemand[code] = 0; // Default mean
                variances[code] = 1;     // Default variance
            }

            const noise = Math.random() * 0.1; // Small random noise
            const mu_prior = averageDemand[code];
            const sigma_prior = Math.max(Math.sqrt(variances[code]) + noise, minVariance);
            const observedDemand = currentObservation[code];
            const sigma_observed = Math.max(Math.sqrt(observedDemand) + noise, minVariance);

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
    for (let week = 1; week <= predictionHorizon; week++) {
        const futureWeekKey = `FutureWeek${week}`;
        const posteriorMeans = {};
        const posteriorVariances = {};

        Object.keys(averageDemand).forEach(code => {
            const mu_prior = averageDemand[code];
            const sigma_prior = Math.sqrt(variances[code]);

            // Generate simulated demand for the future week
            const simulatedDemand = Math.max(0, mu_prior + sigma_prior * (Math.random() - 0.5) * 2); // normal distribution
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


function adviserModule({ prior, future, boxes }) {
    const futureDemandForecast = demandForecast(prior, future);
    const boxObject = boxes.reduce((a, c) => {
        a[c.code] = c;
        return a;
    }, {})
    createBayesianChart(futureDemandForecast, boxObject)
    const proposedOrder = proposePurchaseOrder(futureDemandForecast)
    const analysedOrder = analyseProposedOrder(proposedOrder, boxObject)
    console.log(proposedOrder, analysedOrder)
}

function proposePurchaseOrder(demandForecast) {
    const noOfWeeks = Math.floor(getBayesFormTimeHorizon() / 7);
    const keys = Object.keys(demandForecast).sort((a, b) => b - a).slice(0, noOfWeeks);
    const itemOrders = {}
    keys.forEach(key => {
        const itemKeys = Object.keys(demandForecast[key].posteriorMeans)
        itemKeys.forEach(itemKey => {
            if (!itemOrders[itemKey])
                itemOrders[itemKey] = Math.ceil(demandForecast[key].posteriorMeans[itemKey])
            else
                itemOrders[itemKey] += Math.ceil(demandForecast[key].posteriorMeans[itemKey])
        })
    })
    const roundedOrders = Object.keys(itemOrders).map(key => {
        return {
            code: key,
            qty: Math.round(itemOrders[key])
        }
    })
    // This is the maximum that could be ordered to cover the entire period.  
    // It should be under budget and within space constraints. 
    // If it is over, some other algorithm can take over this task.
    console.log(roundedOrders)
    return roundedOrders
}

function analyseProposedOrder(proposedOrders, boxes) {
    const availableBudget = Number(document.getElementById('budget').value) || 500;
    const availableSpace = 450000000000 * 0.10; // 10% of 450m3
    const constrainedOrders = [];
    let totalCost = 0, totalVolume = 0;

    // Calculate total demand volume and budget required
    let totalDemandVolume = 0;
    let totalDemandCost = 0;
    const demandData = proposedOrders.map(order => {
        const item = order.code;
        const quantity = order.qty;
        const itemVolume = boxes[item].packVolume;
        const itemCost = boxes[item]["price breaks"]['price per pack'][0];

        totalDemandVolume += itemVolume * quantity;
        totalDemandCost += itemCost * quantity;

        return { item, quantity, itemVolume, itemCost };
    });

    // Calculate proportional weights based on volume and adjust quantities
    for (const { item, quantity, itemVolume, itemCost } of demandData) {
        let adjustedQuantity = quantity;

        // Proportional allocation based on space
        const spaceWeight = (itemVolume * quantity) / totalDemandVolume;
        const budgetWeight = (itemCost * quantity) / totalDemandCost;

        const proportionalSpace = Math.floor(spaceWeight * availableSpace / itemVolume);
        const proportionalBudget = Math.floor(budgetWeight * availableBudget / itemCost);

        adjustedQuantity = Math.min(adjustedQuantity, proportionalSpace, proportionalBudget);

        // Calculate cost and volume for the adjusted quantity
        const costForOrder = itemCost * adjustedQuantity;
        const volumeForOrder = itemVolume * adjustedQuantity;

        if (
            totalCost + costForOrder <= availableBudget &&
            totalVolume + volumeForOrder <= availableSpace
        ) {
            constrainedOrders.push({ item, quantity: adjustedQuantity });
            totalCost += costForOrder;
            totalVolume += volumeForOrder;
        } else {
            // Further reduce quantity to fit within constraints
            const maxAffordableQuantity = Math.floor((availableBudget - totalCost) / itemCost);
            const maxSpaceQuantity = Math.floor((availableSpace - totalVolume) / itemVolume);
            const maxQuantity = Math.min(adjustedQuantity, maxAffordableQuantity, maxSpaceQuantity);

            if (maxQuantity > 0) {
                constrainedOrders.push({ item, quantity: maxQuantity });
                totalCost += itemCost * maxQuantity;
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

        const priceBreakIndex = priceBreaks['quantities'].indexOf(pb);
        const itemCost = priceBreaks['price per pack'][priceBreakIndex];
        const itemVolume = boxes[item].packVolume;

        const savingsPerPack = (maxUnitCost - itemCost).toFixed(2);
        const spacePercentage = ((itemVolume * quantity * 100) / availableSpace).toFixed(2);
        const proposed = proposedOrders.find(o => o.code === item)

        return {
            Item: item,
            "Qty": quantity,
            "Original Suggested Quantity:": proposed.qty || 0,
            "Break": pb,
            "Unit Cost": itemCost,
            "Highest Unit Cost": maxUnitCost,
            "Savings": savingsPerPack * quantity,
            "Space %": spacePercentage + "%"
        };
    });

    console.table(orderData);
    return constrainedOrders;
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




export { runAdviserModule, adviserModule };