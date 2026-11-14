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

qx.Class.define("qxl.datagrid.test.ui.DataGrid", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testCellSizes() {
      let dataSource = new qxl.datagrid.demo.biggrid.DummyDataSource(100, 100);
      let styling = new qxl.datagrid.ui.GridStyling().set({
        horizontalSpacing: 0,
        verticalSpacing: 0,
        minRowHeight: 40
      });
      let columns = new qxl.datagrid.column.Columns();
      for (let columnIndex = 0; columnIndex < dataSource.getNumColumns(); columnIndex++) {
        let column = new qxl.datagrid.column.TextColumn().set({
          caption: qxl.datagrid.util.Labels.getColumnLetters(columnIndex),
          path: "label",
          minWidth: 40
        });
        columns.add(column);
      }
      let widgetSizeSource = {
        getWidgetSize(rowIndex, columnIndex) {
          let minHeight = styling.getMinRowHeight();
          let maxHeight = styling.getMaxRowHeight();
          let minWidth = styling.getMinColumnWidth();
          let maxWidth = styling.getMaxColumnWidth();

          return {
            minWidth: minWidth,
            width: null,
            maxWidth: maxWidth,

            minHeight: minHeight,
            height: null,
            maxHeight: maxHeight
          };
        },
        getDataSourceSize() {
          return dataSource.getSize();
        }
      };
      let sizeCalculator = new qxl.datagrid.ui.GridSizeCalculator(columns, styling, widgetSizeSource);
      sizeCalculator.setAvailableSize(400, 200, 1, 1);
      let headerWidgetFactory = new qxl.datagrid.ui.factory.HeaderWidgetFactory(columns);
      let header = new qxl.datagrid.ui.HeaderRows(sizeCalculator, headerWidgetFactory, dataSource);
      let paneWidgetFactory = new qxl.datagrid.ui.factory.SimpleWidgetFactory(columns, "qxl-datagrid-cell");
      let widgetPane = new qxl.datagrid.ui.WidgetPane(sizeCalculator, paneWidgetFactory, dataSource, new qxl.datagrid.ui.SelectionManager());
      header.updateWidgets();
      await widgetPane.updateWidgets();

      const assertMapEquals = (expected, actual) => {
        this.assertArrayEquals(Object.keys(expected).sort(), Object.keys(actual).sort());
        for (let key in expected) {
          this.assertTrue(expected[key] === actual[key]);
        }
      };

      // header rows have negative row indexes
      let widgets = headerWidgetFactory.getWidgets();
      this.assertTrue(widgets["-1:0"] === undefined);
      this.assertTrue(widgets["-1:12"] === undefined);
      this.assertTrue(widgets["-1:1"].getLabel() === "B");
      assertMapEquals(widgets["-1:2"].getLayoutProperties(), { height: 40, top: 0, left: 40, width: 40 });
      assertMapEquals(widgets["-1:3"].getLayoutProperties(), { height: 40, top: 0, left: 80, width: 40 });

      widgets = paneWidgetFactory.getWidgets();
      this.assertTrue(widgets["0:0"] === undefined);
      this.assertTrue(widgets["6:1"] === undefined);
      this.assertTrue(widgets["2:2"].getValue() === "C2");
      assertMapEquals(widgets["2:2"].getLayoutProperties(), { top: 40, height: 40, left: 40, width: 40 });
      assertMapEquals(widgets["3:3"].getLayoutProperties(), { top: 80, height: 40, left: 80, width: 40 });
    },

    /**
     * Creates a virtual grid with one text column on an array data source, not yet on display
     *
     * @return {{grid: qxl.datagrid.VirtualScrollDataGrid, dataSource: qxl.datagrid.source.ArrayDataSource, nextChangeSize: Function, createRows: Function}}
     */
    __createArrayGrid() {
      let columns = new qxl.datagrid.column.Columns();
      columns.add(new qxl.datagrid.column.TextColumn("name").set({ caption: "Name", width: 200 }));
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      dataSource.setColumns(columns);
      let grid = new qxl.datagrid.VirtualScrollDataGrid(columns).set({ width: 400, height: 480 });
      grid.getStyling().setHeaderRowHeight(22);
      grid.setDataSource(dataSource);
      return {
        grid,
        dataSource,
        nextChangeSize: () => new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve)),
        createRows: (count, first = 0) => Array.from({ length: count }, (_, i) => qx.data.marshal.Json.createModel({ name: "Row " + (first + i) }))
      };
    },

    async testScrollToAppendedRow() {
      let { grid, dataSource, nextChangeSize, createRows } = this.__createArrayGrid();
      qx.core.Init.getApplication().getRoot().add(grid, { left: 0, top: 0 });
      let sized = nextChangeSize();
      let model = new qx.data.Array(createRows(44));
      dataSource.setModel(model);
      await sized;
      qx.ui.core.queue.Manager.flush();

      // the size of the data source is reported after the grid has scrolled to the new row
      sized = nextChangeSize();
      model.push(createRows(1, 44)[0]);
      grid.setFocusedPosition(44, 0);
      await sized;
      qx.ui.core.queue.Manager.flush();

      let rows = grid.getSizeCalculator().getSizes().rows.map(rowData => rowData.rowIndex);
      grid.destroy();
      this.assertTrue(rows.includes(44), `row 44 not on display, rows ${rows}`);
    },

    async testFilledBeforeLayout() {
      let { grid, dataSource, nextChangeSize, createRows } = this.__createArrayGrid();
      let warnings = [];
      grid.warn = (...args) => warnings.push(args.join(" "));
      // like a dialog which fills its grid and scrolls to the end before it is shown
      let sized = nextChangeSize();
      dataSource.setModel(new qx.data.Array(createRows(44)));
      await sized;
      grid.setStartRowIndex(43);
      qx.core.Init.getApplication().getRoot().add(grid, { left: 0, top: 0 });
      qx.ui.core.queue.Manager.flush();

      let rows = grid
        .getSizeCalculator()
        .getSizes()
        .rows.map(rowData => rowData.rowIndex)
        .filter(rowIndex => rowIndex >= 0);
      let maxRows = grid.getMaxRows();
      grid.destroy();
      this.assertEquals(43, rows[rows.length - 1]);
      this.assertEquals(maxRows, rows.length, `the last row is not at the bottom, rows ${rows}`);
      this.assertArrayEquals([], warnings);
    },

    async testNoCallbacksAfterDestroy() {
      let { grid, dataSource, nextChangeSize, createRows } = this.__createArrayGrid();
      let destroyed = false;
      let callsAfterDestroy = [];
      const states = name => () => {
        if (destroyed) {
          callsAfterDestroy.push(name);
        }
        return null;
      };
      grid.set({ rowStates: states("rowStates"), cellStates: states("cellStates") });
      let model = new qx.data.Array(createRows(5));
      let sized = nextChangeSize();
      dataSource.setModel(model);
      await sized;
      qx.core.Init.getApplication().getRoot().add(grid, { left: 0, top: 0 });
      qx.ui.core.queue.Manager.flush();

      // a change just before the dialog with the grid is closed
      grid.scheduleUpdateWidgets();
      grid.destroy();
      qx.ui.core.queue.Manager.flush();
      destroyed = true;
      this.assertTrue(grid.isDisposed());

      // the data source outlives the grid
      model.push(createRows(1, 5)[0]);
      await new Promise(resolve => setTimeout(resolve, 100));
      dataSource.dispose();
      this.assertArrayEquals([], callsAfterDestroy);
    },

    testComputeFocusMove() {
      const move = (key, row, column, modifiers = {}, columns = [0, 1, 2, 3]) =>
        qxl.datagrid.DataGrid.computeFocusMove(key, { shift: false, ctrl: false, ...modifiers }, { row, column }, 10, columns, 3);
      // limited by the edges
      this.assertJsonEquals({ row: 0, column: 2 }, move("Up", 0, 2));
      this.assertJsonEquals({ row: 9, column: 2 }, move("Down", 9, 2));
      this.assertJsonEquals({ row: 5, column: 0 }, move("Left", 5, 0));
      this.assertJsonEquals({ row: 5, column: 3 }, move("Right", 5, 3));
      this.assertJsonEquals({ row: 0, column: 1 }, move("PageUp", 2, 1));
      this.assertJsonEquals({ row: 8, column: 1 }, move("PageDown", 5, 1));
      this.assertJsonEquals({ row: 9, column: 1 }, move("PageDown", 8, 1));
      // Home and End, with Ctrl over all rows
      this.assertJsonEquals({ row: 5, column: 0 }, move("Home", 5, 2));
      this.assertJsonEquals({ row: 5, column: 3 }, move("End", 5, 2));
      this.assertJsonEquals({ row: 0, column: 0 }, move("Home", 5, 2, { ctrl: true }));
      this.assertJsonEquals({ row: 9, column: 3 }, move("End", 5, 2, { ctrl: true }));
      // Tab wraps into the next row and leaves the grid at the end
      this.assertJsonEquals({ row: 5, column: 3 }, move("Tab", 5, 2));
      this.assertJsonEquals({ row: 6, column: 0 }, move("Tab", 5, 3));
      this.assertNull(move("Tab", 9, 3));
      this.assertJsonEquals({ row: 4, column: 3 }, move("Tab", 5, 0, { shift: true }));
      this.assertNull(move("Tab", 0, 0, { shift: true }));
      // other keys do not move, without a focused cell the first one is taken
      this.assertUndefined(move("Enter", 5, 2));
      this.assertJsonEquals({ row: 0, column: 0 }, qxl.datagrid.DataGrid.computeFocusMove("Down", {}, null, 10, [0, 1, 2, 3], 3));
      this.assertUndefined(qxl.datagrid.DataGrid.computeFocusMove("Tab", {}, null, 10, [0, 1, 2, 3], 3));

      // hidden columns 0 and 2 are skipped; a hidden focused column counts as the next shown one
      const shown = [1, 3];
      this.assertJsonEquals({ row: 5, column: 3 }, move("Right", 5, 1, {}, shown));
      this.assertJsonEquals({ row: 5, column: 1 }, move("Left", 5, 3, {}, shown));
      this.assertJsonEquals({ row: 5, column: 1 }, move("Home", 5, 3, {}, shown));
      this.assertJsonEquals({ row: 6, column: 1 }, move("Tab", 5, 3, {}, shown));
      this.assertJsonEquals({ row: 4, column: 3 }, move("Tab", 5, 1, { shift: true }, shown));
      this.assertJsonEquals({ row: 5, column: 3 }, move("Right", 5, 2, {}, shown), "from the hidden column 2 to 3");
      this.assertJsonEquals({ row: 5, column: 1 }, move("Left", 5, 2, {}, shown), "from the hidden column 2 to 1");
      this.assertJsonEquals({ row: 6, column: 3 }, move("Down", 5, 2, {}, shown));
    }
  }
});
