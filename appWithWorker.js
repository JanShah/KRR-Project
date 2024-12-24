import messageHandler from "./lib/messageHandler.js";
window.addEventListener("DOMContentLoaded", start);

async function start() {
    const dbWorker = new Worker("sw.js");
    dbWorker.onmessage = (event) => {
        messageHandler(dbWorker, event.data)
    };
    document.getElementById('orderGenSettings').addEventListener('submit', function (e) {
        e.preventDefault();
        const startDate = e.target.startDateInput.value
        const endDate = e.target.endDateInput.value
        const startingBudget = e.target.startingBudgetInput.value
        document.getElementById("message").innerText = "Restarting..."
        overlay.classList.remove('hidden')
        setTimeout(()=>{
            dbWorker.postMessage({
                action: "regen", data: {
                    startDate, endDate, startingBudget
                }
            })
        },500)

    })
}

window.addEventListener('hashchange', e => {
    document.title = window.location.hash.slice(1);
    window.scrollTo(0,0);
});
