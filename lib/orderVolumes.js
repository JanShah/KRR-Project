export default function orderVolumes(orders) {
    
    return orders.reduce((acc, curr) => {
        curr.items.forEach(item => {
            if (!acc[item.product.code]) {
                acc[item.product.code] = item.product;
                acc[item.product.code].quantityOrdered = 0;
            } else if (acc[item.product.code]) {
                acc[item.product.code].quantityOrdered++;
            }
        })
        return acc;
    }, {})
}