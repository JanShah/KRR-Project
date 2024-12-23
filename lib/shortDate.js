function shortDate(date) {
    try {
        const dt = new Date(date);
        return dt.toISOString().split('T')[0]
    } catch (e) {
        console.error(e);
    }
}


if (typeof globalThis !== "undefined") {
    if (globalThis.hasOwnProperty("_sharedLogic")) {
        globalThis._sharedLogic.shortDate = shortDate
    } else
        globalThis._sharedLogic = { shortDate };
}