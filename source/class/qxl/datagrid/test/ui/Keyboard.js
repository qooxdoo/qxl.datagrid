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

      // without an editor, Tab leaves the grid like in qx.ui.table, the focused cell stays
      press("End");
      press("Tab");
      this.assertTrue(grid.getFocusedPosition().equals(0, 12));
    },

    testSelectionByKeyboard() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let model = grid.getDataSource().getModel();
      let fired = 0;
      grid.addListener("changeSelection", () => fired++);
      const selectedRows = () =>
        grid
          .getSelection()
          .toArray()
          .map(item => model.indexOf(item))
          .sort((a, b) => a - b);

      // "single": the selection follows the focus, a move within the row changes nothing
      press("Down");
      press("Right");
      this.assertArrayEquals([1], selectedRows());
      this.assertEquals(1, fired);
      press("Down", { ctrl: true });
      this.assertArrayEquals([1], selectedRows(), "Ctrl moves only the focus");
      press("Space", { ctrl: true });
      this.assertArrayEquals([2], selectedRows());

      // "multi": Shift selects from the anchor, Ctrl+A everything, Ctrl+Space switches one row
      grid.getSelectionManager().setSelectionMode("multi");
      fired = 0;
      press("Down", { shift: true });
      press("Down", { shift: true });
      this.assertArrayEquals([2, 3, 4], selectedRows());
      press("A", { ctrl: true });
      this.assertEquals(200, grid.getSelection().getLength());
      press("Space", { ctrl: true });
      this.assertEquals(199, grid.getSelection().getLength());
      this.assertEquals(4, fired, "one change per key, like with the pointer");
    },

    testEscapeAndContextMenu() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let root = qx.core.Init.getApplication().getRoot();
      let escapesOutside = 0;
      const onRootKey = evt => {
        if (evt.getKeyIdentifier() == "Escape") {
          escapesOutside++;
        }
      };
      root.addListener("keypress", onRootKey);
      try {
        // "single" keeps its selection, Escape goes on (eg to close a dialog)
        press("Down");
        press("Escape");
        this.assertEquals(1, grid.getSelection().getLength());
        this.assertEquals(1, escapesOutside);
        // "multi" clears it and keeps the key; without a selection the key goes on again
        grid.getSelectionManager().setSelectionMode("multi");
        press("Down", { shift: true });
        press("Escape");
        this.assertEquals(0, grid.getSelection().getLength());
        this.assertEquals(1, escapesOutside);
        press("Escape");
        this.assertEquals(2, escapesOutside);
      } finally {
        root.removeListener("keypress", onRootKey);
      }

      // the menu key and Shift+F10 open the context menu next to the focused cell
      let menu = new qx.ui.menu.Menu();
      menu.add(new qx.ui.menu.Button("Action"));
      grid.setWidgetsContextMenu(menu);
      try {
        press("Apps");
        qx.ui.core.queue.Manager.flush();
        this.assertTrue(menu.isVisible());
        this.assertIdentical(grid.getQxObject("widgetPane").getChildAtPosition(2, 0), menu.getOpener());
        menu.hide();
        press("F10", { shift: true });
        qx.ui.core.queue.Manager.flush();
        this.assertTrue(menu.isVisible());
        menu.hide();
      } finally {
        grid.setWidgetsContextMenu(null);
        menu.destroy();
      }
    },

    testHeaderByKeyboard() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let header = grid.getQxObject("header");
      let columns = grid.getColumns();
      columns.toArray().forEach(column => column.setSortable(true));
      let model = grid.getDataSource().getModel();
      const headerCell = column => header._getChildren().find(child => child.getUserData("qxl.datagrid.cellData")?.column === column);

      // the selection follows into the first row; Up there goes into the header
      press("Down");
      press("Up");
      let selected = model.getItem(0);
      press("Up");
      this.assertNull(grid.getFocusedPosition());
      this.assertTrue(headerCell(0).hasState("focused"));
      this.assertEquals(header.getCellId(0), grid.getContentElement().getAttribute("aria-activedescendant"));

      // Enter sorts; a dialog may cancel with beforeSort
      press("Right");
      this.assertTrue(headerCell(1).hasState("focused"));
      grid.addListenerOnce("beforeSort", evt => evt.preventDefault());
      press("Enter");
      this.assertNull(columns.getColumn(1).getSortOrder());
      press("Enter");
      press("Enter");
      this.assertEquals("desc", columns.getColumn(1).getSortOrder());
      this.assertIdentical(model.getItem(199), grid.getDataSource().getModelForPosition(new qxl.datagrid.source.Position(0, 0)));
      this.assertTrue(grid.getSelection().contains(selected), "the selection stays with the model");

      // Shift+Enter adds a criterion, both header cells show their rank
      press("Right");
      press("Enter", { shift: true });
      this.assertArrayEquals([columns.getColumn(1), columns.getColumn(2)], columns.getSortColumns());
      this.assertEquals(1, headerCell(1).getSortRank());
      this.assertEquals(2, headerCell(2).getSortRank());

      // Shift+Right widens the column
      let width = headerCell(2).getBounds().width;
      press("Right", { shift: true });
      this.assertEquals(width + 10, columns.getColumn(2).getWidth());

      // Down goes back to the first row
      press("Down");
      this.assertTrue(grid.getFocusedPosition().equals(0, 2));
      this.assertFalse(headerCell(2).hasState("focused"));
    },

    async testHeaderByPointer() {
      const helper = qxl.datagrid.test.util.InputHelper;
      let grid = this.__grid;
      let columns = grid.getColumns();
      columns.toArray().forEach(column => column.setSortable(true));
      const headerCell = column => grid.getQxObject("header")._getChildren().find(child => child.getUserData("qxl.datagrid.cellData")?.column === column);

      // dragging the right edge changes the width, header and cells follow, and it does not sort
      let cell = headerCell(1);
      let width = cell.getBounds().width;
      helper.drag(cell, width - 2, width + 28);
      this.assertEquals(width + 30, columns.getColumn(1).getWidth());
      this.assertNull(columns.getColumn(1).getSortOrder());
      for (let i = 0; i < 20 && headerCell(1).getBounds().width != width + 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        qx.ui.core.queue.Manager.flush();
      }
      this.assertEquals(width + 30, headerCell(1).getBounds().width);
      this.assertEquals(width + 30, grid.getQxObject("widgetPane").getChildAtPosition(0, 1).getBounds().width);

      // a click sorts, Shift+click adds a criterion
      helper.tap(headerCell(1));
      helper.tap(headerCell(2), { shift: true });
      this.assertArrayEquals([columns.getColumn(1), columns.getColumn(2)], columns.getSortColumns());
      helper.tap(headerCell(2));
      this.assertArrayEquals([columns.getColumn(2)], columns.getSortColumns());
      this.assertEquals("desc", columns.getColumn(2).getSortOrder());
    },

    testHiddenColumns() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let header = grid.getQxObject("header");
      let pane = grid.getQxObject("widgetPane");
      let columns = grid.getColumns();
      const widgetsOf = (widget, column) => widget._getChildren().filter(child => child.getUserData("qxl.datagrid.cellData")?.column === column);

      // a hidden column leaves no widget behind, its neighbours close up
      let leftOfThird = pane.getChildAtPosition(0, 2).getBounds().left;
      columns.getColumn(1).setVisible(false);
      qx.ui.core.queue.Manager.flush();
      this.assertEquals(0, widgetsOf(header, 1).length);
      this.assertEquals(0, widgetsOf(pane, 1).length);
      this.assertTrue(pane.getChildAtPosition(0, 2).getBounds().left < leftOfThird);
      this.assertEquals("12", grid.getContentElement().getAttribute("aria-colcount"));

      // the keyboard skips it; a focused column which is hidden passes the focus on
      press("Right");
      this.assertTrue(grid.getFocusedPosition().equals(0, 2));
      columns.getColumn(2).setVisible(false);
      this.assertTrue(grid.getFocusedPosition().equals(0, 3));

      columns.getColumn(1).setVisible(true);
      qx.ui.core.queue.Manager.flush();
      this.assertEquals(1, widgetsOf(header, 1).length);
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

      // Page Down moves by the rows on display, not by all rows the clipped grid lays out
      let visibleRows = Math.floor((viewBounds.height - headerHeight) / cellBounds.height);
      qxl.datagrid.test.util.InputHelper.press("PageDown");
      this.assertEquals(visibleRows - 1, grid.getFocusedPosition().getRow());
      qxl.datagrid.test.util.InputHelper.press("End", { ctrl: true });
      qxl.datagrid.test.util.InputHelper.press("PageUp");
      this.assertEquals(39 - (visibleRows - 1), grid.getFocusedPosition().getRow());
    }
  }
});
