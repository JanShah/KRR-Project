function textToJSON(data) {

    const lines = data instanceof Array ? data : data.split('\r\n');
    const titles = lines[0] instanceof Array ? lines[0] : lines[0].split(',');
    return lines.slice(1, lines.length).map(item => {
        const data = item instanceof Array ? item : item.split(',')
        if (!data[0]) return
        const obj = {}
        data.forEach((element, i) => {
            if (!isNaN(parseFloat(element)) && element.length === (String(parseFloat(element))).length)
                obj[titles[i]] = parseFloat(element)
            else if (element)
                obj[titles[i]] = element
        })
        return obj;
    })
}