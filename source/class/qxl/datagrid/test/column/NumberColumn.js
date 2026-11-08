/* ************************************************************************
 *
 *    Qooxdoo DataGrid
 *
 *    https://github.com/qooxdoo/qooxdoo
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 * *********************************************************************** */

qx.Class.define("qxl.datagrid.test.column.NumberColumn", {
  extend: qx.dev.unit.TestCase,

  members: {
    testDisplayLikeNumberFormat() {
      const values = [0, 1, -1.5, 0.125, 2.675e-3, 1234.5, -1234567.891];
      const formats = [
        {},
        { maximumFractionDigits: 0 },
        { minimumFractionDigits: 1, maximumFractionDigits: 3 },
        { minimumFractionDigits: 2, maximumFractionDigits: 2, groupingUsed: false },
        { minimumIntegerDigits: 3, maximumFractionDigits: 1 },
        { maximumFractionDigits: 2, prefix: "EUR ", postfix: " net" }
      ];
      let column = new qxl.datagrid.column.NumberColumn("value");
      for (let locale of ["en", "de"]) {
        for (let settings of formats) {
          let format = new qx.util.format.NumberFormat(locale).set(settings);
          column.setNumberFormat(format);
          for (let value of values) {
            this.assertEquals(format.format(value), column._formatForDisplay(value), `${value} with ${locale} ${JSON.stringify(settings)}`);
          }
        }
      }
      this.assertEquals("", column._formatForDisplay(null));

      // Intl rounds the decimal number, qx rounds the binary float: 1.005 * 100 is 100.4999...
      column.setNumberFormat(new qx.util.format.NumberFormat("en").set({ maximumFractionDigits: 2 }));
      this.assertEquals("1.01", column._formatForDisplay(1.005));
      this.assertEquals("1", column.getNumberFormat().format(1.005));
    },

    testCacheFollowsSettings() {
      let column = new qxl.datagrid.column.NumberColumn("value");
      let format = new qx.util.format.NumberFormat("en").set({ maximumFractionDigits: 2 });
      column.setNumberFormat(format);
      this.assertEquals("1.25", column._formatForDisplay(1.25));
      // NumberFormat fires no event for this, the column notices it anyway
      format.setMaximumFractionDigits(1);
      this.assertEquals("1.3", column._formatForDisplay(1.25));
      // Intl cannot cut off integer places, the number format does it itself
      format.setMaximumIntegerDigits(2);
      this.assertEquals(format.format(1234.5), column._formatForDisplay(1234.5));
    }
  }
});
