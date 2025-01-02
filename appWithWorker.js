import messageHandler from "./lib/messageHandler.js";
window.addEventListener("DOMContentLoaded", start);
import "./lib/getWorkAction.js";
const getWorkAction = globalThis._sharedLogic.getWorkAction
let dbWorker
async function start() {
    dbWorker = new Worker("sw.js");
    dbWorker.onmessage = (event) => {
        messageHandler(dbWorker, event.data)
    };
    document.getElementById('orderGenSettings').addEventListener('submit', function (e) {
        e.preventDefault();

        const startDate = e.target.startDateInput.value
        const endDate = e.target.endDateInput.value
        const startingBudget = e.target.startingBudgetInput.value
        const packagingLeadTime = e.target.packagingLeadTimeInput.value
        const useAdviser = e.target.useLastAdviser.checked
        document.getElementById("message").innerText = "Restarting..."
        overlay.classList.remove('hidden')
        setTimeout(() => {
            dbWorker.postMessage({
                action: "regen", data: {
                    startDate, endDate, startingBudget, packagingLeadTime, useAdviser
                }
            })
        }, 500)

    });
}

window.addEventListener('hashchange', e => {
    const page = window.location.hash.slice(1);
    const workerAction = getWorkAction();
    if (workerAction)
        dbWorker.postMessage({ action: workerAction })
    document.title = "Order Manager - " + page;
    window.scrollTo(0, 0);
});

document.getElementById('openMenu').addEventListener('change', (e) => {
    const marginLeft = e.target.checked ? "251px" : "0px";
    document.getElementsByTagName('main')[0].style.marginLeft = marginLeft
})
