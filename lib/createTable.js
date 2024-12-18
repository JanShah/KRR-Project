export default async function createTable(target, dataset) {


    if (dataset[1] instanceof Array) {
        // dataset.splice(0, 1);
        debugger
    }
    else if (dataset[1] instanceof Object) {
        debugger
        if(!Object.keys(dataset[0]).length) debugger
        // dataset.splice(0, 1);
        dataset = dataset.map(item => {
            if (item instanceof Array) return item
            else if (item instanceof Object)
            return Object.keys(item).map(key => {
                return item[key]

            })
        }).filter(item=>item!==undefined);

    }
    let table = new DataTable(target, {
        responsive: true, 

    });
    table.rows.add(dataset).draw();

}
