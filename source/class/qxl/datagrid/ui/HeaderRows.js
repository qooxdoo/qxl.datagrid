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

    /**
     * @Override
     */
    _computeSizeHint() {
      let hint = super._computeSizeHint();
      let sizesData = this.__sizeCalculator.getSizes();
      if (sizesData) {
        let height = 0;
        for (let rowSizeData of sizesData.rows) {
          let left = 0;
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
      let minColumnIndex = sizesData.columns[0]?.columnIndex ?? 0;
      let maxColumnIndex = sizesData.columns[sizesData.columns.length - 1]?.columnIndex ?? 0;

      let children = {};
      qx.lang.Array.clone(this._getChildren()).forEach(child => {
        let cellData = child.getUserData("qxl.datagrid.cellData");
        let id = cellData.row + ":" + cellData.column;
        // prettier-ignore
        if (cellData.row > numHeaderRows || cellData.column < minColumnIndex || cellData.column > maxColumnIndex) {
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
          }

          let callbackArguments = [null, child, currentRelativePosition, currentAbsolutePosition];

          currentRelativePosition.set({ row: rowIndex, column: relativeColumnIndex });
          currentAbsolutePosition.set({ row: rowIndex, column: columnSizeData.columnIndex });

          let columnColSpanFn = columns.getColumn(columnSizeData.columnIndex).getColSpan();
          let colSpan = 1;
          if (columnColSpanFn) {
            colSpan = columnColSpanFn(() => gridStyleColSpanFn?.(...callbackArguments), ...callbackArguments);
          } else if (gridStyleColSpanFn) {
            colSpan = gridStyleColSpanFn(...callbackArguments);
          }
          colSpan = Math.floor(colSpan ?? 1);
          child.setUserData("qxl.datagrid.cellData", {
            ...child.getUserData("qxl.datagrid.cellData"),
            colSpan
          });
          lastColSpanEndIndex = relativeColumnIndex + colSpan;
          for (let i = relativeColumnIndex + 1; i < lastColSpanEndIndex; i++) {
            filledWidth += sizesData.columns[i].width + horizontalSpacing;
          }

          child.setLayoutProperties({
            left: left,
            width: filledWidth,
            top: top,
            height: rowSizeData.height
          });
          child.getSizeHint(true);
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
