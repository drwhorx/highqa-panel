const dx = 0.01;
const dy = 0.01;
const a = -100;
const b = 100;
const n = 2;
const normx = {};
const normy = {};
const norm = (x) => {
    return (1 - mathjs.erf(-x / mathjs.sqrt(2))) / 2
}
for (let x = a; x <= b; x += dx) {
    normx[x] = norm(x);
}
for (let y = a; y <= b; y += dy) {
    normy[y] = norm(y);
}
const d2int = (x) => {
    return 1 - mathjs.pow(1 - normx[x], n) - mathjs.pow(normx[x], n)
}
const d3int = (x, y) => {
    return 1 - mathjs.pow(normy[y], n) - mathjs.pow(1 - normx[x], n) + mathjs.pow(normy[y] - normx[x], n)
}
const d2 = () => {
    let area = 0;
    area += 0.5 * d2int(a);
    for (let x = a + dx; x < b; x += dx) {
        area += d2int(x);
    }
    area += 0.5 * d2int(b);
    return area * dx;
}
const d3 = () => {
    let area = 0;
    area += 0.5 * d3int(a, a);
    for (let y = a + dy; y < b; y += dy) {
        area += 0.5 * d3int(a, a);
        for (let x = a + dx; x < y; x += dx) {
            area += d3int(x, y);
        }
        area += 0.5 * d3int(y, y);
    }
    area += 0.5 * d3int(b, b);

    return mathjs.sqrt(2 * (area * dx * dy) - mathjs.pow(d2(), 2));
}