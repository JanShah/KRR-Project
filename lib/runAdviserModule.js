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

function demandForecast(prior, future) {
    const futureDemandForecast = {};
    const combined = { ...prior, ...future };
    let averageDemand = calculateAverageWeeklyDemand(prior);
    let variances = calculateVariance(prior, averageDemand);
    const alpha = 0.4 //variance tuning
    Object.keys(combined).forEach(key => {
        const currentObservation = combined[key]; // New observation for the current week

        // Temporary objects to store posterior means and variances for this week
        const posteriorMeans = {};
        const posteriorVariances = {};
        const actualOrders = {};

        Object.keys(currentObservation).forEach(code => {
            // Prior information 
            if (!variances[code]) {
                averageDemand[code] = 0; // Default mean
                variances[code] = 1;     // Default variance
            }
            const minVariance = 0.1;
            const noise = Math.random() * 0.2;  // Small random noise
            const mu_prior = averageDemand[code];  // Prior mean (average demand)
            // Prior standard deviation (sqrt of variance)
            // const sigma_prior = Math.sqrt(variances[code]); 
            // add some noise
            const sigma_prior = Math.max(Math.sqrt(variances[code]) + noise, minVariance);
            const observedDemand = currentObservation[code];  // Observed demand for the product
            // add some noise
            const sigma_observed = Math.max(Math.sqrt(observedDemand) + noise, minVariance);
            // Bayesian update (Posterior mean and variance)
            const posteriorVariance = 1 / (1 / Math.pow(sigma_prior, 2) + 1 / Math.pow(sigma_observed, 2));
            const posteriorMean = posteriorVariance * (mu_prior / Math.pow(sigma_prior, 2) + observedDemand / Math.pow(sigma_observed, 2));

            // Store the results for this product code
            posteriorMeans[code] = posteriorMean; //forecast demand
            posteriorVariances[code] = posteriorVariance; //uncertainty
            actualOrders[code] = observedDemand //actual demand
        });

        // Store the posterior results for the current week's forecast
        futureDemandForecast[key] = { posteriorMeans, posteriorVariances, actualOrders };

        // Update priors for the next observation (posterior from this week becomes prior for next week)
        // Instead of overwriting, update individual values in averageDemand and variances
        Object.keys(posteriorMeans).forEach(code => {
            // Update each product's prior mean and variance with the posterior values
            averageDemand[code] = posteriorMeans[code]; // Set the prior mean to the posterior mean
            const varianceFloor = 0.4;
            variances[code] = Math.max((1 - alpha) * variances[code] + alpha * posteriorVariances[code], varianceFloor);
        });
    });

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
    analyseProposedOrder(proposedOrder, boxObject)
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
    const availableBudget = Number(document.getElementById('budget').value) || 800;
    const availableSpace = 450000000000 * .05; //5% of 450m3
    const constrainedOrders = [];
    let totalCost = 0, totalVolume = 0;
    for (const order of proposedOrders) {
        const item = order.code;
        let quantity = order.qty;
        let pb = boxes[item]["price breaks"]['quantities'].find(q => {
            return Math.abs(q - quantity) < 3 || q > quantity
        });
        if (!pb) pb = boxes[item]["price breaks"]['quantities'][4]
        const priceBreakIndex = boxes[item]["price breaks"]['quantities'].indexOf(pb);

        const itemCost = boxes[item]["price breaks"]['price per pack'][priceBreakIndex];
        const itemVolume = boxes[item].packVolume;
        const priceBreaks = boxes[item]["price breaks"]['price per pack'].map((price, index) => {
            return {
                quantity: boxes[item]["price breaks"]['quantities'][index],
                cost: price
            }
        });

        // Check if increasing to the next price break is feasible
        for (const priceBreak of priceBreaks) {
            if (priceBreak.quantity > quantity) {
                const additionalQuantity = priceBreak.quantity - quantity;

                const additionalCost = additionalQuantity * priceBreak.cost;
                const additionalVolume = additionalQuantity * itemVolume;

                // Check if the price break fits within constraints
                if (
                    totalCost + additionalCost <= availableBudget &&
                    totalVolume + additionalVolume <= availableSpace &&
                    additionalQuantity < 5
                ) {
                    quantity = priceBreak.quantity;
                    break; // Use the next price break and exit the loop
                }
            }
        }

        // Calculate total cost and volume for the adjusted quantity
        const costForOrder = itemCost * quantity;
        const volumeForOrder = itemVolume * quantity;

        if (
            totalCost + costForOrder <= availableBudget &&
            totalVolume + volumeForOrder <= availableSpace
        ) {
            constrainedOrders.push({ item, quantity });
            totalCost += costForOrder;
            totalVolume += volumeForOrder;
        } else {
            // Adjust quantity to fit within constraints
            const maxAffordableQuantity = Math.floor((availableBudget - totalCost) / itemCost);
            const maxSpaceQuantity = Math.floor((availableSpace - totalVolume) / itemVolume);
            const maxQuantity = Math.min(quantity, maxAffordableQuantity, maxSpaceQuantity);

            if (maxQuantity > 0) {
                constrainedOrders.push({ item, quantity: maxQuantity });
                totalCost += itemCost * maxQuantity;
                totalVolume += itemVolume * maxQuantity;
            }
        }
    }

    console.log("Constrained Orders with Price Breaks:", constrainedOrders);
    console.log("Total Cost:", totalCost);
    console.log("Total Volume:", totalVolume);

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
        debugger
        const value = e.target.innerText;
        const product = JSON.parse(e.target.dataset.product)
        debugger
        const title = `Code: ${product.code}. Type: ${product.type}. Pack Size: ${product.pack} Units. Dimensions: ${product.size.join('x')}`
        const means = weeks.map(week => Math.ceil(futureDemandForecast[week].posteriorMeans[value]));
        const variances = weeks.map(week => futureDemandForecast[week].posteriorVariances[value]);
        const actual = weeks.map(week => futureDemandForecast[week].actualOrders[value]);
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