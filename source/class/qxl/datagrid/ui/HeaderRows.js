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
 * Manages the widgets in the header
 */
qx.Class.define("qxl.datagrid.ui.HeaderRows", {
  extend: qx.ui.core.Widget,

  construct(sizeCalculator, widgetFactory) {
    super();
    this.__sizeCalculator = sizeCalculator;
    this.__widgetFactory = widgetFactory;
    this._setLayout(new qxl.datagrid.ui.layout.Fixed());
    this.getContentElement().setAttribute("role", "row");
  },

  properties: {
    appearance: {
      init: "qxl-datagrid-header",
      refine: true
    }
  },

  members: {
    /** @type{qxl.datagrid.ui.GridSizeCalculator} */
    __sizeCalculator: null,

    /** @type{qxl.datagrid.ui.factory.IWidgetFactory} */
    __widgetFactory: null,

    /** @type {Integer?} the column whose header cell has the keyboard focus */
    __focusedColumn: null,

    /**
     * Gives the header cell of a column the state `focused`, for the keyboard in the header
     *
     * @param {Integer?} column column index, null if no header cell has the focus
     */
    setFocusedColumn(column) {
      this.getCell(this.__focusedColumn)?.removeState("focused");
      this.__focusedColumn = column;
      this.getCell(column)?.addState("focused");
    },

    /**
     * Returns the DOM id of the header cell of a column, for `aria-activedescendant`
     *
     * @param {Integer} column column index
     * @return {String}
     */
    getCellId(column) {
      return "qxl-datagrid-" + this.toHashCode() + "-header-" + column;
    },

    /**
     * Returns the header cell of a column in the last header row, if it is on display
     *
     * @param {Integer?} column column index
     * @return {qx.ui.core.Widget?}
     */
    getCell(column) {
      if (column === null || column === undefined) {
        return null;
      }
      return this._getChildren().find(child => {
        let cellData = child.getUserData("qxl.datagrid.cellData");
        return cellData?.row == -1 && cellData.column == column;
      }) ?? null;
    },

    /**
     * @Override
     */
    _computeSizeHint() {
      let hint = super._computeSizeHint();
      let sizesData = this.__sizeCalculator.getSizes();
      if (sizesData) {
        let height = 0;
        for (let rowSizeData of sizesData.rows) {
          if (rowSizeData.rowIndex >= 0) {
            continue;
          }
          height += rowSizeData.height;
        }
        if (!hint.height || hint.height < height) {
          hint.height = height;
        }
      }
      return hint;
    },

    /**
     * Called to update the widgets and synchronise the sizes, creating widgets via the factory
     * if required and pooling/disposing of unused widgets
     */
    updateWidgets() {
      if (!this.__widgetFactory.getColumns()) {
        return;
      }
      let columns = this.__widgetFactory.getColumns();
      let styling = this.__sizeCalculator.getStyling();
      let sizesData = this.__sizeCalculator.getSizes();
      if (!sizesData) {
        return;
      }
      let numHeaderRows = styling.getNumHeaderRows();

      let children = {};
      qx.lang.Array.clone(this._getChildren()).forEach(child => {
        let cellData = child.getUserData("qxl.datagrid.cellData");
        let id = cellData.row + ":" + cellData.column;
        // a hidden column may lie between the columns laid out
        if (cellData.row > numHeaderRows || !sizesData.columnIndexes.has(cellData.column)) {
          this.__fullDiscardWidget(child, id);
        } else {
          children[id] = child;
        }
      });

      let horizontalSpacing = styling.getHorizontalSpacing();
      let verticalSpacing = styling.getVerticalSpacing();
      let top = 0;

      let gridStyleColSpanFn = styling.getColSpan();

      let currentRelativePosition = new qxl.datagrid.source.Position();
      let currentAbsolutePosition = new qxl.datagrid.source.Position();
      for (let rowSizeData of sizesData.rows) {
        let left = 0;
        if (rowSizeData.rowIndex >= 0) {
          continue;
        }
        let rowIndex = rowSizeData.rowIndex;
        // exclusive endIndex
        let lastColSpanEndIndex = -Infinity;

        for (let relativeColumnIndex = 0; relativeColumnIndex < sizesData.columns.length; relativeColumnIndex++) {
          let columnSizeData = sizesData.columns[relativeColumnIndex];
          let id = rowIndex + ":" + columnSizeData.columnIndex;
          let filledWidth = columnSizeData.width;

          let child = children[id];

          if (relativeColumnIndex < lastColSpanEndIndex) {
            this.__fullDiscardWidget(child, id);
            continue;
          }

          if (!child) {
            child = this.__widgetFactory.getWidgetFor(rowIndex, columnSizeData.columnIndex);
            children[id] = child;
            child.setUserData("qxl.datagrid.cellData", {
              row: rowIndex,
              column: columnSizeData.columnIndex
            });
            this._add(child);
            this.__widgetFactory.bindWidget(child);
            child.getContentElement().setAttribute("role", "columnheader");
            child.getContentElement().setAttribute("aria-colindex", columnSizeData.columnIndex + 1);
            if (rowIndex == -1) {
              child.getContentElement().setAttribute("id", this.getCellId(columnSizeData.columnIndex));
            }
          }
          if (rowIndex == -1 && columnSizeData.columnIndex === this.__focusedColumn) {
            child.addState("focused");
          } else {
            child.removeState("focused");
          }

          let callbackArguments = [null, child, currentRelativePosition, currentAbsolutePosition];

          let columnColSpanFn = columns.getColumn(columnSizeData.columnIndex).getColSpan();
          // setting a Position fires events, so only when there is a callback to receive it
          if (columnColSpanFn || gridStyleColSpanFn) {
            currentRelativePosition.set({ row: rowIndex, column: relativeColumnIndex });
            currentAbsolutePosition.set({ row: rowIndex, column: columnSizeData.columnIndex });
          }
          let colSpan = 1;
          if (columnColSpanFn) {
            colSpan = columnColSpanFn(() => gridStyleColSpanFn?.(...callbackArguments), ...callbackArguments);
          } else if (gridStyleColSpanFn) {
            colSpan = gridStyleColSpanFn(...callbackArguments);
          }
          colSpan = Math.floor(colSpan ?? 1);
          let cellData = child.getUserData("qxl.datagrid.cellData");
          if (cellData.colSpan !== colSpan) {
            child.setUserData("qxl.datagrid.cellData", { ...cellData, colSpan });
          }
          lastColSpanEndIndex = relativeColumnIndex + colSpan;
          for (let i = relativeColumnIndex + 1; i < lastColSpanEndIndex; i++) {
            filledWidth += sizesData.columns[i].width + horizontalSpacing;
          }

          // every change of layout properties invalidates the layout, so only for real changes
          let props = child.getLayoutProperties();
          if (props.left !== left || props.top !== top || props.width !== filledWidth || props.height !== rowSizeData.height) {
            child.setLayoutProperties({
              left: left,
              width: filledWidth,
              top: top,
              height: rowSizeData.height
            });
          }
          left += filledWidth + horizontalSpacing;
        }
        top += rowSizeData.height + verticalSpacing;
      }
    },

    __fullDiscardWidget(child, id) {
      if (child) {
        this.__widgetFactory.unbindWidget(child);
        child.setUserData("qxl.datagrid.cellData", null);
        this._remove(child);
        this.__widgetFactory.disposeWidget(child);
      }
    }
  }
});
