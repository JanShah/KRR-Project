function flatVolume(w, h, d) {
    // to get the flat volume: 
    // each flap is half the height of the smallest side.
    // sort the whd . 
    // Take the smallest value to get the total flap height (top and bottom). 
    const [s, m, l] = [w, h, d].sort((a, b) => a - b);
    // x = the second value + the flap height
    // y = the third side +  smallest side. 
    const x = m + s
    const y = l + s
    //multiply, estimating 5mm for the depth of the flat box
    return x * y * 5;
}