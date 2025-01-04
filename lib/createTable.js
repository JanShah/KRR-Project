export default async function createTable(target, dataset, worker) {
    let localTarget = target;
    let table = new DataTable(target, {
        responsive: true,
        retrieve: true
        // 
    });
    table.rows.add(dataset).draw();

    $(target).on('click', 'tbody tr td', (e) => {
        console.log(e.target.innerText, window.location.hash)
        const value = e.target.innerText;
        var data = table.row(this).data();

        switch (window.location.hash) {
            case "#inventory":
                handleInventoryClick(data, value, worker)
                break;
        }

    })
}

function handleInventoryClick(data, value, worker) {
    const clickable = [1, 2, 9];
    const clickedIndex = data.indexOf(value);
    if (clickable.includes(clickedIndex)) {
        console.log("index", clickedIndex);
        switch (clickedIndex) {
            case 1:
                worker.postMessage({ "action": "getSupplier", supplier: value });
                break;
            case 2:
                break;
            case 3:
                break
            default:
                break;
        }
    }
}
