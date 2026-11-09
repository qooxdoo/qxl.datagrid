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

/**
 * How the columns show their values in a rendered grid with the theme of the tests
 */
qx.Class.define("qxl.datagrid.test.ui.Cells", {
  extend: qx.dev.unit.TestCase,

  members: {
    /** @type {qxl.datagrid.VirtualScrollDataGrid} */
    __grid: null,

    /**
     * Creates and renders a grid
     *
     * @param {qxl.datagrid.column.Column[]} columnList the columns
     * @param {Object[]} data the rows, as plain objects which become models
     * @return {Promise<qxl.datagrid.VirtualScrollDataGrid>}
     */
    async __createGrid(columnList, data) {
      let columns = new qxl.datagrid.column.Columns();
      columnList.forEach(column => columns.add(column));
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      dataSource.setColumns(columns);
      let grid = (this.__grid = new qxl.datagrid.VirtualScrollDataGrid(columns).set({ width: 500, height: 200 }));
      grid.setDataSource(dataSource);
      qx.core.Init.getApplication().getRoot().add(grid, { left: 0, top: 0 });
      let sized = new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve));
      dataSource.setModel(qx.data.marshal.Json.createModel(data));
      await sized;
      qx.ui.core.queue.Manager.flush();
      return grid;
    },

    /**
     * Returns the widget of a cell on display
     *
     * @param {Integer} row
     * @param {Integer} column
     * @return {qx.ui.core.Widget}
     */
    __getCell(row, column) {
      return this.__grid.getQxObject("widgetPane").getChildAtPosition(row, column);
    },

    tearDown() {
      this.__grid?.destroy();
      this.__grid = null;
    },

    async testNumbersAlignRight() {
      let grid = await this.__createGrid(
        [new qxl.datagrid.column.TextColumn("name").set({ caption: "Name" }), new qxl.datagrid.column.NumberColumn("speed").set({ caption: "Speed" })],
        [{ name: "Car", speed: 1.5 }]
      );
      const textAlign = widget => widget.getContentElement().getDomElement().style.textAlign;
      this.assertEquals("right", textAlign(this.__getCell(0, 1)));
      this.assertEquals("", textAlign(this.__getCell(0, 0)));
      let header = grid.getQxObject("header");
      this.assertEquals("right", textAlign(header.getCell(1).getChildControl("label")));
      this.assertEquals("", textAlign(header.getCell(0).getChildControl("label")));
    }
  }
});
