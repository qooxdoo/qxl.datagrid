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
qx.Class.define("qxl.datagrid.ui.GridSizes", {
  extend: qx.core.Object,

  /**
   * Constructor
   *
   * @param {qxl.datagrid.ui.IColumns} columns
   * @param {qxl.datagrid.ui.IWidgetSizeSource} widgetSizeSource
   * @param {qxl.datagrid.ui.GridStyling} styling
   */
  construct(columns, widgetSizeSource, styling) {
    super();
    this._columns = columns;
    this._widgetSizeSource = widgetSizeSource;
    this._styling = styling;
    styling.addListener("change", this.invalidate, this);
  },

  events: {
    /** Fired when the sizes change */
    change: "qx.data.event.Event"
  },

  members: {
    /** @type{qxl.datagrid.ui.IColumns} the columns array on display */
    _columns: null,

    /** @type{qxl.datagrid.ui.IWidgetSizeSource} where to get w*/
    _widgetSizeSource: null,

    /** @type{qxl.datagrid.ui.GridStyling} common styling configuration */
    _styling: null,

    /** @type{SizesData} the cached sizes */
    __sizes: null,

    /** @type{Integer} the available width */
    _width: null,

    /** @type{Integer} the available height */
    _height: null,

    /** @type{Integer} the first row in the data source */
    _startRowIndex: null,

    /** @type{Integer} the first column in the data source */
    _startColumnIndex: null,

    /**
     * Gets the sizes
     *
     * @returns {SizesData}
     */
    getSizes(width, height, startRowIndex, startColumnIndex) {
      if (width !== this._width || height !== this._height || startRowIndex != this._startRowIndex || startColumnIndex != this._startColumnIndex) {
        this.invalidate();
        this._width = width;
        this._height = height;
        this._startRowIndex = startRowIndex;
        this._startColumnIndex = startColumnIndex;
      }
      if (!this.__sizes) {
        this.__sizes = this._calculateSizes();
      }
      return this.__sizes;
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
     * @returns {SizesData}
     */
    _calculateSizes() {
      let flexColumnIndexes = [];
      let visibleColumnIndexes = [];
      let totalFlex = 0;
      let columnWidths = [];
      let lastFlexColumnIndex = -1;
      let flexAvailable = this._width;
      let horizontalSpacing = this._styling.getHorizontalSpacing();
      let verticalSpacing = this._styling.getVerticalSpacing();
      let totalColumnWidth = 0;

      const calculateColumnWidth = columnIndex => {
        let column = this._columns.getColumn(columnIndex);
        visibleColumnIndexes.push(columnIndex);

        let flex = column.getFlex() && column.getWidth() === null ? column.getFlex() : 0;
        let width;
        if (flex) {
          flexColumnIndexes.push(columnIndex);
          lastFlexColumnIndex = columnIndex;
          totalFlex += flex;
          width = column.getMinWidth();
        } else {
          width = column.getWidth() || 0;
          let minWidth = column.getMinWidth() || 0;
          if (width < minWidth) {
            width = minWidth;
          }
        }

        let maxWidth = column.getMaxWidth();
        if (maxWidth && width > maxWidth) {
          width = maxWidth;
        }
        if (!flex) {
          flexAvailable -= width;
        }
        columnWidths[columnIndex] = width;

        if (visibleColumnIndexes.length > 0) {
          totalColumnWidth += horizontalSpacing;
        }
        totalColumnWidth += width;
      };

      let numFixedColumns = this._styling.getNumFixedColumns();
      if (numFixedColumns > 0) {
        for (let columnIndex = 0; columnIndex < numFixedColumns; columnIndex++) {
          calculateColumnWidth(columnIndex);
        }
      }

      for (let columnIndex = this._startColumnIndex; columnIndex < this._columns.getLength(); columnIndex++) {
        if (totalColumnWidth > this._width) {
          break;
        }
        calculateColumnWidth(columnIndex);
      }

      if (flexColumnIndexes.length) {
        let flexUnit = flexAvailable / totalFlex;

        for (let columnIndex in flexColumnIndexes) {
          let column = this._columns.getColumn(columnIndex);
          let flex = column.getFlex();
          let width = Math.floor(flexUnit * flex);
          let minWidth = column.getMinWidth() || 0;
          if (width < minWidth) {
            width = minWidth;
          }
          if (columnIndex == lastFlexColumnIndex && flexAvailable > width) {
            width = flexAvailable;
          }
          let maxWidth = column.getMaxWidth();
          if (maxWidth && width > maxWidth) {
            width = maxWidth;
          }
          flexAvailable -= width;
          if (columnWidths[columnIndex]) {
            totalColumnWidth -= columnWidths[columnIndex];
          }
          totalColumnWidth += width;
          columnWidths[columnIndex] = width;
        }
      }

      let minRowHeight = this._styling.getMinRowHeight();
      let maxRowHeight = this._styling.getMaxRowHeight();
      let rowHeights = [];
      let totalRowHeight = 0;

      const calculateRowHeight = rowIndex => {
        let largestRowHeight = 0;
        for (let columnIndex in visibleColumnIndexes) {
          let column = this._columns.getColumn(columnIndex);
          let hint = this._widgetSizeSource.getWidgetSize(rowIndex, column);
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
        rowHeights[rowIndex] = largestRowHeight;
        if (rowHeights.length > 0) {
          totalRowHeight += verticalSpacing;
        }
        totalRowHeight += largestRowHeight;
      };

      for (let rowIndex = 0; rowIndex < this._styling.getNumHeaderRows(); rowIndex++) {
        calculateRowHeight(-1 - rowIndex);
      }

      let numFixedRows = this._styling.getNumFixedRows();
      if (numFixedRows > 0) {
        for (let rowIndex = 0; rowIndex < numFixedRows; rowIndex++) {
          calculateRowHeight(rowIndex);
        }
      }

      for (let rowIndex = this._startRowIndex; true; rowIndex++) {
        if (totalRowHeight > this._height) {
          break;
        }
        if (rowHeights[rowIndex] === undefined) {
          calculateRowHeight(rowIndex);
        }
      }

      let sizesData = {
        columns: [],
        rows: [],
        horizontalScrollPosition: 0,
        verticalScrollPosition: 0
      };

      for (let columnIndex in columnWidths) {
        columnIndex = parseInt(columnIndex, 10);
        sizesData.columns.push({
          columnIndex: columnIndex,
          width: columnWidths[columnIndex]
        });
      }

      for (let rowIndex in rowHeights) {
        rowIndex = parseInt(rowIndex, 10);
        sizesData.rows.push({
          rowIndex: rowIndex,
          height: rowHeights[rowIndex]
        });
      }

      return sizesData;
    }
  }
});
