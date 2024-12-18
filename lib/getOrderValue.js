function getOrderValue(order) {
    const productValues = order.products.map(product => product.sale_price);
    return Number(productValues.reduce((a, b) => a + b, 0).toFixed(2));
}

if (typeof globalThis !== "undefined") {
    if (globalThis.hasOwnProperty("_sharedLogic")) {
        globalThis._sharedLogic.getOrderValue = getOrderValue
    } else
        globalThis._sharedLogic = { getOrderValue };
}
