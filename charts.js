let chart;
function createSalesChart(data, period) {
    if(chart) {
        chart.destroy();
    }
    const ctx = document.getElementById('myChart');
    const labels = data.labels;
    const values = data.values;
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Value of ${period} Sales`,
                data: values,
                borderWidth: 1,
                tension: 0.3
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

}