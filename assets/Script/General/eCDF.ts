interface CDF {
    (n: number): number;
    ps: () => number[];
    xs: () => number[];
}

export function eCDF(data: number[]): CDF {
    "use strict";
    var f, sorted: number[], xs: number[], ps: number[], i: number, j: number, l: number, xx: number;
    if (Array.isArray(data) && data.length > 0) {
        sorted = data.slice().sort(function (a, b) {
            return +a - b;
        });
        xs = [];
        ps = [];
        j = 0;
        l = sorted.length;
        xs[0] = sorted[0];
        ps[0] = 1 / l;
        for (i = 1; i < l; ++i) {
            xx = sorted[i];
            if (xx === xs[j]) {
                ps[j] = (1 + i) / l;
            } else {
                j++;
                xs[j] = xx;
                ps[j] = (1 + i) / l;
            }
        }
        f = function (x: number) {
            var left = 0,
                right = xs.length - 1,
                mid: number,
                midval: number;
            if (x < xs[0]) return 0;
            if (x >= xs[xs.length - 1]) return 1;
            while (right - left > 1) {
                mid = Math.floor((left + right) / 2);
                midval = xs[mid];
                if (x > midval) left = mid;
                else if (x < midval) right = mid;
                else if (x === midval) {
                    left = mid;
                    right = mid;
                }
            }
            return ps[left];
        };
        f.xs = function () {
            return xs;
        };
        f.ps = function () {
            return ps;
        };
    } else {
        // missing or zero length data
        f = function () {};
        f.xs = function () {
            return [];
        };
        f.ps = f.xs;
    }
    return f;
}
