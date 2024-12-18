// in https://www.ukpackaging.com/single-wall-brown-cardboard-boxes for example, execute the code to get the JSON
// works for 2 or 3d packaging.

const contentArr = Array.from(document.getElementById('super-product-table').tBodies[0].children)
const nodes = contentArr.map(tr => {
    const node = {};
    Array.from(tr.children).forEach((td, index) => {
        if (index === 0) {
            node.code = td.children[0].innerText
            node['price breaks'] = {
                quantities: [1, 2, 5, 10],
                'price per pack': []
            };
        }
        if (index == 1) {
            node.size = td.innerText.split('x').map(x => Number(x))
            if(node.size.length===2) node.size.push(10)
        }
        if (index === 5) {
            node.pack = Number(td.innerText)
        }
        if (index === 6) {
            node['price breaks']['quantities'].push(Number(td.innerText))
        }
        if (index === 7) {
            node['price breaks']['price per pack'].push(Number(td.innerText.split('£')[1]))
        }
        if (index === 8) {
            node['price breaks']['price per pack'].push(Number(td.innerText.split('£')[1]))
        }
        if (index === 9) {
            node['price breaks']['price per pack'].push(Number(td.innerText.split('£')[1]))
        }
        if (index === 10) {
            node['price breaks']['price per pack'].push(Number(td.innerText.split('£')[1]))
        }
        if (index === 11) {
            node['price breaks']['price per pack'].push(Number(td.innerText.split('£')[1]))
        }
    })
    return node
})