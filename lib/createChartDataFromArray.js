import "./basicSummary.js";
const basicSummary  = globalThis._sharedLogic.basicSummary;
import "./getWeekNumber.js";
const getWeekNumber = globalThis._sharedLogic.getWeekNumber;
import  "./getOrderValue.js"
const getOrderValue = globalThis._sharedLogic.getOrderValue;

export default function createChartDataFromArray(orders = [], period = "weekly") {
    const summary = basicSummary(orders, period);
    debugger
    const summaryData = Object.keys(summary).map(key =>
        summary[key].reduce((prev, curr) =>
            prev + getOrderValue(curr)
            , 0)
    )
    const chartData = {
        labels: Object.keys(summary),
        values: summaryData
    }

    return chartData
}