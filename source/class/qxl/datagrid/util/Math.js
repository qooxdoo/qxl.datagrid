qx.Class.define("qxl.datagrid.util.Math", {
  statics: {
    /**
     * Clamps x between values lo and hi inclusive
     * i.e. if x < lo, return lo. else if y > hi, return hi, else return x.
     * @param {*} lo
     * @param {*} hi
     * @param {*} x
     * @returns
     */
    clamp(lo, hi, x) {
      x = Math.max(lo, x);
      x = Math.min(hi, x);
      return x;
    },

    /**
     * Maps x, which is in range a1-a2, to range b1-b2.
     *
     * Examples:
     * interpolate(0,10,0,100,0) = 0
     * interpolate(0,10,0,100,10) = 100
     * interpolate(0,10,0,100,5.5) = 55
     * @param {Number} a1
     * @param {Number} a2
     * @param {Number} b1
     * @param {Number} b2
     * @param {Number} x
     */
    interpolate(a1, a2, b1, b2, x) {
      return b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);
    }
  }
});
