class OrderRecord {

    constructor() {
        this.pending = [];
        this.paid = [];
        this.delivered = [];
    }

    push(element, status = "pending") {
        if (this[status]) this[status].push(element);
    }

    concat(elements) {
        if (this['pending']) this['pending'] = this['pending'].concat(elements);
    }

    get length() {
        return Object.keys(this).reduce((acc, cur) => acc + this[cur].length, 0);
    }
}

class SalesRecord extends OrderRecord {
    constructor() {
        super();
        this.cancelled = [];
        this.completed = [];
    }
}