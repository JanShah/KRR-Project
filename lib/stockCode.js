function stockCode(supplierID, categoryID, index) {
    return [supplierID].concat(...[categoryID, index]).join("")
}
