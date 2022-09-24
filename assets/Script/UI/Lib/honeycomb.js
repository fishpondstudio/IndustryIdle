(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined"
        ? factory(exports)
        : typeof define === "function" && define.amd
        ? define(["exports"], factory)
        : ((global = global || self), factory((global.Honeycomb = {})));
})(this, function (exports) {
    "use strict";

    var commonjsGlobal =
        typeof globalThis !== "undefined"
            ? globalThis
            : typeof window !== "undefined"
            ? window
            : typeof global !== "undefined"
            ? global
            : typeof self !== "undefined"
            ? self
            : {};

    function createCommonjsModule(fn, module) {
        return (module = { exports: {} }), fn(module, module.exports), module.exports;
    }

    var axis = createCommonjsModule(function (module, exports) {
        /*! axis.js v1.2.1 | (c) 2016 @toddmotto | https://github.com/toddmotto/axis */
        (function (root, factory) {
            {
                module.exports = factory();
            }
        })(commonjsGlobal, function () {
            var axis = {};

            var types = "Array Object String Date RegExp Function Boolean Number Null Undefined".split(" ");

            function type() {
                return Object.prototype.toString.call(this).slice(8, -1);
            }

            for (var i = types.length; i--; ) {
                axis["is" + types[i]] = (function (self) {
                    return function (elem) {
                        return type.call(elem) === self;
                    };
                })(types[i]);
            }

            return axis;
        });
    });
    var axis_1 = axis.isObject;
    var axis_2 = axis.isNumber;
    var axis_3 = axis.isArray;
    var axis_4 = axis.isString;

    /**
     * @private
     *
     * @param   {number} offset     The amount to offset (usually -1 or +1).
     * @param   {number} distance   The distance from 0 in a dimension (x, y or q, r).
     *
     * @returns {number}            The amount to offset in the dimension opposite of the passed `distance`.
     */

    function offsetFromZero(offset, distance) {
        return (distance + offset * (distance & 1)) >> 1;
    }
    /**
     * @private
     *
     * @param   {number} dividend   The amount to get the remainder from after division.
     * @param   {number} divisor    The amount to divide by.
     *
     * @returns {number}            `dividend % divisor`, except negative dividends "count back from 0".
     */

    function signedModulo(dividend, divisor) {
        return ((dividend % divisor) + divisor) % divisor;
    }
    /**
     * @private
     *
     * @param   {string} value              A cardinal/ordinal compass point.
     * @param   {(pointy|flat)} orientation A hex orientation.
     *
     * @returns {(0|1|2|3|4|5)}             The number direction in the range 0..5.
     */

    function compassToNumberDirection(value, orientation) {
        if (!/^(N|S)?(E|W)?$/i.test(value)) {
            throw new Error("Invalid compass direction: ".concat(value, ". Choose from E, SE, S, SW, W, NW, N or NE."));
        }

        orientation = orientation.toLowerCase();
        value = value.toUpperCase();

        if (orientation === "pointy" && ["N", "S"].includes(value)) {
            throw new Error(
                "Direction "
                    .concat(value, " is ambiguous for pointy hexes. Did you mean ")
                    .concat(value, "E or ")
                    .concat(value, "W?")
            );
        }

        if (orientation === "flat" && ["E", "W"].includes(value)) {
            throw new Error(
                "Direction "
                    .concat(value, " is ambiguous for flat hexes. Did you mean N")
                    .concat(value, " or S")
                    .concat(value, "?")
            );
        }
        /**
         * There's an (approximate) compass direction for each side of a hex. The right side of a pointy hex has the east (`'E'`) compass direction.
         * The bottom right side the southeast (`'SE'`) direction, etc. This also means that pointy hexes don't have a north and south compass direction
         * and flat hexes don't have a west and east compass direction.
         *
         * Number directions map to a side of a hex. A pointy hex's right side is `0`, its bottom right side `1`, its bottom left side `2`, etc.
         * Number directions of flat hexes start at their bottom right side (`0`), their bottom side is `1`, etc.
         *
         * @typedef {string} COMPASS_DIRECTION
         *
         * @readonly
         * @enum {COMPASS_DIRECTION}
         *
         * @property {COMPASS_DIRECTION} E  → east
         * @property {COMPASS_DIRECTION} SE ↘ southeast
         * @property {COMPASS_DIRECTION} S  ↓ south
         * @property {COMPASS_DIRECTION} SW ↙ southwest
         * @property {COMPASS_DIRECTION} W  ← west
         * @property {COMPASS_DIRECTION} NW ↖ northwest
         * @property {COMPASS_DIRECTION} N  ↑ north
         * @property {COMPASS_DIRECTION} NE ↗ northeast
         */

        return {
            pointy: {
                E: 0,
                SE: 1,
                SW: 2,
                W: 3,
                NW: 4,
                NE: 5,
            },
            flat: {
                SE: 0,
                S: 1,
                SW: 2,
                NW: 3,
                N: 4,
                NE: 5,
            },
        }[orientation][value];
    }
    function ensureXY(x, y) {
        if (!axis_2(x) && !axis_2(y)) {
            x = y = 0;
        } else if (!axis_2(x)) {
            x = y;
        } else if (!axis_2(y)) {
            y = x;
        }

        return {
            x,
            y,
        };
    }
    function normalizeRadiuses(size, isPointy) {
        if (axis_1(size)) {
            if (axis_2(size.xRadius) && axis_2(size.yRadius)) {
                return size;
            }

            const { width, height } = size;

            if (axis_2(width) && axis_2(height)) {
                return isPointy
                    ? {
                          xRadius: width / Math.sqrt(3),
                          yRadius: height / 2,
                      }
                    : {
                          xRadius: width / 2,
                          yRadius: height / Math.sqrt(3),
                      };
            }
        }

        if (axis_2(size)) {
            return {
                xRadius: size,
                yRadius: size,
            };
        }

        throw new Error(
            "Invalid size: ".concat(size, ". Set it as a number or as an object containing width and height.")
        );
    }

    /**
     * How rows/columns of hexes are placed relative to each other.
     *
     * An even offset:
     * * places **even rows** of **pointy hexes** half a hex right of the odd rows;
     * * places **even columns** of **flat hexes** half a hex down of the odd rows;
     *
     * An odd offset:
     * * places **odd rows** of **pointy hexes** half a hex right of the even rows;
     * * places **odd columns** of **flat hexes** half a hex down of the even rows;
     *
     * @name OFFSET
     *
     * @see {@link https://www.redblobgames.com/grids/hexagons/#coordinates-offset|redblobgames.com}
     *
     * @readonly
     * @enum {number}
     *
     * @property {number} even  +1
     * @property {number} odd   -1
     */
    const DIRECTION_COORDINATES = [
        {
            q: 1,
            r: 0,
            s: -1,
        },
        {
            q: 0,
            r: 1,
            s: -1,
        },
        {
            q: -1,
            r: 1,
            s: 0,
        },
        {
            q: -1,
            r: 0,
            s: 1,
        },
        {
            q: 0,
            r: -1,
            s: 1,
        },
        {
            q: 1,
            r: -1,
            s: 0,
        },
    ];
    const DIAGONAL_DIRECTION_COORDINATES = [
        {
            q: 2,
            r: -1,
            s: -1,
        },
        {
            q: 1,
            r: 1,
            s: -2,
        },
        {
            q: -1,
            r: 2,
            s: -1,
        },
        {
            q: -2,
            r: 1,
            s: 1,
        },
        {
            q: -1,
            r: -1,
            s: 2,
        },
        {
            q: 1,
            r: -2,
            s: 1,
        },
    ];
    const EPSILON = {
        q: 1e-6,
        r: 1e-6,
        s: -2e-6,
    };

    /**
     * Get a hex from a grid.
     *
     * @memberof Grid#
     * @instance
     *
     * @param {(number|point)} keyOrPoint   An index/key or a point.
     * @returns {hex}                       The found hex or `undefined`.
     *
     * @example
     * const Grid = Honeycomb.defineGrid()
     * const Hex = Grid.Hex
     * const grid = Grid.rectangle({ width: 2, height: 2 })
     *
     * grid.get(0)              // { x: 0, y: 0 }
     * grid.get(Hex(0, 1))      // { x: 0, y: 1 }
     * grid.get({ x: 0, y: 1 }) // { x: 0, y: 1 }
     * grid.get([0, 1])         // { x: 0, y: 1 }
     *
     * grid.get(42)             // undefined
     * grid.get(Hex(6, -2))     // undefined
     */

    function get(keyOrPoint) {
        if (axis_2(keyOrPoint)) {
            return this[keyOrPoint];
        } else {
            console.warn("You are calling Honeycomb.get which is very slow!");
            return this[this.indexOf(keyOrPoint)];
        }
    }
    function setFactory({ isValidHex }) {
        /**
         * Replace a hex with another hex. This is a safe alternative to using bracket notation (`grid[0] = 'invalid'`).
         *
         * If the target hex isn't present in the grid, the new hex is added (using {@link Grid#push}) to the grid.
         * If the new hex is invalid, nothing changes.
         *
         * @memberof Grid#
         * @instance
         *
         * @param {(number|point)} keyOrPoint   The coordinates of the hex that must be replaced.
         * @param {hex} newHex                  The replacing hex.
         *
         * @returns {grid}                      Itself.
         *
         * @example
         * const Grid = Honeycomb.defineGrid()
         * const Hex = Grid.Hex
         * const grid = Grid(Hex(0, 0)) // [ { x: 0, y: 0 } ]
         *
         * // replace a hex:
         * grid.set(0, Hex(1, 1))
         * grid                         // [ { x: 1, y: 1 } ]
         * // the target hex can also be a point:
         * grid.set([1, 1], Hex(2, 2))
         * grid                         // [ { x: 2, y: 2 } ]
         *
         * // invalid replace values are ignored:
         * grid.set(0, 'invalid')
         * grid                         // [ { x: 2, y: 2 } ]
         *
         * // when the target hex isn't present in the grid, the replacing hex is added instead:
         * grid.set({ x: 9, y: 9 }, Hex(3, 3))
         * grid                         // [ { x: 2, y: 2 }, { x: 3, y: 3 } ]
         */
        return function set(keyOrPoint, newHex) {
            if (!isValidHex(newHex)) {
                return this;
            }

            const index = axis_2(keyOrPoint) ? keyOrPoint : this.indexOf(keyOrPoint);

            if (index < 0) {
                this.push(newHex);
            } else {
                this[index] = newHex;
            }

            return this;
        };
    }
    /**
     * @memberof Grid#
     * @see {@link https://www.redblobgames.com/grids/hexagons/#line-drawing|redblobgames.com}
     *
     * @param {hex} firstHex    The first hex.
     * @param {hex} lastHex     The last hex.
     *
     * @returns {hex[]}         Array (not a {@link grid}) of hexes in a straight line from `firstHex` to (and including) `lastHex`.
     *
     * @example
     * const Grid = Honeycomb.defineGrid()
     * const Hex = Grid.Hex
     * const grid = Grid.rectangle({ width: 4, height: 4 })
     *
     * grid.hexesBetween(Hex(), Hex(3)) // [
     *                                  //    { x: 0, y: 0 },
     *                                  //    { x: 0, y: 1 },
     *                                  //    { x: 1, y: 1 },
     *                                  //    { x: 2, y: 2 },
     *                                  //    { x: 3, y: 2 },
     *                                  //    { x: 3, y: 3 },
     *                                  // ]
     */

    function hexesBetween(firstHex, lastHex) {
        const distance = firstHex.distance(lastHex);
        const step = 1.0 / Math.max(distance, 1);
        let hexes = [];

        for (let i = 0; i <= distance; i++) {
            const hex = firstHex
                .nudge()
                .lerp(lastHex.nudge(), step * i)
                .round();
            hexes.push(this.get(hex));
        }

        return hexes;
    }
    function hexesInRangeFactory({ isValidHex }) {
        /**
         * @memberof Grid#
         * @instance
         * @see {@link https://www.redblobgames.com/grids/hexagons/#range-coordinate|redblobgames.com}
         *
         * @param {hex} centerHex                   A hex to get surrounding hexes from.
         * @param {number} [range=0]                The range (in hexes) surrounding the center hex.
         * @param {boolean} [includeCenterHex=true] Whether to include the center hex in the result
         *
         * @returns {hex[]}             An array with all hexes surrounding the passed center hex.
         *                              Only hexes that are present in the grid are returned.
         *
         * @throws {Error} When no valid hex is passed.
         *
         * @example
         * const Hex = Honeycomb.extendHex({ orientation: 'pointy' })
         * const Grid = Honeycomb.defineGrid(Hex)
         * const grid = Grid.rectangle({ width: 5, height: 5 })
         *
         * grid.hexesInRange(Hex(2, 2), 2)          // [
         *                                          //    { x: 0, y: 2 },
         *                                          //    { x: 0, y: 3 },
         *                                          //    { x: 1, y: 4 },
         *                                          //    ...
         *                                          //    { x: 3, y: 0 },
         *                                          //    { x: 3, y: 1 },
         *                                          //    { x: 4, y: 2 }
         *                                          // ]
         *
         * // only returns hexes that exist in the grid:
         * grid.hexesInRange(Hex(0, 0), 1)          // [
         *                                          //    { x: 0, y: 0 },
         *                                          //    { x: 0, y: 1 },
         *                                          //    { x: 1, y: 0 }
         *                                          // ]
         *
         * // exclude center hex:
         * grid.hexesInRange(Hex(2, 2), 1, false)   // [
         *                                          //    { x: 1, y: 2 },
         *                                          //    { x: 1, y: 3 },
         *                                          //    { x: 1, y: 1 },
         *                                          //    { x: 2, y: 3 },
         *                                          //    { x: 3, y: 2 }
         *                                          // ]
         */
        return function hexesInRange(centerHex, range = 0, includeCenterHex = true) {
            if (!isValidHex(centerHex)) {
                throw new Error("Invalid center hex: ".concat(centerHex, "."));
            }

            if (!this.get(centerHex)) {
                throw new Error("Center hex with coordinates ".concat(centerHex, " not present in grid."));
            }

            let hexes = [];

            for (let q = -range; q <= range; q++) {
                for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
                    const hex = this.get(
                        centerHex.cubeToCartesian({
                            q: centerHex.q + q,
                            r: centerHex.r + r,
                        })
                    );

                    if (centerHex.equals(hex) && !includeCenterHex) {
                        continue;
                    }

                    hexes.push(hex);
                }
            }

            return hexes.filter(Boolean);
        };
    }
    function neighborsOfFactory({ isValidHex, signedModulo, compassToNumberDirection }) {
        /**
         * @memberof Grid#
         * @instance
         * @see {@link https://www.redblobgames.com/grids/hexagons/#neighbors|redblobgames.com}
         *
         * @param {hex} hex
         * A hex to get 1 or more neighbors from.
         * @param {((COMPASS_DIRECTION|number)[]|COMPASS_DIRECTION|number|all)} [directions=all]
         * 1 or more directions. Either (an array of) {@link COMPASS_DIRECTION|compass directions} or numbers or the string `'all'`.
         * @param {boolean} [diagonal=false]
         * Whether to get the diagonal neighbor. See {@link https://www.redblobgames.com/grids/hexagons/#neighbors-diagonal|redblobgames.com}.
         *
         * @returns {hex[]}
         * An array with the neighboring hex for each queried direction or `undefined` if the hex doesn't exist in the grid.
         *
         * @throws {Error} When no valid hex is passed.
         * @throws {Error} When the direction is invalid for the hex.
         *
         * @example
         * const Hex = Honeycomb.extendHex({ orientation: 'pointy' })
         * const Grid = Honeycomb.defineGrid(Hex)
         * // conveniently creates a grid consisting of a hex surrounded by 6 hexes:
         * const grid = Grid.hexagon({ radius: 1 })
         *
         * // all neighbors:
         * grid.neighborsOf(Hex())          // [
         *                                  //    { x: 1, y: 0 },
         *                                  //    { x: 0, y: 1 },
         *                                  //    { x: -1, y: 1 },
         *                                  //    { x: -1, y: 0 },
         *                                  //    { x: -1, y: -1 },
         *                                  //    { x: 0, y: -1 },
         *                                  // ]
         * // specific neighbor:
         * grid.neighborsOf(Hex(), 'NW')    // [{ x: -1, y: -1 }]
         * grid.neighborsOf(Hex(), 4)       // [{ x: -1, y: -1 }]
         *
         * // multiple neighbors:
         * grid.neighborsOf(Hex(), ['SE', 'SW'])    // [
         *                                          //    { x: 0, y: 1 },
         *                                          //    { x: -1, y: 1 }
         *                                          // ]
         *
         * grid.neighborsOf(Hex(), [1, 2])          // [
         *                                          //    { x: 0, y: 1 },
         *                                          //    { x: -1, y: 1 }
         *                                          // ]
         * // diagonal neighbor:
         * grid.neighborsOf(Hex(-1, 0), 'E', true)  // [{ x: 0, y: -1 }]
         *
         * // returns undefined for hexes that aren't present in the grid:
         * grid.neighborsOf(Hex(-1, -1), 'NW')      // [undefined]
         */
        return function neighborsOf(hex, directions = "all", diagonal = false) {
            if (!isValidHex(hex)) {
                throw new Error("Invalid hex: ".concat(hex, "."));
            }

            const coordinates = diagonal ? DIAGONAL_DIRECTION_COORDINATES : DIRECTION_COORDINATES;

            if (directions === "all") {
                directions = [0, 1, 2, 3, 4, 5];
            }

            return (directions = [] // ensure directions is an array
                .concat(directions)
                .map((direction) => {
                    // todo: move this to a util, also grid/statics.js#277
                    if (axis_4(direction)) {
                        direction = compassToNumberDirection(direction, hex.orientation);
                    }

                    if (direction < 0 || direction > 5) {
                        direction = signedModulo(direction, 6);
                    }

                    const { q, r } = coordinates[direction];
                    return hex.cubeToCartesian({
                        q: hex.q + q,
                        r: hex.r + r,
                    });
                }));
        };
    }
    /**
     * @memberof Grid#
     * @instance
     *
     * @returns {number}    The width of the grid in points/pixels.
     */

    function pointWidth() {
        if (this.length === 0) {
            return 0;
        } // sort hexes from left to right and take the first and last

        const { 0: mostLeft, length, [length - 1]: mostRight } = this[0].isPointy()
            ? [...this].sort((a, b) => b.s - a.s || a.q - b.q)
            : [...this].sort((a, b) => a.q - b.q);
        return mostRight.toPoint().x - mostLeft.toPoint().x + this[0].width();
    }
    /**
     * @memberof Grid#
     * @instance
     *
     * @returns {number}    The heigth of the grid in points/pixels.
     */

    function pointHeight() {
        if (this.length === 0) {
            return 0;
        } // sort hexes from top to bottom and take the first and last

        const { 0: mostUp, length, [length - 1]: mostDown } = this[0].isPointy()
            ? [...this].sort((a, b) => a.r - b.r)
            : [...this].sort((a, b) => b.s - a.s || a.r - b.r);
        return mostDown.toPoint().y - mostUp.toPoint().y + this[0].height();
    }

    function pointToHexFactory({ Hex }) {
        /**
         * Converts the passed {@link point} to a hex. Internally calls {@link Hex#fromPoint}.
         *
         * @memberof Grid
         * @static
         * @method
         * @see {@link Hex#fromPoint}
         *
         * @param {(number|number[]|point)} [pointOrX=] The x coordinate or an array with 2 numbers or an object with an `x` and `y` coordinate.
         * @param {number} [pointOrX.x=]                The x coordinate.
         * @param {number} [pointOrX.y=]                The y coordinate.
         * @param {number} [y=]                         The y coordinate.
         *
         * @returns {hex}                               A hex (with rounded coordinates) that contains the passed point.
         *
         * @example
         * const Hex = Honeycomb.extendHex({ size: 50 })
         * const Grid = Honeycomb.defineGrid(Hex)
         * const Point = Honeycomb.Point
         *
         * Grid.pointToHex(Point(120, 280))     // { x: 0, y: 3 }
         * Grid.pointToHex(120, 280)            // { x: 0, y: 3 }
         * Grid.pointToHex({ x: 120, y: 280 })  // { x: 0, y: 3 }
         * Grid.pointToHex([ 120, 280 ])        // { x: 0, y: 3 }
         */
        return function pointToHex(pointOrX, y) {
            return Hex().fromPoint(pointOrX, y);
        };
    }
    function parallelogramFactory({ Grid, Hex }) {
        /**
         * Creates a grid in the shape of a [parallelogram](https://en.wikipedia.org/wiki/Parallelogram) ▱.
         *
         * @memberof Grid
         * @static
         * @method
         * @see {@link https://www.redblobgames.com/grids/hexagons/implementation.html#map-shapes|redblobgames.com}
         *
         * @todo Validate params
         * @todo Move duplicate code to util
         *
         * @param {Object} options                      An options object.
         * @param {number} options.width                The width (in hexes).
         * @param {number} options.height               The height (in hexes).
         * @param {hex} [options.start=Hex(0)]          The start hex.
         * @param {(1|3|5)} [options.direction=1]       The direction (from the start hex) in which to create the shape.
         *                                              Each direction corresponds to a different arrangement of hexes.
         * @param {onCreate} [options.onCreate=no-op]   Callback that's called for each hex. Defaults to a {@link https://en.wikipedia.org/wiki/NOP|no-op}.
         *
         * @returns {grid}                              Grid of hexes in a parallelogram arrangement.
         */
        return function parallelogram({
            width,
            height,
            start,
            direction = 1,

            /**
             * Callback of a {@link Grid} shape method.
             * Gets called for each hex that's about to be added to the grid.
             *
             * @callback onCreate
             * @param {hex} hex     The freshly created hex, just before it's added to the grid.
             * @param {grid} grid   The grid (for as far as it's created).
             * @returns {void}      Nothing.
             */
            onCreate = () => {},
        }) {
            start = Hex(start); // TODO: validate direction

            const DIRECTIONS = {
                1: ["q", "r", "s"],
                3: ["r", "s", "q"],
                5: ["s", "q", "r"],
            };
            const [firstCoordinate, secondCoordinate, thirdCoordinate] = DIRECTIONS[direction];
            const grid = new Grid();
            grid.width = width;
            grid.height = height;
            grid.start = start;
            grid.direction = direction;

            for (let first = 0; first < width; first++) {
                for (let second = 0; second < height; second++) {
                    const hex = Hex({
                        [firstCoordinate]: first + start[firstCoordinate],
                        [secondCoordinate]: second + start[secondCoordinate],
                        [thirdCoordinate]: -first - second + start[thirdCoordinate],
                    });
                    onCreate(hex, grid);
                    grid.push(hex);
                }
            }

            return grid;
        };
    }
    function triangleFactory({ Grid, Hex }) {
        /**
         * Creates a grid in the shape of a [(equilateral) triangle](https://en.wikipedia.org/wiki/Equilateral_triangle) △.
         *
         * @memberof Grid
         * @static
         * @method
         * @see {@link https://www.redblobgames.com/grids/hexagons/implementation.html#map-shapes|redblobgames.com}
         *
         * @todo Validate params
         * @todo Move duplicate code to util
         *
         * @param {Object} options                      An options object.
         * @param {number} options.size                 The side length (in hexes).
         * @param {hex} [options.start=Hex(0)]          The start hex. **Note**: it's not the first hex, but rather a hex relative to the triangle.
         * @param {(1|5)} [options.direction=1]         The direction in which to create the shape. Each direction corresponds to a different arrangement of hexes. In this case a triangle pointing up (`direction: 1`) or down (`direction: 5`) (with pointy hexes) or right (`direction: 1`) or left (`direction: 5`) (with flat hexes).
         *                                              Each direction corresponds to a different arrangement of hexes.
         * @param {onCreate} [options.onCreate=no-op]   Callback that's called for each hex. Defaults to a {@link https://en.wikipedia.org/wiki/NOP|no-op}.
         *
         * @returns {grid}                              Grid of hexes in a triangle arrangement.
         */
        return function triangle({ size, start, direction = 1, onCreate = () => {} }) {
            start = Hex(start); // TODO: validate direction

            const DIRECTIONS = {
                1: {
                    rStart: () => 0,
                    rEnd: (q) => size - q,
                },
                5: {
                    rStart: (q) => size - q,
                    rEnd: () => size + 1,
                },
            };
            const { rStart, rEnd } = DIRECTIONS[direction];
            const grid = new Grid();
            grid.size = size;
            grid.start = start;
            grid.direction = direction;

            for (let q = 0; q < size; q++) {
                for (let r = rStart(q); r < rEnd(q); r++) {
                    const hex = Hex({
                        q: q + start.q,
                        r: r + start.r,
                        s: -q - r + start.s,
                    });
                    onCreate(hex, grid);
                    grid.push(hex);
                }
            }

            return grid;
        };
    }
    function hexagonFactory({ Grid, Hex }) {
        /**
         * Creates a grid in the shape of a [hexagon](https://en.wikipedia.org/wiki/Hexagon) ⬡.
         *
         * @memberof Grid
         * @static
         * @method
         * @see {@link https://www.redblobgames.com/grids/hexagons/implementation.html#map-shapes|redblobgames.com}
         *
         * @todo Validate params
         * @todo Move duplicate code to util
         *
         * @param {Object} options                      An options object.
         * @param {number} options.radius               The radius (in hexes) *excluding* the center hex.
         * @param {hex} [options.center=Hex(0)]         The center hex.
         * @param {onCreate} [options.onCreate=no-op]   Callback that's called for each hex. Defaults to a {@link https://en.wikipedia.org/wiki/NOP|no-op}.
         *
         * @returns {grid}                              Grid of hexes in a hexagon arrangement.
         */
        return function hexagon({ radius, center, onCreate = () => {} }) {
            center = Hex(center);
            const grid = new Grid();
            grid.radius = radius;
            grid.center = center;

            for (let q = -radius; q <= radius; q++) {
                const startR = Math.max(-radius, -q - radius);
                const endR = Math.min(radius, -q + radius);

                for (let r = startR; r <= endR; r++) {
                    const hex = Hex({
                        q: q + center.q,
                        r: r + center.r,
                        s: -q - r + center.s,
                    });
                    onCreate(hex, grid);
                    grid.push(hex);
                }
            }

            return grid;
        };
    }
    function rectangleFactory({ Grid, Hex, compassToNumberDirection, signedModulo }) {
        /**
         * Creates a grid in the shape of a [rectangle](https://en.wikipedia.org/wiki/Rectangle) ▭.
         *
         * @memberof Grid
         * @static
         * @method
         * @see {@link https://www.redblobgames.com/grids/hexagons/implementation.html#map-shapes|redblobgames.com}
         *
         * @todo Validate params
         * @todo Move duplicate code to util
         *
         * @param {Object} options                      An options object.
         * @param {number} options.width                The width (in hexes).
         * @param {number} options.height               The height (in hexes).
         * @param {hex} [options.start=Hex(0)]          The start hex.
         * @param {(COMPASS_DIRECTION|number)} [options.direction=E|S]
         * The direction (from the start hex) in which to create the shape.
         * Defaults to `0` (`E`) for pointy hexes and `1` (`S`) for flat hexes.
         * Each direction corresponds to a different arrangement of hexes.
         * @param {onCreate} [options.onCreate=no-op]   Callback that's called for each hex. Defaults to a {@link https://en.wikipedia.org/wiki/NOP|no-op}.
         *
         * @returns {grid}                              Grid of hexes in a rectangular arrangement.
         */
        return function rectangle({
            width,
            height,
            start,
            direction = Hex().isPointy() ? 0 : 1,
            // E or S
            onCreate = () => {},
        }) {
            start = Hex(start);

            if (axis_4(direction)) {
                direction = compassToNumberDirection(direction, start.orientation);
            }

            if (direction < 0 || direction > 5) {
                direction = signedModulo(direction, 6);
            }

            const DIRECTIONS = [
                ["q", "r", "s"],
                ["r", "q", "s"],
                ["r", "s", "q"],
                ["s", "r", "q"],
                ["s", "q", "r"],
                ["q", "s", "r"],
            ];
            const [firstCoordinate, secondCoordinate, thirdCoordinate] = DIRECTIONS[direction];
            const [firstStop, secondStop] = start.isPointy() ? [width, height] : [height, width];
            const grid = new Grid();
            grid.width = width;
            grid.height = height;
            grid.start = start;
            grid.direction = direction;

            for (let second = 0; second < secondStop; second++) {
                const secondOffset = offsetFromZero(start.offset, second);

                for (let first = -secondOffset; first < firstStop - secondOffset; first++) {
                    const hex = Hex({
                        [firstCoordinate]: first + start[firstCoordinate],
                        [secondCoordinate]: second + start[secondCoordinate],
                        [thirdCoordinate]: -first - second + start[thirdCoordinate],
                    });
                    onCreate(hex, grid);
                    grid.push(hex);
                }
            }

            return grid;
        };
    }
    function ringFactory({ Grid, Hex }) {
        /**
         * Creates a grid in the shape of a ring.
         *
         * @memberof Grid
         * @static
         * @method
         * @see {@link https://www.redblobgames.com/grids/hexagons/#rings|redblobgames.com}
         *
         * @param {Object} options                      An options object.
         * @param {number} options.radius               The radius (in hexes) *excluding* the center hex.
         * @param {hex} [options.center=Hex(0)]         The center hex.
         * @param {onCreate} [options.onCreate=no-op]   Callback that's called for each hex. Defaults to a {@link https://en.wikipedia.org/wiki/NOP|no-op}.
         *
         * @returns {grid}                              Grid of hexes in a ring arrangement.
         */
        return function ring({ radius, center, onCreate = () => {} }) {
            center = Hex(center);
            const grid = new Grid();
            grid.radius = radius;
            grid.center = center;
            const { q, r, s } = center;
            let hex = Hex({
                q,
                r: r - radius,
                s: s + radius,
            });

            for (let i = 0; i < 6; i++) {
                for (let j = 0; j < radius; j++) {
                    onCreate(hex, grid);
                    grid.push(hex);
                    const { q, r, s } = DIRECTION_COORDINATES[i];
                    hex = Hex({
                        q: hex.q + q,
                        r: hex.r + r,
                        s: hex.s + s,
                    });
                }
            }

            return grid;
        };
    }
    function spiralFactory({ Grid, Hex }) {
        /**
         * Creates a grid in the shape of a spiral starting from the center outward.
         * The result is the same as a hexagon, but the order of hexes is different.
         *
         * @memberof Grid
         * @static
         * @method
         * @see {@link https://www.redblobgames.com/grids/hexagons/#rings-spiral|redblobgames.com}
         *
         * @param {Object} options                      An options object.
         * @param {number} options.radius               The radius (in hexes) *excluding* the center hex.
         * @param {hex} [options.center=Hex(0)]         The center hex.
         * @param {onCreate} [options.onCreate=no-op]   Callback that's called for each hex. Defaults to a {@link https://en.wikipedia.org/wiki/NOP|no-op}.
         *
         * @returns {grid}                              Grid of hexes in a spiral arrangement.
         */
        return function spiral({ radius, center, onCreate = () => {} }) {
            center = Hex(center);
            let grid = new Grid();
            onCreate(center, grid);
            grid.push(center);

            for (let i = 1; i <= radius; i++) {
                grid = grid.concat(
                    this.ring({
                        radius: i,
                        center,
                        onCreate,
                    })
                );
            }

            grid.radius = radius;
            grid.center = center;
            return grid;
        };
    }

    function defineGridFactory({ extendHex, Grid, Point }) {
        const { isValidHex } = Grid;
        /**
         * @function defineGrid
         *
         * @memberof Honeycomb
         * @static
         *
         * @description
         * This function can be used to create {@link Grid} factories by passing it a {@link Hex} factory.
         *
         * @param {Hex} [Hex=Honeycomb.extendHex()] A {@link Hex} factory.
         *                                          If nothing is passed, the default Hex factory is used by calling `Honeycomb.extendHex()` internally.
         *
         * @returns {Grid}                          A Grid factory.
         *
         * @example
         * // create a Grid factory that uses the default Hex Factory:
         * const Grid = Honeycomb.defineGrid()
         * const hex = Grid.Hex()
         * hex.size         // { xRadius: 1, yRadius: 1 }
         *
         * // create your own Hex factory
         * const CustomHex = Honeycomb.extendHex({ size: 10, custom: '🤓' })
         * // …and pass it to defineGrid() to create a Grid factory that produces your custom hexes
         * const CustomGrid = Honeycomb.defineGrid(CustomHex)
         * const customHex = CustomGrid.Hex()
         * customHex.size   // { xRadius: 10, yRadius: 10 }
         * customHex.custom // 🤓
         */

        return function defineGrid(Hex = extendHex()) {
            // static properties
            Object.assign(GridFactory, {
                /**
                 * The {@link Hex} factory the Grid factory was created with.
                 * @memberof Grid
                 * @static
                 * @function
                 */
                // don't manually bind `this` to Hex (i.e. `Hex.call`/`Hex.apply`) anywhere in the source
                // it could cause this:
                // function methodThatBindsThis() {
                //     return Hex.call(this, ...) <- `this` refers to `GridFactory`
                // }
                // which is caused by the following line:
                Hex,
                // methods

                /**
                 * @memberof Grid
                 * @static
                 * @method
                 *
                 * @param {*} value     Any value.
                 * @returns {boolean}   Whether the passed value is a valid hex.
                 */
                isValidHex,
                pointToHex: pointToHexFactory({
                    Point,
                    Hex,
                }),
                parallelogram: parallelogramFactory({
                    Grid,
                    Hex,
                }),
                triangle: triangleFactory({
                    Grid,
                    Hex,
                }),
                hexagon: hexagonFactory({
                    Grid,
                    Hex,
                }),
                rectangle: rectangleFactory({
                    Grid,
                    Hex,
                    compassToNumberDirection,
                    signedModulo,
                }),
                ring: ringFactory({
                    Grid,
                    Hex,
                }),
                spiral: spiralFactory({
                    Grid,
                    Hex,
                }),
            }); // prototype properties

            Object.assign(Grid.prototype, {
                // methods
                get: get,
                hexesBetween: hexesBetween,
                hexesInRange: hexesInRangeFactory({
                    isValidHex,
                }),
                neighborsOf: neighborsOfFactory({
                    isValidHex,
                    signedModulo,
                    compassToNumberDirection,
                }),
                pointHeight: pointHeight,
                pointWidth: pointWidth,
                set: setFactory({
                    isValidHex,
                }),
            });
            /**
             * @function Grid
             *
             * @description
             * A function to create hex {@link grid}s and perform various operations on them.
             *
             * A Grid factory has several static methods that return {@link grid}s of hexes in a certain shape.
             * It can also be called with 1 or more points/hexes or an array of points/hexes to create a {@link grid} instance.
             *
             * A {@link grid} extends `Array.prototype`, with some methods overwritten and some new methods added.
             *
             * @param {...point} [points] An array of points/hexes or separate arguments that are points/hexes.
             * @returns {grid}            A grid instance containing only valid hexes.
             *
             * @example
             * const Grid = Honeycomb.defineGrid()
             * // the Hex factory used by the Grid to produce hexes is available as a property
             * const Hex = Grid.Hex
             *
             * Grid(Hex(3, -1), Hex(2, 0))      // [{ x: 3, y: -1 }, { x: 2, y: 0 }]
             * Grid([Hex(3, -1), Hex(2, 0)])    // [{ x: 3, y: -1 }, { x: 2, y: 0 }]
             *
             * // it also accepts points
             * Grid({ x: 3, y: -1 }, [2, 0])    // [{ x: 3, y: -1 }, { x: 2, y: 0 }]
             * Grid([{ x: 3, y: -1 }, [2, 0]])  // [{ x: 3, y: -1 }, { x: 2, y: 0 }]
             *
             * // clone a grid:
             * const grid = Grid(Hex(), Hex(1), Hex(2))
             * const clonedGrid = Grid(grid)      // [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]
             * grid === clonedGrid                // false
             */

            function GridFactory(...points) {
                points = points.filter(Boolean);

                if (axis_3(points[0]) && (points[0].length === 0 || points[0].some((point) => !axis_2(point)))) {
                    points = points[0];
                }
                /**
                 * @typedef {Object} grid
                 * @extends Array
                 *
                 * @property {number} length    Amount of hexes in the grid.
                 */

                return new Grid(...points.map((point) => Hex(point)));
            }

            return GridFactory;
        };
    }

    function addFactory({ Point }) {
        /**
         * @memberof Point#
         * @param {(number|number[]|point)} [pointOrX=] The x coordinate or an array with 2 numbers or an object with an `x` and `y` coordinate.
         * @param {number} [pointOrX.x=]                The x coordinate.
         * @param {number} [pointOrX.y=]                The y coordinate.
         * @param {number} [y=]                         The y coordinate.
         *
         * @returns {point}         The sum of the passed point's coordinates to the current point's.
         */
        return function add(pointOrX, y) {
            let x;
            ({ x, y } = Point(pointOrX, y));
            return Point(this.x + x, this.y + y);
        };
    }
    function subtractFactory({ Point }) {
        /**
         * @memberof Point#
         *
         * @param {(number|number[]|point)} [pointOrX=] The x coordinate or an array with 2 numbers or an object with an `x` and `y` coordinate.
         * @param {number} [pointOrX.x=]                The x coordinate.
         * @param {number} [pointOrX.y=]                The y coordinate.
         * @param {number} [y=]                         The y coordinate.
         *
         * @returns {point}         The difference between the passed point's coordinates and the current point's.
         */
        return function subtract(pointOrX, y) {
            let x;
            ({ x, y } = Point(pointOrX, y));
            return Point(this.x - x, this.y - y);
        };
    }
    function multiplyFactory({ Point }) {
        /**
         * @memberof Point#
         *
         * @param {(number|number[]|point)} [pointOrX=] The x coordinate or an array with 2 numbers or an object with an `x` and `y` coordinate.
         * @param {number} [pointOrX.x=]                The x coordinate.
         * @param {number} [pointOrX.y=]                The y coordinate.
         * @param {number} [y=]                         The y coordinate.
         *
         * @returns {point}         The multiplication of the passed point's coordinates and the current point's.
         */
        return function multiply(pointOrX, y) {
            let x;
            ({ x, y } = Point(pointOrX, y));
            return Point(this.x * x, this.y * y);
        };
    }
    function divideFactory({ Point }) {
        /**
         * @memberof Point#
         *
         * @param {(number|number[]|point)} [pointOrX=] The x coordinate or an array with 2 numbers or an object with an `x` and `y` coordinate.
         * @param {number} [pointOrX.x=]                The x coordinate.
         * @param {number} [pointOrX.y=]                The y coordinate.
         * @param {number} [y=]                         The y coordinate.
         *
         * @returns {point}         The division of the current point's coordinates and the passed point's.
         */
        return function divide(pointOrX, y) {
            let x;
            ({ x, y } = Point(pointOrX, y));
            return Point(this.x / x, this.y / y);
        };
    }

    /**
     * See {@link Point}.
     *
     * @function Point
     * @memberof Honeycomb
     * @static
     */

    function PointFactory({ ensureXY }) {
        const prototype = {
            add: addFactory({
                Point,
            }),
            subtract: subtractFactory({
                Point,
            }),
            multiply: multiplyFactory({
                Point,
            }),
            divide: divideFactory({
                Point,
            }),
        };
        /**
         * Factory function for creating two-dimensional points.
         *
         * @function Point
         *
         * @param {(number|number[]|point)} [pointOrX=] The x coordinate or an array with 2 numbers or an object with an `x` and `y` coordinate.
         * @param {number} [pointOrX.x=]                The x coordinate.
         * @param {number} [pointOrX.y=]                The y coordinate.
         * @param {number} [y=]                         The y coordinate.
         *
         * @returns {point}                             A point.
         *
         * @example
         * const Point = Honeycomb.Point
         *
         * Point()                  // { x: 0, y: 0 }
         * Point(1)                 // { x: 1, y: 1 }
         * Point(1, 2)              // { x: 1, y: 2 }
         *
         * Point([])                // { x: 0, y: 0 }
         * Point([1])               // { x: 1, y: 1 }
         * Point([1, 2])            // { x: 1, y: 2 }
         *
         * Point({})                // { x: 0, y: 0 }
         * Point({ x: 1 })          // { x: 1, y: 1 }
         * Point({ y: 2 })          // { x: 2, y: 2 }
         * Point({ x: 1, y: 2 })    // { x: 1, y: 2 }
         */

        function Point(pointOrX, y) {
            let coordinates;
            /**
             * An object with just an `x` and a `y` property.
             *
             * Create your own:
             * ```javascript
             * const point = { x: 1, y: 2 }
             * ```
             *
             * Or use the included {@link Point} factory:
             * ```javascript
             * const point = Honeycomb.Point(1, 2)
             * ```
             *
             * @typedef {Object} point
             * @property {number} x (horizontal) x coordinate
             * @property {number} y (vertical) y coordinate
             */

            if (axis_2(pointOrX)) {
                coordinates = ensureXY(pointOrX, y);
            } else if (axis_3(pointOrX)) {
                coordinates = ensureXY(...pointOrX);
            } else if (axis_1(pointOrX)) {
                coordinates = ensureXY(pointOrX.x, pointOrX.y);
            } else {
                coordinates = ensureXY(0);
            }

            return Object.assign(Object.create(prototype), coordinates);
        }

        return Point;
    }

    const Point = PointFactory({
        ensureXY,
    });
    /**
     * @private
     *
     * The only way to prevent setting invalid items in a grid (`grid[0] = 'not a hex'`) is by using proxies.
     * A proxy can have a `set` trap that can prevent the setting of invalid hexes.
     *
     * Some approaches include:
     * 1. Wrapping the grid instance returned from GridFactory in a proxy.
     * 2. Putting a proxy in the prototype chain of Grid (this "shields" the Array prototype methods).
     * 3. Using a proxy to forward certain calls to the Array prototype (and not extending Array at all).
     */

    class Grid extends Array {
        /**
         * @private
         * @param {*} value     Any value.
         * @returns {boolean}   Whether the passed value is a valid hex.
         */
        static isValidHex(value) {
            return (value || {}).__isHoneycombHex === true;
        }
        /**
         * @memberof Grid#
         * @override
         * @throws {TypeError}  It makes no sense for a grid to fill it with arbitrary values, because it should only contain valid hexes.
         *
         * @returns {TypeError} An error.
         */

        fill() {
            throw new TypeError("Grid.prototype.fill is not implemented");
        }
        /**
         * Identical to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes|Array#includes},
         * but searches the passed hex (which can also be a {@link point}.
         *
         * @memberof Grid#
         * @override
         *
         * @param {point} point             The coordinates to search for.
         * @param {number} [fromIndex=0]    Optional index to start searching.
         *
         * @returns {boolean}               Whether the hex is included in the grid.
         *
         * @example
         * const Grid = Honeycomb.defineGrid()
         * const Hex = Grid.Hex
         * const grid = Grid(Hex(0))    // [ { x: 0, y: 0 } ]
         *
         * grid.includes(Hex(0))        // true
         * grid.includes([0, 0])        // true
         * grid.includes(Hex(0), 1)     // false
         * grid.includes(Hex(5, 7))     // false
         */

        includes(point, fromIndex = 0) {
            return !!(this.indexOf(point, fromIndex) + 1);
        }
        /**
         * Identical to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf|Array#indexOf},
         * but accepts a {@link point} and internally uses {@link Hex#equals} as a comparator.
         *
         * @memberof Grid#
         * @override
         *
         * @param {point} point             The coordinates to search for.
         * @param {number} [fromIndex=0]    Optional index to start searching.
         *                                  If negative, it is taken as the offset from the end of the grid.
         *
         * @returns {number}                The index of the found hex (first from the left) or -1 if the hex wasn't found.
         *
         * @example
         * const Grid = Honeycomb.defineGrid()
         * const Hex = Grid.Hex
         * const grid = Grid(Hex(0), Hex(1), Hex(0))
         * // [
         * //    { x: 0, y: 0 },
         * //    { x: 1, y: 1 },
         * //    { x: 0, y: 0 }
         * // ]
         *
         * grid.indexOf(Hex(0))     // 0
         * grid.indexOf([0, 0])     // 0
         * grid.indexOf(Hex(0), 1)  // 2
         * grid.indexOf(Hex(5, 7))  // -1
         */

        indexOf(point, fromIndex = 0) {
            const { length } = this;
            let i = Number(fromIndex);
            point = Point(point);
            i = Math.max(i >= 0 ? i : length + i, 0);

            for (i; i < length; i++) {
                if (this[i].equals(point)) {
                    return i;
                }
            }

            return -1;
        }
        /**
         * Identical to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/lastIndexOf|Array#lastIndexOf},
         * but accepts a {@link point} and internally uses {@link Hex#equals} as a comparator.
         *
         * Because all hexes will have different coordinates in most grids, this method behaves the same as {@link Grid#indexOf}.
         * This method might have a slightly better performance if you know the search hex is at the end of the grid.
         *
         * @memberof Grid#
         * @override
         *
         * @param {point} point                 The coordinates to search for.
         * @param {number} [fromIndex=length-1] Optional index to start searching back from.
         *                                      If negative, it is taken as the offset from the end of the grid.
         *
         * @returns {number}                    The last index of the found hex or -1 if the hex wasn't found.
         *
         * @example
         * const Grid = Honeycomb.defineGrid()
         * const Hex = Grid.Hex
         * const grid = Grid(Hex(0), Hex(1), Hex(0))
         * // [
         * //    { x: 0, y: 0 },
         * //    { x: 1, y: 1 },
         * //    { x: 0, y: 0 }
         * // ]
         *
         * grid.lastIndexOf(Hex(0))     // 2
         * grid.lastIndexOf([0, 0])     // 2
         * grid.lastIndexOf(Hex(0), 1)  // 0
         * grid.lastIndexOf(Hex(5, 7))  // -1
         */

        lastIndexOf(point, fromIndex = this.length - 1) {
            const { length } = this;
            let i = Number(fromIndex);
            point = Point(point);
            i = i >= 0 ? Math.min(i, length - 1) : length + i;

            for (i; i >= 0; i--) {
                if (this[i].equals(point)) {
                    return i;
                }
            }

            return -1;
        }
        /**
         * Identical to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push|Array#push},
         * but filters out any passed invalid hexes.
         *
         * @memberof Grid#
         * @override
         *
         * @param {...hex} [hexes]  Hexes to add to the end of the grid. Invalid hexes are ignored.
         *
         * @returns {number}        The new length of the grid.
         *
         * @example
         * const Grid = Honeycomb.defineGrid()
         * const Hex = Grid.Hex
         *
         * const grid = Grid(Hex(0))    // [{ x: 0, y: 0 }]
         * grid.push(Hex(1))            // 2
         * grid                         // [{ x: 0, y: 0 }, { x: 1, y: 1 }]
         *
         * grid.push('invalid')         // 2
         * grid                         // [{ x: 0, y: 0 }, { x: 1, y: 1 }]
         */

        push(...hexes) {
            return super.push(...hexes.filter(Grid.isValidHex));
        }
        /**
         * Identical to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice|Array#splice},
         * but filters out any passed invalid hexes.
         *
         * @memberof Grid#
         * @override
         *
         * @param {number} start                        Index at which to start changing the grid.
         * @param {number} [deleteCount=length-start]   Amount of hexes to delete.
         * @param {...hex} [hexes=[]]                   The hexes to add to the grid, beginning at the `start`.
         *
         * @returns {hex[]}                             A grid with the deleted hexes (if any).
         *
         * @example
         * const Grid = Honeycomb.defineGrid()
         * const Hex = Grid.Hex
         * const grid = Grid.rectangle({ width: 2, height: 1 })
         * // [
         * //    { x: 0, y: 0 },
         * //    { x: 1, y: 0 },
         * //    { x: 0, y: 1 },
         * //    { x: 1, y: 1 }
         * // ]
         *
         * grid.splice(2)               // [{ x: 0, y: 1 }, { x: 1, y: 1 }] <- deleted hexes
         * grid                         // [{ x: 0, y: 0 }, { x: 1, y: 0 }] <- leftover hexes
         *
         * grid.splice(2, 1)            // [{ x: 0, y: 1 }]
         * grid                         // [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]
         *
         * grid.splice(2, 1, Hex(2))    // [{ x: 0, y: 1 }]
         * grid
         * // [
         * //    { x: 0, y: 0 },
         * //    { x: 1, y: 0 },
         * //    { x: 2, y: 2 },
         * //    { x: 1, y: 1 }
         * // ]
         */

        splice(start, deleteCount, ...hexes) {
            // when deleteCount is undefined/null, it's casted to 0, deleting 0 hexes
            // this is not according to spec: it should delete all hexes (starting from `start`)
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
            if (deleteCount == null) {
                return super.splice(start);
            }

            return super.splice(start, deleteCount, ...hexes.filter(Grid.isValidHex));
        }
        /**
         * Identical to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift|Array#unshift},
         * but filters out any passed invalid hexes.
         *
         * @memberof Grid#
         * @override
         *
         * @param {...hex} [hexes]  Hexes to add to the start of the grid. Invalid hexes are ignored.
         *
         * @returns {number}        The new length of the grid.
         *
         * @example
         * const Grid = Honeycomb.defineGrid()
         * const Hex = Grid.Hex
         *
         * const grid = Grid(Hex(0))    // [{ x: 0, y: 0 }]
         * grid.unshift(Hex(1))         // 2
         * grid                         // [{ x: 1, y: 1 }, { x: 0, y: 0 }]
         *
         * grid.unshift('invalid')      // 2
         * grid                         // [{ x: 1, y: 1 }, { x: 0, y: 0 }]
         */

        unshift(...hexes) {
            return super.unshift(...hexes.filter(Grid.isValidHex));
        }
    }

    function _defineProperty(obj, key, value) {
        if (key in obj) {
            Object.defineProperty(obj, key, {
                value: value,
                enumerable: true,
                configurable: true,
                writable: true,
            });
        } else {
            obj[key] = value;
        }

        return obj;
    }

    function ownKeys(object, enumerableOnly) {
        var keys = Object.keys(object);

        if (Object.getOwnPropertySymbols) {
            var symbols = Object.getOwnPropertySymbols(object);
            if (enumerableOnly)
                symbols = symbols.filter(function (sym) {
                    return Object.getOwnPropertyDescriptor(object, sym).enumerable;
                });
            keys.push.apply(keys, symbols);
        }

        return keys;
    }

    function _objectSpread2(target) {
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i] != null ? arguments[i] : {};

            if (i % 2) {
                ownKeys(Object(source), true).forEach(function (key) {
                    _defineProperty(target, key, source[key]);
                });
            } else if (Object.getOwnPropertyDescriptors) {
                Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
            } else {
                ownKeys(Object(source)).forEach(function (key) {
                    Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
                });
            }
        }

        return target;
    }

    function _objectWithoutPropertiesLoose(source, excluded) {
        if (source == null) return {};
        var target = {};
        var sourceKeys = Object.keys(source);
        var key, i;

        for (i = 0; i < sourceKeys.length; i++) {
            key = sourceKeys[i];
            if (excluded.indexOf(key) >= 0) continue;
            target[key] = source[key];
        }

        return target;
    }

    function _objectWithoutProperties(source, excluded) {
        if (source == null) return {};

        var target = _objectWithoutPropertiesLoose(source, excluded);

        var key, i;

        if (Object.getOwnPropertySymbols) {
            var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

            for (i = 0; i < sourceSymbolKeys.length; i++) {
                key = sourceSymbolKeys[i];
                if (excluded.indexOf(key) >= 0) continue;
                if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
                target[key] = source[key];
            }
        }

        return target;
    }

    function setFactory$1({ Hex }) {
        /**
         * @memberof Hex#
         * @instance
         *
         * @param {*} coordinates   Same parameters as the {@link Hex} factory.
         * @returns {hex}           Itself with the passed parameters merged into it.
         *
         * @example
         * const Hex = Honeycomb.extendHex()
         *
         * const hex = Hex({ x: 1, y: 2, a: 3, b: 4 })          // { a: 3, b: 4, x: 1, y: 2 }
         * const updatedHex = hex.set({ x: 0, y: -1, b: 5 })    // { a: 3, b: 5, x: 0, y: -1 }
         * hex === updatedHex                                   // true: hex is updated in-place
         */
        return function set(...args) {
            return Object.assign(this, Hex(...args));
        };
    }
    /**
     * @memberof Hex#
     * @returns {Object}    The hex's cartesian `x` and `y` coordinates.
     *
     * @example
     * const Hex = Honeycomb.extendHex()
     *
     * Hex().coordinates()      // { x: 0, y: 0 }
     * Hex(1, 2).coordinates()  // { x: 1, y: 2 }
     */

    function coordinates() {
        return {
            x: this.x,
            y: this.y,
        };
    }
    /**
     * @memberof Hex#
     * @returns {Object}    The hex's cube `q`, `r` and `s` coordinates.
     *
     * @example
     * const Hex = Honeycomb.extendHex()
     *
     * Hex().cube()     // { q: 0, r: 0, s: 0 }
     * Hex(1, 2).cube() // { q: 0, r: 2, s: -2 }
     */

    function cube() {
        return {
            q: this.q,
            r: this.r,
            s: this.s,
        };
    }
    /**
     * @memberof Hex#
     *
     * @todo make this a static (and instance?) method
     *
     * @param {Object} cubeCoordinates      At least the `q` and `r` cube coordinates.
     * @param {number} cubeCoordinates.q    The `q` cube coordinate.
     * @param {number} cubeCoordinates.r    The `r` cube coordinate.
     * @param {number} [cubeCoordinates.s]  The optional `s` cube coordinate.
     *
     * @returns {Object}                    The hex's cartesian `x` and `y` coordinates.
     *
     * @example
     * const Hex = Honeycomb.extendHex()
     *
     * Hex().cubeToCartesian({ q: 1, r: 2, s: -3 }) // { x: 2, y: 2 }
     * // the `s` coordinate isn't required:
     * Hex().cubeToCartesian({ q: -3, r: 5 })       // { x: -1, y: 5 }
     */

    function cubeToCartesian({ q, r }) {
        let x, y;

        if (this.isPointy()) {
            x = q + offsetFromZero(this.offset, r);
            y = r;
        } else {
            x = q;
            y = r + offsetFromZero(this.offset, q);
        }

        return {
            x,
            y,
        };
    }
    function cartesianToCubeFactory({ Point }) {
        /**
         * @memberof Hex#
         *
         * @todo make this a static (and instance?) method
         *
         * @param {(number|number[]|point)} [pointOrX=] The x coordinate or an array with 2 numbers or an object with an `x` and `y` coordinate.
         * @param {number} [pointOrX.x=]                The x coordinate.
         * @param {number} [pointOrX.y=]                The y coordinate.
         * @param {number} [y=]                         The y coordinate.
         *
         * @returns {Object}    The hex's cube `q`, `r` and `s` coordinates.
         *
         * @example
         * const Hex = Honeycomb.extendHex()
         * const Point = Honeycomb.Point
         *
         * Hex().cartesianToCube(Point(4, -2))      // { q: 5, r: -2, s: -3 }
         * Hex().cartesianToCube(4, -2)             // { q: 5, r: -2, s: -3 }
         * Hex().cartesianToCube({ x: 4, y: -2 })   // { q: 5, r: -2, s: -3 }
         * Hex().cartesianToCube([4, -2])           // { q: 5, r: -2, s: -3 }
         */
        return function cartesianToCube(pointOrX, y) {
            let x, q, r;
            ({ x, y } = Point(pointOrX, y));

            if (this.isPointy()) {
                q = x - offsetFromZero(this.offset, y);
                r = y;
            } else {
                q = x;
                r = y - offsetFromZero(this.offset, x);
            }

            return {
                q,
                r,
                s: -q - r,
            };
        };
    }
    /**
     * @memberof Hex#
     * @returns {boolean}   Whether hexes have a pointy ⬢ orientation.
     */

    function isPointy() {
        return this.orientation.toLowerCase() === "pointy";
    }
    /**
     * @memberof Hex#
     * @returns {boolean}   Whether hexes have a flat ⬣ orientation.
     */

    function isFlat() {
        return this.orientation.toLowerCase() === "flat";
    }
    /**
     * @memberof Hex#
     * @returns {number}    The (horizontal) width of a hex.
     */

    function width() {
        const { xRadius } = this.size;
        return this.isPointy() ? xRadius * Math.sqrt(3) : xRadius * 2;
    }
    /**
     * @memberof Hex#
     * @returns {number}    The (vertical) height of a hex.
     */

    function height() {
        const { yRadius } = this.size;
        return this.isPointy() ? yRadius * 2 : yRadius * Math.sqrt(3);
    }
    function cornersFactory({ Point }) {
        /**
         * @memberof Hex#
         * @instance
         * @returns {point[]}
         * Array of corner points relative to the {@link Hex#origin|hex's origin}.
         * Starting at the top right corner for pointy hexes and the right corner for flat hexes.
         *
         * @example
         * // a hex's origin defaults to its top left corner (as if it's a rectangle)
         * const Hex1 = Honeycomb.extendHex({ size: 30 })
         * Hex1().corners() // [
         *                  //    { x: 51.96152422706631, y: 15 },
         *                  //    { x: 51.96152422706631, y: 45 },
         *                  //    { x: 25.980762113533157, y: 60 },
         *                  //    { x: 0, y: 45 },
         *                  //    { x: 0, y: 15 },
         *                  //    { x: 25.980762113533157, y: 0 }
         *                  // ]
         *
         * // set the origin to a hex's center
         * const Hex2 = Honeycomb.extendHex({ size: 30, origin: [25.980762113533157, 30] })
         * Hex2().corners() // [
         *                  //    { x: 25.980762113533157, y: -15 },
         *                  //    { x: 25.980762113533157, y: 15 },
         *                  //    { x: 0, y: 30 },
         *                  //    { x: -25.980762113533157, y: 15 },
         *                  //    { x: -25.980762113533157, y: -15 },
         *                  //    { x: 0, y: -30 }
         *                  // ]
         */
        return function corners() {
            const width = this.width();
            const height = this.height();
            const { x, y } = this.origin;

            if (this.isPointy()) {
                return [
                    Point(width - x, height * 0.25 - y),
                    Point(width - x, height * 0.75 - y),
                    Point(width * 0.5 - x, height - y),
                    Point(0 - x, height * 0.75 - y),
                    Point(0 - x, height * 0.25 - y),
                    Point(width * 0.5 - x, 0 - y),
                ];
            } else {
                return [
                    Point(width - x, height * 0.5 - y),
                    Point(width * 0.75 - x, height - y),
                    Point(width * 0.25 - x, height - y),
                    Point(0 - x, height * 0.5 - y),
                    Point(width * 0.25 - x, 0 - y),
                    Point(width * 0.75 - x, 0 - y),
                ];
            }
        };
    }
    function centerFactory({ Point }) {
        /**
         * @memberof Hex#
         * @instance
         * @returns {point} Point relative to the {@link Hex#origin|hex's origin}.
         * Note that the default origin is the top left corner, so the default center is
         * `{ x: hexWidth / 2, y: hexHeight / 2 }`.
         *
         * @example
         * const Hex1 = Honeycomb.extendHex({ size: 10 })
         * Hex1().center()  // { x: 8.660254037844386, y: 10 }
         *
         * const Hex2 = Honeycomb.extendHex({ size: 10, origin: [5, 5] })
         * Hex2().center()  // { x: 3.6602540378443855, y: 5 }
         */
        return function center() {
            const { x, y } = this.origin;
            return Point(this.width() / 2 - x, this.height() / 2 - y);
        };
    }
    function toPointFactory({ Point }) {
        /**
         * @memberof Hex#
         * @instance
         * @returns {point} The hex's origin point.
         *
         * @example
         * const Hex = Honeycomb.extendHex({ size: 30 })
         * Hex().toPoint()          // { x: 0, y: 0 }
         * Hex(-2, -5).toPoint()    // { x: -77.94228634059947, y: -225 }
         */
        return function toPoint() {
            const { q, r, size } = this;
            const { xRadius, yRadius } = size;
            let x, y;

            if (this.isPointy()) {
                x = xRadius * Math.sqrt(3) * (q + r / 2);
                y = ((yRadius * 3) / 2) * r;
            } else {
                x = ((xRadius * 3) / 2) * q;
                y = yRadius * Math.sqrt(3) * (r + q / 2);
            }

            return Point(x, y);
        };
    }
    function fromPointFactory({ Point, Hex }) {
        /**
         * Returns a hex from the passed {@link point}.
         *
         * @memberof Hex
         * @instance
         * @see {@link https://www.redblobgames.com/grids/hexagons/#pixel-to-hex|redblobgames.com}
         *
         * @param {(number|number[]|point)} [pointOrX=] The x coordinate or an array with 2 numbers or an object with an `x` and `y` coordinate.
         * @param {number} [pointOrX.x=]                The x coordinate.
         * @param {number} [pointOrX.y=]                The y coordinate.
         * @param {number} [y=]                         The y coordinate.
         *
         * @returns {hex}                               A hex (with rounded coordinates) that contains the passed point.
         *
         * @example
         * const Hex = Honeycomb.extendHex({ size: 50 })
         * const Point = Honeycomb.Point
         * const hex = Hex()
         *
         * hex.fromPoint(Point(120, 280))     // { x: 0, y: 3 }
         * hex.fromPoint(120, 280)            // { x: 0, y: 3 }
         * hex.fromPoint({ x: 120, y: 280 })  // { x: 0, y: 3 }
         * hex.fromPoint([ 120, 280 ])        // { x: 0, y: 3 }
         */
        return function fromPoint(pointOrX, y) {
            const { xRadius, yRadius } = this.size;
            let x, q, r;
            ({ x, y } = Point(pointOrX, y).subtract(this.center())); // inspired by https://github.com/gojuno/hexgrid-py
            // and simplified by https://www.symbolab.com/solver/simplify-calculator/simplify

            if (this.isPointy()) {
                q = (Math.sqrt(3) * x) / (3 * xRadius) - y / (3 * yRadius);
                r = (2 / 3) * (y / yRadius);
            } else {
                q = (2 / 3) * (x / xRadius);
                r = (Math.sqrt(3) * y) / (3 * yRadius) - x / (3 * xRadius);
            }

            return Hex({
                q,
                r,
                s: -q - r,
            }).round();
        };
    }
    function addFactory$1({ Hex, Point }) {
        /**
         * @memberof Hex#
         * @instance
         *
         * @todo Accept any number of hexes to add.
         *
         * @param {point} point The hex (or point) that will be added to the current.
         * @returns {hex}       A *new* hex where the passed hex's coordinates are added to the current.
         *                      Any custom properties are copied.
         */
        return function add(point) {
            const { x, y } = Point(point);
            return Hex(this.x + x, this.y + y, _objectSpread2({}, this));
        };
    }
    function subtractFactory$1({ Hex, Point }) {
        /**
         * @memberof Hex#
         * @instance
         *
         * @todo Accept any number of hexes to subtract.
         *
         * @param {point} point The hex (or point) that will be subtracted from the current.
         * @returns {hex}       A *new* hex where the passed hex's coordinates are subtracted from the current.
         *                      Any custom properties are copied.
         */
        return function subtract(point) {
            const { x, y } = Point(point);
            return Hex(this.x - x, this.y - y, _objectSpread2({}, this));
        };
    }
    function equalsFactory({ Point }) {
        /**
         * @memberof Hex#
         * @instance
         *
         * @param {point} point The hex (or point) whose coordinates will be compared against the current hex.
         * @returns {boolean}   Whether the coordinates of the current and the passed point are equal.
         */
        return function equals(point) {
            if (point != null && (axis_3(point) || (axis_2(point.x) && axis_2(point.y)))) {
                const { x, y } = Point(point);
                return this.x === x && this.y === y;
            }

            return false;
        };
    }
    /**
     * @memberof Hex#
     *
     * @see {@link https://www.redblobgames.com/grids/hexagons/#distances|redblobgames.com}
     *
     * @param   {hex} hex   The last hex (cannot be a {@link point}).
     * @returns {number}    The amount of hexes from the current to (and excluding) the last hex.
     *
     * @example
     * const Hex = Honeycomb.extendHex()
     *
     * Hex().distance(Hex(1, 0))        // 1
     * Hex(-2, -2).distance(Hex(4, 1))  // 8
     */

    function distance(hex) {
        return Math.max(Math.abs(this.q - hex.q), Math.abs(this.r - hex.r), Math.abs(this.s - hex.s));
    }
    function roundFactory({ Hex }) {
        /**
         * Rounds the current floating point hex coordinates to their nearest integer hex coordinates.
         *
         * @memberof Hex#
         * @see {@link https://www.redblobgames.com/grids/hexagons/#rounding|redblobgames.com}
         *
         * @returns {hex}   A *new* hex with rounded coordinates.
         *                  Any custom properties are copied.
         *
         * @example
         * const Hex = Honeycomb.extendHex()
         * Hex(3.1415, 0.5).round() // { x: 3, y: 1 }
         */
        return function round() {
            let { q, r, s } = this;
            let roundedQ = Math.round(q);
            let roundedR = Math.round(r);
            let roundedS = Math.round(s);
            const diffQ = Math.abs(q - roundedQ);
            const diffR = Math.abs(r - roundedR);
            const diffS = Math.abs(s - roundedS);

            if (diffQ > diffR && diffQ > diffS) {
                roundedQ = -roundedR - roundedS;
            } else if (diffR > diffS) {
                roundedR = -roundedQ - roundedS;
            } else {
                roundedS = -roundedQ - roundedR;
            }

            return Hex(
                _objectSpread2(
                    _objectSpread2({}, this),
                    {},
                    {
                        q: roundedQ,
                        r: roundedR,
                        s: roundedS,
                    }
                )
            );
        };
    }
    function lerpFactory({ Hex }) {
        /**
         * Returns an interpolation between the current hex and the passed hex for a `t` between 0 and 1.
         * More info on [wikipedia](https://en.wikipedia.org/wiki/Linear_interpolation).
         *
         * @memberof Hex#
         *
         * @param   {hex} hex   The other hex (cannot be a {@link point}).
         * @param   {number} t  A "parameter" between 0 and 1.
         *
         * @returns {hex}       A new hex (likely with floating point coordinates).
         *                      Any custom properties are copied.
         */
        return function lerp(hex, t) {
            const q = this.q * (1 - t) + hex.q * t;
            const r = this.r * (1 - t) + hex.r * t;
            return Hex(
                _objectSpread2(
                    _objectSpread2({}, this),
                    {},
                    {
                        q,
                        r,
                        s: -q - r,
                    }
                )
            );
        };
    }
    function nudgeFactory({ Hex }) {
        /**
         * @memberof Hex#
         * @see {@link https://www.redblobgames.com/grids/hexagons/#line-drawing|redblobgames.com}
         *
         * @returns {hex}   A *new* hex with a tiny offset from the current hex.
         *                  Useful for interpolating in a consistent direction.
         */
        return function nudge() {
            const { q, r, s } = EPSILON;
            return Hex(
                _objectSpread2(
                    _objectSpread2({}, this),
                    {},
                    {
                        q: this.q + q,
                        r: this.r + r,
                        s: this.s + s,
                    }
                )
            );
        };
    }
    /**
     * @memberof Hex#
     * @returns {string}    A string representation of the hex.
     */

    function toString() {
        return "".concat(this.x, ",").concat(this.y);
    }

    /**
     * Calculates the third cube coordinate from the other two. The sum of all three coordinates must be 0.
     *
     * @memberof Hex
     * @static
     *
     * @param {number} firstCoordinate  The first other cube coordinate.
     * @param {number} secondCoordinate The second other cube coordinate.
     *
     * @returns {number}                The third cube coordinate.
     *
     * @example
     * const Hex = Honeycomb.extendHex()
     * Hex.thirdCoordinate(3, -2)   // -1
     */
    function thirdCoordinate(firstCoordinate, secondCoordinate) {
        return -firstCoordinate - secondCoordinate;
    }

    const staticMethods = {
        thirdCoordinate: thirdCoordinate,
    };
    function extendHexFactory({ ensureXY, normalizeRadiuses, Point }) {
        /**
         * @function extendHex
         *
         * @memberof Honeycomb
         * @static
         *
         * @description
         * This function can be used to create custom hexes by extending the default Hex prototype.
         *
         * All properties of the object passed to `extendHex()` will be added to the prototype of the resulting {@link Hex} factory.
         * To add properties to individual hexes (instances), pass them to the {@link Hex} factory.
         *
         * @todo validate orientation, origin
         * @todo warn when properties are overriden
         *
         * @param {Object} [prototype={}]   An object that's used as the prototype for all hexes in a grid.
         *                                  **Warning:** properties in this object will overwrite properties with the same name in the default prototype.
         *
         * @returns {Hex}                   A function to produce hexes that are all linked to the same prototype.
         *
         * @example
         * const Hex = Honeycomb.extendHex({
         *     size: 50,
         *     orientation: 'flat',
         *     customProperty: `I'm custom 😃`,
         *     customMethod() {
         *         return `${this.customProperty} and called from a custom method 😎`
         *     }
         * })
         * const hex = Hex(5, -1)
         *
         * hex.coordinates()    // { x: 5, y: -1 }
         * // size is normalized to an object containing an x radius and y radius:
         * hex.size             // { xRadius: 50, yRadius: 50 }
         * hex.customProperty   // I'm custom 😃
         * hex.customMethod()   // I'm custom 😃 and called from a custom method 😎
         *
         * // every hex created with Hex() shares these properties:
         * const hex2 = Hex(3, 0)
         * hex2.size            // { xRadius: 50, yRadius: 50 }
         * hex2.customProperty  // I'm custom 😃
         *
         * // to set properties on individual hexes, pass them to Hex():
         * const hex3 = Hex(-2, -1, { instanceProperty: `I'm a unique snowflake 😌` })
         * hex3.instanceProperty    // I'm a unique snowflake 😌
         */
        return function extendHex(prototype = {}) {
            const cartesianToCube = cartesianToCubeFactory({
                Point,
            });
            const defaultPrototype = {
                /**
                 * Used internally for type checking
                 *
                 * @memberof Hex#
                 * @private
                 */
                __isHoneycombHex: true,

                /**
                 * Either ⬢ pointy or ⬣ flat. Defaults to `pointy`.
                 *
                 * @memberof Hex#
                 * @type {string}
                 * @default 'pointy'
                 */
                orientation: "pointy",

                /**
                 * Distance from a hex's top left corner (as if it were a rectange). Defaults to `Point(0)`.
                 * Can be anything the {@link Honeycomb.Point} factory accepts.
                 * When a {@link Hex#toPoint|hex is converted to a point}, it is converted to this origin.
                 *
                 * @memberof Hex#
                 * @type {point}
                 * @default 0
                 */
                origin: 0,

                /**
                 * A hex's size that can be set as:
                 * * an object with `width` and `height`, representing the total width and height of the hex
                 * * an object with `xRadius` and `yRadius`. This can be visualized as if the hex was enclosed in an ellipse.
                 *   `xRadius` would be the distance from the center to the left or right of the ellipse (semi-major axis) and
                 *   `yRadius` would be the distance from the center to the top or bottom of the ellipse (semi-minor axis).
                 * * a number, represening the length of each side and the distance from the center to any corner of the hex
                 *   (which are the same in regular hexagons).
                 *
                 * ![Different ways to set size](docs/hex-sizes.png)
                 *
                 * When setting size with a number the hex will be regular. When setting size with an object it's possible to
                 * "stretch" a hex; having a (very) different width and height.
                 *
                 * Defaults to `{ xRadius: 1, yRadius: 1 }`.
                 *
                 * @memberof Hex#
                 * @type {{width: number, height: number}|{xRadius: number, yRadius: number}|number}
                 * @default { xRadius: 1, yRadius: 1 }
                 */
                size: {
                    xRadius: 1,
                    yRadius: 1,
                },

                /**
                 * Used to calculate the coordinates of rows for pointy hexes and columns for flat hexes.
                 * Defaults to `-1` (odd offset).
                 * See {@link OFFSET} for details.
                 * See {@link https://www.redblobgames.com/grids/hexagons/#coordinates-offset|redblobgames.com} why this is needed.
                 *
                 * @memberof Hex#
                 * @type {number}
                 * @default -1
                 * @see OFFSET
                 */
                offset: -1,

                /**
                 * Getter for `q` cube coordinate. Calls {@link Hex#cartesianToCube} internally.
                 *
                 * @memberof Hex#
                 * @type {number}
                 */
                get q() {
                    return this.cartesianToCube(this).q;
                },

                /**
                 * Getter for `r` cube coordinate. Calls {@link Hex#cartesianToCube} internally.
                 *
                 * @memberof Hex#
                 * @type {number}
                 */
                get r() {
                    return this.cartesianToCube(this).r;
                },

                /**
                 * Getter for `s` cube coordinate. Calls {@link Hex#cartesianToCube} internally.
                 *
                 * @memberof Hex#
                 * @type {number}
                 */
                get s() {
                    return this.cartesianToCube(this).s;
                },

                // methods:
                add: addFactory$1({
                    Hex,
                    Point,
                }),

                /**
                 * Alias for {@link Hex#coordinates}.
                 * @memberof Hex#
                 * @instance
                 */
                cartesian: coordinates,
                cartesianToCube,
                center: centerFactory({
                    Point,
                }),
                coordinates: coordinates,
                corners: cornersFactory({
                    Point,
                }),
                cube: cube,
                cubeToCartesian: cubeToCartesian,
                distance: distance,
                equals: equalsFactory({
                    Point,
                }),
                fromPoint: fromPointFactory({
                    Point,
                    Hex,
                }),
                height: height,
                isFlat: isFlat,
                isPointy: isPointy,
                lerp: lerpFactory({
                    Hex,
                }),
                nudge: nudgeFactory({
                    Hex,
                }),
                round: roundFactory({
                    Hex,
                }),
                set: setFactory$1({
                    Hex,
                }),
                subtract: subtractFactory$1({
                    Hex,
                    Point,
                }),

                /**
                 * Alias for {@link Hex#cubeToCartesian}.
                 * @memberof Hex#
                 * @instance
                 */
                toCartesian: cubeToCartesian,

                /**
                 * Alias for {@link Hex#cartesianToCube}.
                 * @memberof Hex#
                 * @instance
                 */
                toCube: cartesianToCube,
                toPoint: toPointFactory({
                    Point,
                }),
                toString: toString,
                width: width,
            };
            const finalPrototype = Object.assign(defaultPrototype, prototype);
            finalPrototype.size = normalizeRadiuses(finalPrototype.size, finalPrototype.isPointy()); // ensure origin is a point

            finalPrototype.origin = Point(finalPrototype.origin); // the toJSON method is added here, because only here it has (easy) access to the prototype

            Object.assign(Hex, staticMethods, {
                toJSON: () => prototype,
            });
            /**
             * @function Hex
             *
             * @description
             * Factory function to create hexes. Use {@link Honeycomb.extendHex} to create a Hex factory.
             *
             * @see {@link redblobgames.com|https://www.redblobgames.com/grids/hexagons/#coordinates}
             *
             * @param {(number|Object|number[])} [xOrProps=]    The x coordinate,
             *                                                  **or** an object containing *any* of the cartesian (`x` and `y`) coordinates and optional custom properties,
             *                                                  **or** an object containing *all* of the cube (`q`, `r`, and `s`) coordinates and optional custom properties,
             *                                                  **or** an array containing *any* of the cartesian (x and y) coordinates.
             * @param {number} [xOrProps.x=]                    The x coordinate.
             * @param {number} [xOrProps.y=]                    The y coordinate.
             * @param {number} [y=]                             The y coordinate.
             * @param {object} [customProps={}]                 Any custom properties. The coordinates are merged into this object, ignoring any coordinates present in `customProps`.
             *
             * @returns {hex}                                   A hex. It *always* contains *only* the cartesian (x and y) coordinates and any custom properties.
             *
             * @example
             * const Hex = Honeycomb.extendHex()
             *
             * // passing numbers:
             * Hex()                        // { x: 0, y: 0 }
             * Hex(1)                       // { x: 1, y: 1 }
             * Hex(1, 2)                    // { x: 1, y: 2 }
             *
             * // passing an object with cartesian coordinates:
             * Hex({})                      // { x: 0, y: 0 }
             * Hex({ x: 1 })                // { x: 1, y: 1 }
             * Hex({ y: 2 })                // { x: 2, y: 2 }
             * Hex({ x: 1, y: 2 })          // { x: 1, y: 2 }
             *
             * // passing an object with cube coordinates:
             * Hex({ q: 1, r: 2, s: -3 })   // { x: 2, y: 2 }
             * Hex({ q: 1 })                // throws an error because of missing cube coordinates
             *
             * // passing an array:
             * Hex([])                      // { x: 0, y: 0 }
             * Hex([1])                     // { x: 1, y: 1 }
             * Hex([1, 2])                  // { x: 1, y: 2 }
             *
             * // custom properties:
             * Hex(1, 2, { a: 3 })          // { a: 3, x: 1, y: 2 }
             * Hex({ x: 1, y: 2, a: 3 })    // { a: 3, x: 1, y: 2 }
             *
             * // cloning a hex:
             * const someHex = Hex(4, -2)   // { x: 4, y: -2 }
             * const clone = Hex(someHex)   // { x: 4, y: -2 }
             * someHex === clone            // false
             */

            function Hex(xOrProps, y, customProps = {}) {
                let x;

                if (axis_1(xOrProps)) {
                    let { q, r, s } = xOrProps,
                        rest = _objectWithoutProperties(xOrProps, ["q", "r", "s"]);

                    if (axis_2(q) || axis_2(r) || axis_2(s)) {
                        const sum = q + r + s; // when any coordinate is undefined, sum will be NaN
                        // deal with floating point errors by allowing a maximum precision of 1e-12

                        if (Number.isNaN(sum) || sum > 1e-12) {
                            throw new Error(
                                "Cube coordinates must have a sum of 0. q: "
                                    .concat(q, ", r: ")
                                    .concat(r, ", s: ")
                                    .concat(s, ", sum: ")
                                    .concat(q + r + s, ".")
                            );
                        }
                        ({ x, y } = finalPrototype.cubeToCartesian({
                            q,
                            r,
                            s,
                        }));
                    } else {
                        ({ x, y } = xOrProps);
                    }

                    customProps = rest;
                } else if (axis_3(xOrProps)) {
                    [x, y] = xOrProps; // ignore all arguments except xOrProps

                    customProps = {};
                } else {
                    x = xOrProps;
                }
                /**
                 * An object with x and y properties and several methods in its prototype chain, created by a {@link Hex} factory.
                 *
                 * @typedef {Object} hex
                 * @property {number} x Cartesian x coordinate.
                 * @property {number} y Cartesian y coordinate.
                 */

                return Object.assign(
                    // the prototype has to be attached here, else Grid's shape methods break 🙁
                    Object.create(finalPrototype),
                    Object.assign(customProps, ensureXY(x, y))
                );
            }

            return Hex;
        };
    }

    const Point$1 = PointFactory({
        ensureXY,
    });
    const extendHex = extendHexFactory({
        ensureXY,
        normalizeRadiuses,
        Point: Point$1,
    });
    const defineGrid = defineGridFactory({
        extendHex,
        Grid,
        Point: Point$1,
    });

    exports.Point = Point$1;
    exports.defineGrid = defineGrid;
    exports.extendHex = extendHex;

    Object.defineProperty(exports, "__esModule", { value: true });
});
