export default function orderVolumes(orders) {
    
    return orders.reduce((acc, curr) => {
        curr.products.forEach(product => {
            if (!acc[product.products_id]) {
                acc[product.products_id] = product;
                acc[product.products_id].quantityOrdered = 0;
            } else if (acc[product.products_id]) {
                acc[product.products_id].quantityOrdered++;
            }
        })
        return acc;
    }, {})
}