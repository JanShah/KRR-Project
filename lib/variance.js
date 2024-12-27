export default function variance(data) {
    const mean = Math.mean(data);
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
};

