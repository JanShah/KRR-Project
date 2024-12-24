function parseCSV(csvString) {
    const rows = [];
    let lines = csvString.split("\r\n");
    if(lines.length===1) {
        lines = csvString.split("\n");
    }
    const regex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;

    lines.forEach(line => {
        const row = [];
        let match;
        while ((match = regex.exec(line))) {
            row.push(match[1] || match[2]); // Use the quoted value if available, otherwise the unquoted value
        }
        rows.push(row);
    });

    return rows;
}