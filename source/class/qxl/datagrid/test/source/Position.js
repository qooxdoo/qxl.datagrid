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

qx.Class.define("qxl.datagrid.test.source.Position", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testConstructor() {
      let p = new qxl.datagrid.source.Position(1, 2);
      this.assertTrue(p.getRow() == 1);
      this.assertTrue(p.getColumn() == 2);

      let sample = new qxl.datagrid.source.Position().set({ row: 3, column: 4 });
      p = new qxl.datagrid.source.Position(sample);
      this.assertTrue(p.getRow() == 3);
      this.assertTrue(p.getColumn() == 4);

      p = new qxl.datagrid.source.Position({ row: 5, column: 6 });
      this.assertTrue(p.getRow() == 5);
      this.assertTrue(p.getColumn() == 6);

      p = new qxl.datagrid.source.Position([7, 7]);
      this.assertTrue(p.getRow() == 7);
      this.assertTrue(p.getColumn() == 8);

      p.increment(1, 1);
      this.assertTrue(p.getRow() == 8);
      this.assertTrue(p.getColumn() == 9);
    }
  }
});
