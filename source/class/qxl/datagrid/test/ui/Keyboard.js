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
 * Keyboard navigation in a rendered virtual grid, driven by synthetic key events
 */
qx.Class.define("qxl.datagrid.test.ui.Keyboard", {
  extend: qx.dev.unit.TestCase,

  members: {
    /** @type {qxl.datagrid.VirtualScrollDataGrid} */
    __grid: null,

    async setUp() {
      this.__grid = await this.__createGrid(qxl.datagrid.VirtualScrollDataGrid, 200);
    },

    /**
     * Creates a focused grid with the 13 columns of the performance page, smaller than its columns
     *
     * @param {Class} GridClass the grid class
     * @param {Integer} rowCount number of rows
     * @return {Promise<qxl.datagrid.DataGrid>} the rendered grid
     */
    async __createGrid(GridClass, rowCount) {
      let columns = new qxl.datagrid.column.Columns();
      for (let [path] of qxl.datagrid.demo.perf.PerfDemo.COLUMNS) {
        columns.add(new qxl.datagrid.column.TextColumn(path).set({ caption: path, minWidth: 90 }));
      }
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      dataSource.setColumns(columns);
      let grid = new GridClass(columns).set({ width: 600, height: 300 });
      grid.setDataSource(dataSource);
      qx.core.Init.getApplication().getRoot().add(grid, { left: 0, top: 0 });
      let sized = new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve));
      dataSource.setModel(new qx.data.Array(Array.from({ length: rowCount }, (_, i) => new qxl.datagrid.demo.perf.PerfModel(i))));
      await sized;
      qx.ui.core.queue.Manager.flush();
      grid.focus();
      qx.ui.core.queue.Manager.flush();
      return grid;
    },

    tearDown() {
      this.__grid.destroy();
      this.__grid = null;
    },

    /**
     * Asserts the focused cell, its state and that screen readers are pointed to it
     *
     * @param {Integer} row
     * @param {Integer} column
     */
    __assertFocus(row, column) {
      let grid = this.__grid;
      let pane = grid.getQxObject("widgetPane");
      this.assertTrue(grid.getFocusedPosition().equals(row, column), `focus at ${grid.getFocusedPosition()} instead of ${row}:${column}`);
      let cell = pane.getChildAtPosition(row, column);
      this.assertNotNull(cell, "focused cell is on display");
      this.assertTrue(cell.hasState("focused"));
      this.assertEquals(pane.getCellId(row, column), grid.getContentElement().getAttribute("aria-activedescendant"));
      this.assertEquals(pane.getCellId(row, column), cell.getContentElement().getDomElement().id);
    },

    testMoveAndScroll() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      this.__assertFocus(0, 0);

      press("Down");
      press("Down");
      press("Right");
      this.__assertFocus(2, 1);

      // beyond the rows on display the grid scrolls along
      press("PageDown");
      press("PageDown");
      let row = grid.getFocusedPosition().getRow();
      this.assertTrue(row > 10);
      this.assertTrue(grid.getStartRowIndex() > 0);
      this.__assertFocus(row, 1);

      press("End", { ctrl: true });
      this.__assertFocus(199, 12);
      this.assertTrue(grid.getStartColumnIndex() > 0);

      press("Home");
      this.__assertFocus(199, 0);
      this.assertEquals(0, grid.getStartColumnIndex());

      press("Home", { ctrl: true });
      this.__assertFocus(0, 0);
      this.assertEquals(0, grid.getStartRowIndex());

      // Tab wraps into the next row, Shift+Tab on the first cell leaves the focus where it is
      press("End");
      press("Tab");
      this.__assertFocus(1, 0);
      press("Tab", { shift: true });
      this.__assertFocus(0, 12);
    },

    testClickFocusesCell() {
      let pane = this.__grid.getQxObject("widgetPane");
      qxl.datagrid.test.util.InputHelper.tap(pane.getChildAtPosition(3, 2));
      this.__assertFocus(3, 2);
      // the keyboard continues from the clicked cell
      qxl.datagrid.test.util.InputHelper.press("Down");
      this.__assertFocus(4, 2);
    },

    async testClippedGridScrolls() {
      this.__grid.destroy();
      let grid = (this.__grid = await this.__createGrid(qxl.datagrid.ClippedScrollDataGrid, 40));
      qxl.datagrid.test.util.InputHelper.press("End", { ctrl: true });
      this.__assertFocus(39, 12);
      // the cell lies completely within the visible part of the pane
      let cellBounds = grid.getQxObject("widgetPane").getChildAtPosition(39, 12).getBounds();
      let viewBounds = grid.getQxObject("dataPane").getBounds();
      let scrollX = grid.getChildControl("scrollbar-x").getPosition();
      let scrollY = grid.getChildControl("scrollbar-y").getPosition();
      let headerHeight = grid.getQxObject("header").getSizeHint().height;
      this.assertTrue(scrollY > 0 && scrollX > 0, `scrolled to ${scrollX}, ${scrollY}`);
      this.assertTrue(cellBounds.top + cellBounds.height <= scrollY + viewBounds.height - headerHeight, `cell ${JSON.stringify(cellBounds)} view ${JSON.stringify(viewBounds)} header ${headerHeight} scroll ${scrollY}`);
      this.assertTrue(cellBounds.left + cellBounds.width <= scrollX + viewBounds.width, `cell ${JSON.stringify(cellBounds)} view ${JSON.stringify(viewBounds)} scroll ${scrollX}`);
      qxl.datagrid.test.util.InputHelper.press("Home", { ctrl: true });
      this.assertEquals(0, grid.getChildControl("scrollbar-y").getPosition());
      this.assertEquals(0, grid.getChildControl("scrollbar-x").getPosition());
    }
  }
});
