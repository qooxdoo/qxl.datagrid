/* ************************************************************************
 *
 *    Qooxdoo DataGrid
 *
 *    https://github.com/qooxdoo/qooxdoo
 *
 *    Copyright:
 *      2022-23 Zenesis Limited, https://www.zenesis.com
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 *    Authors:
 *      * John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * *********************************************************************** */

qx.Class.define("qxl.datagrid.test.util.Labels", {
  extend: qx.dev.unit.TestCase,

  members: {
    testColumnNames() {
      const TEST_DATA = {
        0: "A",
        1: "B",
        25: "Z",
        26: "AA",
        52: "BA",
        676: "ZA",
        701: "ZZ",
        702: "AAA"
      };
      for (let key in TEST_DATA) {
        this.assertTrue(qxl.datagrid.util.Labels.getColumnLetters(parseInt(key, 10)) == TEST_DATA[key]);
      }
    }
  }
});
