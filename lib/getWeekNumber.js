function getWeekNumber(date, year) {
    const d = new Date(date);
    const yearStart = new Date(year, 0, 1);
    const days = Math.floor((d - yearStart) / (24 * 60 * 60 * 1000)) + 1;
    return Math.ceil(days / 7);
}

if (globalThis.hasOwnProperty("_sharedLogic")) {
    globalThis._sharedLogic.getWeekNumber = getWeekNumber
} else
    globalThis._sharedLogic = { getWeekNumber };
