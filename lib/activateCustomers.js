function activateCustomers(customers, quantity, date, startIndex = 0, randomise = false) {
    const max = randomise ? randInt(Math.floor(quantity / 2), Math.floor(quantity * 1.5)) : quantity;
    let activatedCustomers = customers.slice(0, max);
    customers.splice(0, max);
    activatedCustomers.forEach((customer, index) => {
        customer.ID = index + startIndex; 
        customer.registeredDate = new Date(date);
        customer.weight = rand(0, 1); //higher weight, more likely to spend.
        customer.spendingPower = randInt(20, 1500 * customer.weight);
        customer.active = true

    });
    return activatedCustomers
}
