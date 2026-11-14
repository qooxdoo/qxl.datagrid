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

qx.Class.define("qxl.datagrid.test.source.ArrayDataSource", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testNothingFiredAfterDispose() {
      let columns = new qxl.datagrid.column.Columns();
      columns.add(new qxl.datagrid.column.TextColumn("name"));
      let model = new qx.data.Array([qx.data.marshal.Json.createModel({ name: "a" })]);
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      dataSource.set({ columns, model });
      let firedAfterDispose = [];
      dataSource.fireDataEvent = name => firedAfterDispose.push(name);
      // a changeSize is still pending when the data source is disposed
      dataSource.dispose();

      // the model array and the columns outlive the data source
      model.push(qx.data.marshal.Json.createModel({ name: "b" }));
      columns.fireEvent("changeSort");
      await new Promise(resolve => setTimeout(resolve, 20));
      this.assertArrayEquals([], firedAfterDispose);
    }
  }
});
