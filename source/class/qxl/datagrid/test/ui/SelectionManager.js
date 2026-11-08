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

qx.Class.define("qxl.datagrid.test.ui.SelectionManager", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testFocusedPositionFollowsModel() {
      const Model = qxl.datagrid.demo.perf.PerfModel;
      let model = new qx.data.Array([new Model(0), new Model(1), new Model(2)]);
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      let columns = new qxl.datagrid.column.Columns();
      columns.add(new qxl.datagrid.column.TextColumn("strart"));
      dataSource.setColumns(columns);
      dataSource.setModel(model);
      let manager = new qxl.datagrid.ui.SelectionManager();
      manager.setDataSource(dataSource);
      const changed = () => new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve));
      await changed();

      manager.setFocusedPosition(new qxl.datagrid.source.Position(1, 5));
      this.assertIdentical(model.getItem(1), manager.getFocused());

      // a row inserted above moves the focused cell along with its model, the column stays
      let insertion = changed();
      model.insertAt(0, new Model(9));
      await insertion;
      this.assertTrue(manager.getFocusedPosition().equals(2, 5));
      this.assertIdentical(model.getItem(2), manager.getFocused());

      // without its model the position stays within the rows and takes the model there
      let removal = changed();
      model.removeAt(2);
      model.removeAt(2);
      await removal;
      this.assertTrue(manager.getFocusedPosition().equals(1, 5));
      this.assertIdentical(model.getItem(1), manager.getFocused());

      let clearing = changed();
      model.removeAll();
      await clearing;
      this.assertNull(manager.getFocusedPosition());
      this.assertNull(manager.getFocused());
    }
  }
});
