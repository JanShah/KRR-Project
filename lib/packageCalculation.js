function packageCalculation(packages, boxes, split=false) {

    //Get the volume of the all the packages, 
    // Select the cheapest. 
    const packVolume = packages.reduce((acc, item) => {
        return acc + (item.product.volume * item.units)
    }, 0)
    let parts = [];
    if(split) {
        
    }

   let fitting = boxes.sort((a, b) => {
        const pA = a['price breaks']['price per pack'][0] / a.pack
        const pB = b['price breaks']['price per pack'][0] / b.pack
        return pA - pB
    })
    fitting = fitting.filter((item) => {
        //randomise a fitment between half and five times the volume. 
        // This is to get more demand variety. The higher the difference, the more varied
        return packVolume <= volume(...item.size)
    })
    //return the original object so inventory can be tracked 
    const fit = fitting[0]
    if(!fit) debugger
    // console.log(fitting)
    if (!fit.packVolume) {
        fit.packVolume = packVolume
    }
    if (!fit.boxVolume) {
        fit.boxVolume = volume(...fit.size)
    }
    //this allows for padded materials for fragile goods, and should fit many use cases. 
    //This is outside scope of research for now, so is a given
    return fit


}