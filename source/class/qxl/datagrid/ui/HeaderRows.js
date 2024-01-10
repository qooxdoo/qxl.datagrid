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
     * Called to update the widgets and synchronise the sizes, creating widgets via the factory
     * if required and pooling/disposing of unused widgets
     */
    updateWidgets() {
      if (!this.__widgetFactory.getColumns()) {
        return;
      }
      let styling = this.__sizeCalculator.getStyling();
      let sizesData = this.__sizeCalculator.getSizes();
      if (!sizesData) {
        return;
      }
      let numHeaderRows = styling.getNumHeaderRows();
      let minColumnIndex = sizesData.columns[0].columnIndex;
      let maxColumnIndex = sizesData.columns[sizesData.columns.length - 1].columnIndex;

      let children = {};
      qx.lang.Array.clone(this._getChildren()).forEach(child => {
        let cellData = child.getUserData("qxl.datagrid.cellData");
        // prettier-ignore
        if (cellData.row > numHeaderRows || 
            cellData.column < minColumnIndex || 
            cellData.column > maxColumnIndex) {
          this.__widgetFactory.unbindWidget(child);
          child.setUserData("qxl.datagrid.cellData", null);
          this._remove(child);
          this.__widgetFactory.disposeWidget(child);
        } else {
          let id = cellData.row + ":" + cellData.column;
          children[id] = child;
        }
      });

      let horizontalSpacing = styling.getHorizontalSpacing();
      let verticalSpacing = styling.getVerticalSpacing();
      let top = 0;
      for (let rowSizeData of sizesData.rows) {
        let left = 0;
        if (rowSizeData.rowIndex >= 0) {
          continue;
        }
        let rowIndex = -1 - rowSizeData.rowIndex;

        for (let visibleColumnIndex = 0; visibleColumnIndex < sizesData.columns.length; visibleColumnIndex++) {
          let columnSizeData = sizesData.columns[visibleColumnIndex];
          let id = rowIndex + ":" + columnSizeData.columnIndex;

          let child = children[id];
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

          child.setLayoutProperties({
            left: left,
            width: columnSizeData.width,
            top: top,
            height: rowSizeData.height
          });
          child.getSizeHint(true);
          left += columnSizeData.width + horizontalSpacing;
        }
        top += rowSizeData.height + verticalSpacing;
      }
    }
  }
});
