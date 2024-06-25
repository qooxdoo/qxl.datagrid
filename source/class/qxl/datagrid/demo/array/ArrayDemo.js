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
 *      * Will Johnson (willsterjohnson)
 *
 * *********************************************************************** */

/**
 * Provides a simple demonstration of a DataGrid with a 1-dimensional array of
 * data.
 */
qx.Class.define("qxl.datagrid.demo.array.ArrayDemo", {
  extend: qx.ui.container.Composite,

  construct() {
    super();
    this.setLayout(new qx.ui.layout.VBox(10));
    let grid = this.getQxObject("grid");
    grid;
    this.add(grid, { flex: 1 });
  },

  objects: {
    dataSource() {
      return new qxl.datagrid.source.ArrayDataSource();
    },

    grid() {
      return new qxl.datagrid.ClippedScrollDataGrid(this.getQxObject("columns")).set({
        dataSource: this.getQxObject("dataSource")
      });
    },

    columns() {
      const columns = new qxl.datagrid.column.Columns();

      columns.add(
        new qxl.datagrid.column.TextColumn().set({
          path: "title",
          caption: "Title",
          minWidth: 200,
          flex: 1
        })
      );

      columns.add(
        new qxl.datagrid.column.TextColumn().set({
          path: "author",
          caption: "Author",
          minWidth: 200
        })
      );

      columns.add(
        new qxl.datagrid.column.DateColumn().set({
          path: "date",
          caption: "Date",
          minWidth: 200
        })
      );

      return columns;
    }
  },

  members: {
    async init() {
      this.getQxObject("dataSource").setColumns(this.getQxObject("columns"));
      const model = new qx.data.Array(...Array.from({ length: 100 }, () => new qxl.datagrid.demo.array.DummyModel()));
      this.getQxObject("dataSource").setModel(model);
    }
  }
});
