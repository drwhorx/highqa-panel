const samplize = (m, n) => {
    let arr = [];
    let mass = [];
    let spac = [];
    let w_m = mathjs.max(mathjs.floor(m / (n - m + 1)), 1);
    let g_m1 = mathjs.floor(m / w_m);
    let w_s = mathjs.max(mathjs.floor((n - m) / (m - 1)), 1);
    let g_s1 = mathjs.floor((n - m) / w_s);
    let g_m = mathjs.min(g_m1, g_s1 + 1);
    let g_s = mathjs.min(g_s1, g_m1 - 1);
    for (let i = 0; i < g_m; i++)
        mass.push(w_m);
    for (let i = 0; i < g_s; i++)
        spac.push(w_s);
    let a_m = w_m * g_m;
    if (a_m < m) {
        let r = m - a_m;
        for (let i = 0; i < r; i++) {
            mass[i]++;
            a_m++;
        }
    }
    let a_s = w_s * g_s;
    if (a_s < n - m) {
        let r = n - m - a_s;
        for (let i = 0; i < r; i++) {
            spac[g_s - i - 1]++;
            a_s++;
        }
    }
    let c = 0;
    for (let i = 0; i < g_m; i++) {
        for (let j = 0; j < mass[i]; j++)
            arr.push(c++);
        for (let j = 0; j < spac[i]; j++)
            c++;
    }
    return arr;
}

const sample_qty = (letter, size) => {
    if (!["A", "B", "C", "D", "E"].includes(letter)) return null;
    if (letter == "E") return 1;
    if (letter == "A") return size;
    if (size <= 8) return size;
    let max = [15, 25, 50, 90, 150, 280, 500, 1200, 3200, 10000].find(e => e >= size);
    let table = {
        15: { B: size, C: 8, D: 5 },
        25: { B: 10, C: 8, D: 5 },
        50: { B: 20, C: 8, D: 5 },
        90: { B: 50, C: 13, D: 8 },
        150: { B: 50, C: 13, D: 8 },
        280: { B: 80, C: 20, D: 13 },
        500: { B: 80, C: 20, D: 20 },
        1200: { B: 80, C: 20, D: 20 },
        3200: { B: 100, C: 32, D: 32 },
        10000: { B: 150, C: 32, D: 32 },
    }
    return table[max][letter];
}

const sample_letter = (dim) => {
    let upper = dim.get["UpperTol"];
    let lower = dim.get["LowerTol"];
    let nominal = dim.get["Nominal"];
    let tol = mathjs.round(upper - lower, 7);   
    if (dim.is_gdt()) {
        return upper <= 0.001 ? "A" :
            upper <= 0.003 ? "B" :
            upper <= 0.010 ? "C" : "D";
    }
    if (dim.get["TypeText"] == "Surface Finish") {
        return upper <= 4 ? "A" :
            upper <= 10 ? "B" :
            upper <= 32 ? "C" :
            upper <= 125 ? "D" : "E";
    }
    if (dim.get["TolTypeText"] == "MIN" || dim.get["TolTypeText"] == "MAX") {
        return "D"
    }
    if (dim.get["TypeText"] == "Angular") {
        return tol <= 0.5 ? "C" : "D";
    }
    return tol <= 0.002 ? "A" :
        tol <= 0.004 ? "B" :
        tol <= 0.010 ? "C" : "D";
}