function naiveBoxCalculation(packages, boxes) {
    const sizes = packages.map(e => {
        if (e)
            e.size = [e.width, e.depth, e.height]
        e.volume = volume(...e.size)
        return e
    });
    //Get the volume of the all the packages, 
    // Select the cheapest. 
    let packVolume = sizes.reduce((a, b) => {
        return a + b.volume
    }, 0);

    const fitting = boxes.sort((a, b) => {
        const pA = a['price breaks']['price per pack'][0] / a.pack
        const pB = b['price breaks']['price per pack'][0] / b.pack
        return pA - pB
    }).filter((item) => {
        //randomise a fitment between 1 and y(10) times the volume. 
        // This is to get more demand variety. The higher the difference, the more varied
        //padded envelopes get extra space
        if (item.type === "padded envelope") {
            return (packVolume / (15 * Math.random())) <= volume(...item.size)
        }
        return (packVolume * (1 + Math.random())) <= volume(...item.size)
    })
    fitting[0].packVolume = packVolume

    fitting[0].boxVolume = volume(...fitting[0].size)
    //this allows for padded materials for fragile goods, and should fit many use cases. 
    //This is outside scope of research for now, so is a given
    return fitting[0]


}
