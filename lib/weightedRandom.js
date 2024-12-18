// https://dev.to/jacktt/understanding-the-weighted-random-algorithm-581p
// items must have weight attribute
function weightedRandom(items) {
    const weights = items.map((a) => a.weight)
    const randomWeight = Math.random() * weights.reduce((a, b) => a + b, 0);
    let cursor = 0;
    let index = 0;
    for (let i = 0; i < weights.length; i++) {
        cursor += weights[i];
        if (cursor > randomWeight) {
            index = i;
            break
        }
    }
    return items[index];
}
