/**
 * Asynchronously fetch data from the server.
 * @param {String} fileName The filename relative to the current folder.
 * @param {String} format the format (defaults to  json)
 * @returns 
 */
async function fetchData(fileName, format = 'json') {
    return await fetch(fileName).then(async data => await data[format]());
}
