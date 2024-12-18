function getSkewedSelection(products, count) {
    const selection = [];
    const totalProducts = products.length;

    for (let i = 0; i < count; i++) {
        let randomIndex;
        const rc = rand(0,4);

        if (rc === 0) {
            randomIndex = rand(0, totalProducts - 1);
        } else if (rc === 1) {
            randomIndex = rand(Math.floor(totalProducts * 0.6), Math.floor(totalProducts * 0.7));
        } else if (rc === 2) {
            randomIndex = rand(Math.floor(totalProducts * 0.4), Math.floor(totalProducts * 0.6));
        } else {
            // 85% chance for the cheapest 50%
            randomIndex = rand(0, Math.floor(totalProducts * 0.5));
        }

        selection.push(products[randomIndex]);
    }

    return selection;
}