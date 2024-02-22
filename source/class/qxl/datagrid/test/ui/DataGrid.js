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
      let headerWidgetFactory = new qxl.datagrid.ui.factory.HeaderWidgetFactory(columns, "qxl-datagrid-header-cell");
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

      let widgets = headerWidgetFactory.getWidgets();
      this.assertTrue(widgets["0:0"] === undefined);
      this.assertTrue(widgets["0:12"] === undefined);
      this.assertTrue(widgets["0:1"].getLabel() === "B");
      assertMapEquals(widgets["0:2"].getLayoutProperties(), { height: 40, top: 0, left: 40, width: 40 });
      assertMapEquals(widgets["0:3"].getLayoutProperties(), { height: 40, top: 0, left: 80, width: 40 });

      widgets = paneWidgetFactory.getWidgets();
      this.assertTrue(widgets["0:0"] === undefined);
      this.assertTrue(widgets["6:1"] === undefined);
      this.assertTrue(widgets["2:2"].getValue() === "C2");
      assertMapEquals(widgets["2:2"].getLayoutProperties(), { top: 40, height: 40, left: 40, width: 40 });
      assertMapEquals(widgets["3:3"].getLayoutProperties(), { top: 80, height: 40, left: 80, width: 40 });
    }
  }
});
