import messageHandler from "./lib/messageHandler.js";
window.addEventListener("DOMContentLoaded", start);

async function start() {
    const dbWorker = new Worker("sw.js");
    dbWorker.onmessage = (event) => {
        messageHandler(dbWorker, event.data)
    };
}






