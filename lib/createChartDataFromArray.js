import "./basicSummary.js";
const basicSummary  = globalThis._sharedLogic.basicSummary;
import "./getWeekNumber.js";
const getWeekNumber = globalThis._sharedLogic.getWeekNumber;

export default function createChartDataFromArray(orders = [], period = "weekly") {
    const summary = basicSummary(orders, period);
    const keys = Object.keys(summary).sort((a,b)=>a-b);
    const summaryData = keys.map(key =>
        summary[key].reduce((prev, curr) =>
            prev + curr[4]
            , 0)
    )
    const chartData = {
        labels: keys,
        values: summaryData
    }

    return chartData
}