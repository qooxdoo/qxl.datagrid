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

/**
 * Controls the sizes of grid components independently of the widgets
 *
 * Various UI widgets need to share sizes and proportions - for example, once the width and
 * spacing of individual columns are agreed, then the header WidgetPane and the body WidgetPane
 * need to share those exact numbers.
 *
 * @typedef ColumnData
 * @property {Integer} columnIndex the index in the complete list of columns
 * @property {qxl.datagrid.column.Column} column the column object
 * @property {Integer} width
 *
 * @typedef RowData
 * @property {Integer} rowIndex index into the entire dataset, will be negative for header rows
 * @property {Integer} height
 *
 * @typedef SizesData
 * @property {ColumnData[]} columns
 * @property {RowData[]} rows
 * @property {Integer} horizontalScrollPosition
 * @property {Integer} verticalScrollPosition
 */
qx.Class.define("qxl.datagrid.ui.GridSizeCalculator", {
  extend: qx.core.Object,

  /**
   * Constructor
   *
   * @param {qxl.datagrid.ui.IColumns} columns
   * @param {qxl.datagrid.ui.GridStyling} styling
   * @param {qxl.datagrid.ui.IWidgetSizeSource} widgetSizeSource
   */
  construct(columns, styling, widgetSizeSource) {
    super();
    this._columns = columns;
    this._widgetSizeSource = widgetSizeSource;
    if (styling) {
      this.setStyling(styling);
    }
  },

  properties: {
    /** The columns on display in this widget */
    columns: {
      init: null,
      nullable: true,
      check: "qxl.datagrid.column.IColumns",
      apply: "invalidate",
      event: "changeColumns"
    },

    /** Where to get styling criteria */
    styling: {
      nullable: false,
      check: "qxl.datagrid.ui.GridStyling",
      apply: "__applyStyling",
      event: "changeStyling"
    }
  },

  events: {
    /** Fired when the sizes change */
    change: "qx.data.event.Event"
  },

  members: {
    /** @type {qxl.datagrid.column.IColumns} the columns array on display */
    _columns: null,

    /** @type {qxl.datagrid.ui.IWidgetSizeSource} where to get w*/
    _widgetSizeSource: null,

    /** @type {SizesData} the cached sizes */
    __sizes: null,

    /** @type {Integer} the available width */
    _width: null,

    /** @type {Integer} the available height */
    _height: null,

    /** @type {Integer} the first row in the data source */
    _startRowIndex: null,

    /** @type {Integer} the first column in the data source */
    _startColumnIndex: null,

    /** @type {Integer} the left scroll position */
    _left: null,

    /** @type {Integer} the top scroll position */
    _top: null,

    /**
     * Gets the sizes for a given available size and scroll position of a Visible Space
     *
     * @param {Integer} width - the total available width of the Visible Space
     * @param {Integer} height - the total available height of the Visible Space
     * @param {Integer} startRowIndex - an Absolute Row Index representing the first row to be included in the Visible Space
     * @param {Integer} startColumnIndex - an Absolute Column Index representing the first column to be included in the Visible Space
     * @returns {SizesData} the sizes of rows and columns in the Visible Space
     */
    getSizesFor(width, height, startRowIndex, startColumnIndex) {
      this.setAvailableSize(width, height, startRowIndex, startColumnIndex, 0, 0);
      return this.getSizes();
    },

    /**
     * Sets the available sizes; this can trigger invalidation and a change event if the available
     * size or scroll position of the Visible Space has changed.
     *
     * @param {Integer} width - the total available width of the Visible Space
     * @param {Integer} height - the total available height of the Visible Space
     * @param {Integer} startRowIndex - an Absolute Row Index representing the first row to be included in the Visible Space
     * @param {Integer} startColumnIndex - an Absolute Column Index representing the first column to be included in the Visible Space
     * @param {Integer} left
     * @param {Integer} top
     * @returns {Boolean} true if the widgets need to be redrawn because the previous data is invalid
     */
    setAvailableSize(width, height, startRowIndex, startColumnIndex, left, top) {
      if (width !== this._width || height !== this._height || startRowIndex != this._startRowIndex || startColumnIndex != this._startColumnIndex) {
        this.invalidate();
        this._width = width;
        this._height = height;
        this._startRowIndex = startRowIndex;
        this._startColumnIndex = startColumnIndex;
        this._left = left;
        this._top = top;
      }
      return !this.__sizes;
    },

    /**
     * @returns {SizesData} the sizes of rows and columns in the Visible Space
     */
    getSizes() {
      if (!this.__sizes && this._width && this._height) {
        this.__sizes = this._calculateSizes();
      }
      return this.__sizes;
    },

    /**
     * Gets the left and top initial offsets
     *
     * @returns {{ left: Integer, top: Integer }} the offsets
     */
    getInitialOffsets() {
      return {
        left: this._left,
        top: this._top
      };
    },

    /**
     * Invalidates the sizes; this does not trigger a redraw, but the next time the sizes are
     * required they will be recalculated
     */
    invalidate() {
      this.__sizes = null;
    },

    /**
     * Calculates the size data
     *
     * - Visible Space
     *   - The range of cells which are currently visible to the user, based on sizes, scroll, etc.
     * - Absolute Index
     *   - The index of the full raw data, ignoring what may or may not be currently in the Visible Space
     * - Relative Index
     *   - The index of a column or row in the Visible Space, adjusted such that the top-left-most cell in the Visible Space is Vis(0,0)
     *   - eg, When the visible Space covers Abs(5,5) to Abs(10,10), Abs(5,5) is the same cell as Rel(0,0)
     * - Visible Index
     *   - An Absolute Index which is currently in the Visible Space
     *   - eg, Abs(5,2) is a Visible Index if the Visible Space covers Abs(5,5) to Abs(10,10)
     *
     * @returns {SizesData} the sizes of rows and columns in the Visible Space
     */
    _calculateSizes() {
      let styling = this.getStyling();

      let startIndex = {
        row: this._startRowIndex + styling.getNumFixedRows(),
        column: this._startColumnIndex + styling.getNumFixedColumns()
      };

      let flexColumnIndexes = [];
      let visibleColumnIndexes = [];
      let totalFlex = 0;
      /**
       * A map of absolute column indexes to their widths
       */
      let columnWidths = {};
      let flexAvailable = this._width;
      let horizontalSpacing = styling.getHorizontalSpacing();
      let verticalSpacing = styling.getVerticalSpacing();
      let totalColumnWidth = 0;

      /**
       * @param {Integer} absoluteColumnIndex
       */
      const calculateColumnWidth = absoluteColumnIndex => {
        let column = this._columns.getColumn(absoluteColumnIndex);
        visibleColumnIndexes.push(absoluteColumnIndex);

        let flex = column.getFlex() && column.getWidth() === null ? column.getFlex() : 0;

        let width = column.getWidth() ?? 0;
        let minWidth = column.getMinWidth() ?? 0;

        if (flex) {
          flexColumnIndexes.push(absoluteColumnIndex);
          totalFlex += flex;
          width = minWidth;
        } else {
          let maxWidth = column.getMaxWidth() ?? 0;
          if (width < minWidth) {
            width = minWidth;
          }
          if (maxWidth && width > maxWidth) {
            width = maxWidth;
          }
        }
        flexAvailable -= width;
        flexAvailable -= horizontalSpacing;
        columnWidths[absoluteColumnIndex] = width;
        if (visibleColumnIndexes.length > 0) {
          totalColumnWidth += horizontalSpacing;
        }
        totalColumnWidth += width;
      };

      // process the fixed columns. Regardless of the Visible Index, these are always the first N Absolute Indexes
      for (let absoluteColumnIndex = 0; absoluteColumnIndex < styling.getNumFixedColumns(); absoluteColumnIndex++) {
        calculateColumnWidth(absoluteColumnIndex);
      }

      if (startIndex.column >= 0) {
        // process the remaining columns, starting from the Visible Index
        for (let absoluteColumnIndex = startIndex.column; absoluteColumnIndex < this._columns.getLength(); absoluteColumnIndex++) {
          if (totalColumnWidth >= this._width) {
            break;
          }
          calculateColumnWidth(absoluteColumnIndex);
        }
      } else {
        // process the remaining columns, starting from the end and working backwards until the space is filled
        for (let absoluteColumnIndex = this._columns.getLength() - 1; absoluteColumnIndex >= 0; absoluteColumnIndex--) {
          if (totalColumnWidth >= this._width) {
            break;
          }
          calculateColumnWidth(absoluteColumnIndex);
        }
      }

      if (flexColumnIndexes.length) {
        let flexColumns = flexColumnIndexes.map(index => ({ index, column: this._columns.getColumn(index) }));
        flexColumns.sort((a, b) => {
          return (
            // smallest minWidth
            (a.column.getMinWidth() ?? 0) - (b.column.getMinWidth() ?? 0) ||
            // smallest maxWidth
            (a.column.getMaxWidth() ?? 0) - (b.column.getMaxWidth() ?? 0) ||
            // smallest flex
            (a.column.getFlex() ?? 0) - (b.column.getFlex() ?? 0)
          );
        });

        for (let { column, index } of flexColumns) {
          let flexAmount = Math.floor((flexAvailable / totalFlex) * column.getFlex());

          if (column.getMaxWidth()) {
            let maxFlex = column.getMaxWidth() - columnWidths[index];
            if (flexAmount > maxFlex) {
              flexAmount = maxFlex;
            }
          }

          flexAvailable -= flexAmount;
          totalColumnWidth += flexAmount;
          columnWidths[index] += flexAmount;
          totalFlex -= column.getFlex();
        }
      }

      let minRowHeight = styling.getMinRowHeight();
      let maxRowHeight = styling.getMaxRowHeight();
      /**
       * A map of absolute row indexes to their heights
       */
      let rowHeights = {};
      let totalRowHeight = 0;

      /**
       * @param {Integer} absoluteRowIndex
       */
      const calculateRowHeight = absoluteRowIndex => {
        let largestRowHeight = 0;
        for (let absoluteColumnIndex of visibleColumnIndexes) {
          let column = this._columns.getColumn(absoluteColumnIndex);
          let hint = this._widgetSizeSource.getWidgetSize(absoluteRowIndex, column);
          let rowHeight = hint.height || 0;
          if (rowHeight < hint.minHeight) {
            rowHeight = hint.minHeight;
          }
          if (hint.maxHeight && rowHeight > hint.maxHeight) {
            rowHeight = hint.maxHeight;
          }
          if (rowHeight < minRowHeight) {
            rowHeight = minRowHeight;
          }
          if (maxRowHeight && rowHeight > maxRowHeight) {
            largestRowHeight = rowHeight = maxRowHeight;
            // No point checking any further if we're already at the max height for the row
            break;
          }
          if (largestRowHeight < rowHeight) {
            largestRowHeight = rowHeight;
          }
        }
        rowHeights[absoluteRowIndex] = largestRowHeight;
        if (Object.keys(rowHeights).length > 0) {
          totalRowHeight += verticalSpacing;
        }
        totalRowHeight += largestRowHeight;
      };

      // process the header rows. Regardless of the Visible Index, these are always the *last* N Absolute Indexes
      for (let absoluteRowIndex = 0; absoluteRowIndex < styling.getNumHeaderRows(); absoluteRowIndex++) {
        // negative: index from end, increment: index `-0` isn't a real thing
        calculateRowHeight(-(absoluteRowIndex + 1));
      }

      // process the fixed rows. Regardless of the Visible Index, these are always the first N Absolute Indexes
      for (let absoluteRowIndex = 0; absoluteRowIndex < styling.getNumFixedRows(); absoluteRowIndex++) {
        calculateRowHeight(absoluteRowIndex);
      }

      let numRows = this._widgetSizeSource.getDataSourceSize().getRow();
      if (startIndex.row >= 0) {
        // process the remaining rows, starting from the Visible Index
        for (let absoluteRowIndex = startIndex.row; absoluteRowIndex < numRows; absoluteRowIndex++) {
          if (totalRowHeight >= this._height) {
            break;
          }
          // only calculate the row height if it hasn't already been calculated by the fixed rows/headers
          if (rowHeights[absoluteRowIndex] === undefined) {
            calculateRowHeight(absoluteRowIndex);
          }
        }
      } else {
        // process the remaining rows, starting from the end and working backwards until the space is filled
        for (let absoluteRowIndex = numRows - 1; absoluteRowIndex >= 0; absoluteRowIndex--) {
          if (totalRowHeight >= this._height) {
            break;
          }
          // only calculate the row height if it hasn't already been calculated by the fixed rows/headers
          if (rowHeights[absoluteRowIndex] === undefined) {
            calculateRowHeight(absoluteRowIndex);
          }
        }
      }

      let sizesData = {
        columns: [],
        rows: [],
        horizontalScrollPosition: 0,
        verticalScrollPosition: 0
      };

      for (let absoluteColumnIndex in columnWidths) {
        let numericIdx = parseInt(absoluteColumnIndex, 10);
        sizesData.columns.push({
          columnIndex: numericIdx,
          column: this._columns.getColumn(numericIdx),
          width: columnWidths[absoluteColumnIndex]
        });
      }

      for (let absoluteRowIndex in rowHeights) {
        let numericIdx = parseInt(absoluteRowIndex, 10);
        sizesData.rows.push({
          rowIndex: numericIdx,
          height: rowHeights[absoluteRowIndex]
        });
      }

      return sizesData;
    },

    /**
     * Apply for `styling`
     */
    __applyStyling(value, oldValue) {
      if (oldValue) {
        oldValue.removeListener("change", this.invalidate, this);
      }
      if (value) {
        value.addListener("change", this.invalidate, this);
      }
    }
  }
});
