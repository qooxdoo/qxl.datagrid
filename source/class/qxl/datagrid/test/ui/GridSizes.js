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

qx.Class.define("qxl.datagrid.test.ui.GridSizes", {
  extend: qx.dev.unit.TestCase,

  members: {
    testBasicSizes() {
      let columns = new qxl.datagrid.column.Columns();
      columns.addAll([
        new qxl.datagrid.column.TextColumn("a").set({ minWidth: 50 }),
        new qxl.datagrid.column.TextColumn("b").set({ minWidth: 51 }),
        new qxl.datagrid.column.TextColumn("c").set({ minWidth: 52 }),
        new qxl.datagrid.column.TextColumn("d").set({ minWidth: 53 }),
        new qxl.datagrid.column.TextColumn("e").set({ minWidth: 54 }),
        new qxl.datagrid.column.TextColumn("f")
      ]);

      let widgetSizeSource = {
        widgetHeights: [
          [10, 20, 30, 25, 15, 26, 16, 17, 28], // 30
          [20, 20, 20, 20, 20, 20, 20, 20, 60], // 50
          [20, 20, 20, 20, 20, 20, 20, 60, 20], // 70
          [20, 20, 50, 20, 20, 20, 20, 20, 20], // 90
          [20, 20, 00, 20, 20, 20, 20, 20, 60], // 110
          [20, 20, 60, 20, 20, 20, 20, 20, 60] // 110
        ],
        headerHeights: [30, 30, 30, 30, 30, 30, 30, 30, 30],
        init() {},
        getWidgetSize(rowIndex, column) {
          let arr = rowIndex < 0 ? this.headerHeights : this.widgetHeights[rowIndex];
          let columnIndex = columns.indexOf(column);
          let height = arr[columnIndex] === undefined ? null : arr[columnIndex];
          return {
            minWidth: null,
            width: null,
            maxWidth: null,
            minHeight: height,
            height: null,
            maxHeight: height
          };
        }
      };

      let styling = new qxl.datagrid.ui.GridStyling().set({
        horizontalSpacing: 0,
        verticalSpacing: 0,
        minRowHeight: 10
      });
      let sizeCalculator = new qxl.datagrid.ui.GridSizes(columns, widgetSizeSource, styling);

      let sizes = sizeCalculator.getSizes(125, 75, 0, 0);
      this.assertTrue(sizes.rows.length == 4);
      this.assertTrue(sizes.rows[0].height == 30);
      this.assertTrue(sizes.rows[1].height == 20);
      this.assertTrue(sizes.rows[2].height == 20);
      this.assertTrue(sizes.rows[3].height == 50);

      this.assertTrue(sizes.columns.length == 3);
      this.assertTrue(sizes.columns[0].width == 50);
      this.assertTrue(sizes.columns[1].width == 51);
      this.assertTrue(sizes.columns[2].width == 52);

      sizes = sizeCalculator.getSizes(125, 75, 0, 1);
      this.assertTrue(sizes.columns.length == 3);
      this.assertTrue(sizes.columns[0].width == 51);
      this.assertTrue(sizes.columns[1].width == 52);
      this.assertTrue(sizes.columns[2].width == 53);

      styling.setNumFixedColumns(1);
      sizeCalculator.invalidate();
      sizes = sizeCalculator.getSizes(125, 75, 0, 2);
      this.assertArrayEquals(
        [0, 2, 3],
        sizes.columns.map(c => c.columnIndex)
      );
      this.assertTrue(sizes.columns[0].width == 50);
      this.assertTrue(sizes.columns[1].width == 52);
      this.assertTrue(sizes.columns[2].width == 53);

      widgetSizeSource.widgetHeights = [
        [20, 20, 20, 20, 20, 20, 20, 20, 20],
        [21, 21, 21, 21, 21, 21, 21, 21, 21],
        [22, 22, 22, 22, 22, 22, 22, 22, 22],
        [23, 23, 23, 23, 23, 23, 23, 23, 23],
        [24, 24, 24, 24, 24, 24, 24, 24, 24],
        [25, 25, 25, 25, 25, 25, 25, 25, 25]
      ];

      sizeCalculator.invalidate();
      sizes = sizeCalculator.getSizes(125, 75, 0, 0);
      this.assertTrue(sizes.rows.length == 4);
      this.assertTrue(sizes.rows[0].height == 20);
      this.assertTrue(sizes.rows[1].height == 21);
      this.assertTrue(sizes.rows[2].height == 22);
      this.assertTrue(sizes.rows[3].height == 23);

      sizeCalculator.invalidate();
      sizes = sizeCalculator.getSizes(125, 75, 1, 0);
      this.assertTrue(sizes.rows.length == 4);
      this.assertTrue(sizes.rows[0].height == 21);
      this.assertTrue(sizes.rows[1].height == 22);
      this.assertTrue(sizes.rows[2].height == 23);
      this.assertTrue(sizes.rows[3].height == 24);

      styling.setNumFixedRows(1);
      sizeCalculator.invalidate();
      sizes = sizeCalculator.getSizes(125, 75, 2, 0);
      this.assertArrayEquals(
        [0, 2, 3, 4],
        sizes.rows.map(c => c.rowIndex)
      );
      this.assertTrue(sizes.rows.length == 4);
      this.assertTrue(sizes.rows[0].height == 20);
      this.assertTrue(sizes.rows[1].height == 22);
      this.assertTrue(sizes.rows[2].height == 23);
      this.assertTrue(sizes.rows[3].height == 24);

      styling.setNumHeaderRows(1);
      sizeCalculator.invalidate();
      sizes = sizeCalculator.getSizes(125, 80, 2, 0);
      this.assertArrayEquals(
        [0, 2, 3, -1],
        sizes.rows.map(c => c.rowIndex)
      );
      this.assertTrue(sizes.rows[0].height == 20);
      this.assertTrue(sizes.rows[1].height == 22);
      this.assertTrue(sizes.rows[2].height == 23);
      this.assertTrue(sizes.rows[3].height == 30); // header row
    }
  }
});
