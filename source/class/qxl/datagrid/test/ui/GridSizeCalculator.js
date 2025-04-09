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

qx.Class.define("qxl.datagrid.test.ui.GridSizeCalculator", {
  extend: qx.dev.unit.TestCase,

  members: {
    testSimpleGrid() {
      let columns = new qxl.datagrid.column.Columns();
      columns.addAll([
        new qxl.datagrid.column.TextColumn("a").set({ width: 1 }),
        new qxl.datagrid.column.TextColumn("b").set({ width: 2 }),
        new qxl.datagrid.column.TextColumn("c").set({ width: 3 }),
        new qxl.datagrid.column.TextColumn("d").set({ width: 4 }),
        new qxl.datagrid.column.TextColumn("e").set({ width: 5 })
      ]);
      let widgetSizeSource = {
        widgetHeights: [
          [1, 1, 1, 1, 1],
          [2, 2, 2, 2, 2],
          [3, 3, 3, 3, 3],
          [4, 4, 4, 4, 4],
          [5, 5, 5, 5, 5]
        ],
        headerHeights: [10, 10, 10, 10, 10],
        init() {},
        getWidgetSize(rowIndex, columnIndex) {
          let arr = rowIndex < 0 ? this.headerHeights : this.widgetHeights[rowIndex];
          let height = arr[columnIndex] === undefined ? null : arr[columnIndex];
          return {
            minWidth: null,
            width: null,
            maxWidth: null,
            minHeight: height,
            height: height,
            maxHeight: height
          };
        },
        _size: new qxl.datagrid.source.Position(5, 5),
        getDataSourceSize() {
          return this._size;
        }
      };
      let styling = new qxl.datagrid.ui.GridStyling().set({
        horizontalSpacing: 0,
        verticalSpacing: 0,
        minRowHeight: 0,
        numHeaderRows: 0
      });
      let sizeCalculator = new qxl.datagrid.ui.GridSizeCalculator(columns, styling, widgetSizeSource);

      /**
       * @param {0|1|2} scrollX - either 0, 1, or 2, the number of rows scrolled past
       * @param {0|1|2} scrollY - either 0, 1, or 2, the number of columns scrolled past
       */
      let subcase = (scrollX, scrollY) => {
        //! do not modify this tester's limits without also modifying the size source to accommodate
        if (![0, 1, 2].includes(scrollX) || ![0, 1, 2].includes(scrollY)) {
          return;
        }

        let sizes = sizeCalculator.getSizesFor(3 * scrollY + 6, 3 * scrollX + 6, scrollX, scrollY);

        this.assertArrayEquals(
          [scrollX, scrollX + 1, scrollX + 2],
          sizes.rows.map(c => c.rowIndex)
        );
        this.assertTrue(sizes.rows[0].height == scrollX + 1);
        this.assertTrue(sizes.rows[1].height == scrollX + 2);
        this.assertTrue(sizes.rows[2].height == scrollX + 3);

        this.assertArrayEquals(
          [scrollY, scrollY + 1, scrollY + 2],
          sizes.columns.map(c => c.columnIndex)
        );
        this.assertTrue(sizes.columns[0].width == scrollY + 1);
        this.assertTrue(sizes.columns[1].width == scrollY + 2);
        this.assertTrue(sizes.columns[2].width == scrollY + 3);
      };

      // no scroll
      subcase(0, 0);

      // vertical scroll only
      subcase(1, 0);
      subcase(2, 0);

      // horizontal scroll only
      subcase(0, 1);
      subcase(0, 2);

      // mixed scrolling - same count
      subcase(1, 1);
      subcase(2, 2);
      // mixed scrolling - different count
      subcase(2, 1);
      subcase(1, 2);
    },

    testWithFixed() {
      let columns = new qxl.datagrid.column.Columns();
      columns.addAll([
        new qxl.datagrid.column.TextColumn("a").set({ width: 1 }),
        new qxl.datagrid.column.TextColumn("b").set({ width: 2 }),
        new qxl.datagrid.column.TextColumn("c").set({ width: 3 }),
        new qxl.datagrid.column.TextColumn("d").set({ width: 4 }),
        new qxl.datagrid.column.TextColumn("e").set({ width: 5 })
      ]);
      let widgetSizeSource = {
        widgetHeights: [
          [1, 1, 1, 1, 1],
          [2, 2, 2, 2, 2],
          [3, 3, 3, 3, 3],
          [4, 4, 4, 4, 4],
          [5, 5, 5, 5, 5]
        ],
        headerHeights: [10, 10, 10, 10, 10],
        init() {},
        getWidgetSize(rowIndex, columnIndex) {
          let arr = rowIndex < 0 ? this.headerHeights : this.widgetHeights[rowIndex];
          let height = arr[columnIndex] === undefined ? null : arr[columnIndex];
          return {
            minWidth: null,
            width: null,
            maxWidth: null,
            minHeight: height,
            height: height,
            maxHeight: height
          };
        },
        _size: new qxl.datagrid.source.Position(5, 5),
        getDataSourceSize() {
          return this._size;
        }
      };
      let styling = new qxl.datagrid.ui.GridStyling().set({
        horizontalSpacing: 0,
        verticalSpacing: 0,
        minRowHeight: 0,
        numHeaderRows: 0,
        numFixedColumns: 0, // will change
        numFixedRows: 0 // will change
      });

      let sizeCalculator = new qxl.datagrid.ui.GridSizeCalculator(columns, styling, widgetSizeSource);

      /**
       * @param {0|1|2|3} fixedCols - either 0, 1, 2, or 3 the number of fixed columns
       * @param {0|1|2|3} fixedRows - either 0, 1, 2, or 3 the number of fixed rows
       */
      let subcase = (fixedCols, fixedRows) => {
        //! do not modify this tester's limits without also modifying the size source to accommodate
        if (![0, 1, 2, 3].includes(fixedCols) || ![0, 1, 2, 3].includes(fixedRows)) {
          return;
        }

        styling.setNumFixedColumns(fixedCols);
        styling.setNumFixedRows(fixedRows);

        let sizes = sizeCalculator.getSizesFor(12 - 2 * fixedCols, 12 - 2 * fixedRows, 2, 2);
        // see above; grid is offset by 2 in both directions, without fixed the idxs are [2, 3, 4], widths are [3, 4, 5]

        this.assertArrayEquals(
          // if there are more than zero (at least one) fixed rows, the first row is idx 0, otherwise it is idx 2
          // etc etc for other ternaries
          [fixedRows > 0 ? 0 : 2, fixedRows > 1 ? 1 : 3, fixedRows > 2 ? 2 : 4],
          sizes.rows.map(c => c.rowIndex)
        );
        // same as above, if gt 0, then width 1, else 3, etc etc
        this.assertTrue(sizes.rows[0].height == (fixedRows > 0 ? 1 : 3));
        this.assertTrue(sizes.rows[1].height == (fixedRows > 1 ? 2 : 4));
        this.assertTrue(sizes.rows[2].height == (fixedRows > 2 ? 3 : 5));

        this.assertArrayEquals(
          [fixedCols > 0 ? 0 : 2, fixedCols > 1 ? 1 : 3, fixedCols > 2 ? 2 : 4],
          sizes.columns.map(c => c.columnIndex)
        );
        this.assertTrue(sizes.columns[0].width == (fixedCols > 0 ? 1 : 3));
        this.assertTrue(sizes.columns[1].width == (fixedCols > 1 ? 2 : 4));
        this.assertTrue(sizes.columns[2].width == (fixedCols > 2 ? 3 : 5));
      };

      // cols only
      subcase(1, 0);
      subcase(2, 0);
      subcase(3, 0);

      // rows only
      subcase(0, 1);
      subcase(0, 2);
      subcase(0, 3);

      // cols and rows
      subcase(1, 1);
      subcase(2, 2);
      subcase(3, 3);
    }
  }
});
