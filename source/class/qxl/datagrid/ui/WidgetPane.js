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

qx.Class.define("qxl.datagrid.ui.WidgetPane", {
  extend: qx.ui.core.Widget,

  construct(sizeCalculator, widgetFactory, dataSource) {
    super();
    this.__sizeCalculator = sizeCalculator;
    this.__widgetFactory = widgetFactory;
    if (dataSource) {
      this.setDataSource(dataSource);
    }
    this._setLayout(new qxl.datagrid.ui.layout.Fixed());
  },

  properties: {
    /** The data source */
    dataSource: {
      init: null,
      check: "qxl.datagrid.source.IDataSource",
      event: "changeDataSource"
    }
  },

  members: {
    /** @type{qxl.datagrid.ui.GridSizeCalculator} */
    __sizeCalculator: null,

    /** @type{qxl.datagrid.ui.factory.IWidgetFactory} */
    __widgetFactory: null,

    /**
     * Called to update the widgets and synchronise the sizes, creating widgets via the factory
     *
     * @return {Promise?}
     */
    updateWidgets() {
      if (!this.__widgetFactory.getColumns()) {
        return;
      }
      let dataSource = this.getDataSource();
      let styling = this.__sizeCalculator.getStyling();
      let sizesData = this.__sizeCalculator.getSizes();
      if (!sizesData) {
        return;
      }
      let minColumnIndex = sizesData.columns[0].columnIndex;
      let maxColumnIndex = sizesData.columns[sizesData.columns.length - 1].columnIndex;

      let minRowIndex = null;
      let maxRowIndex = null;
      let minDataRowIndex = null;
      sizesData.rows.forEach(row => {
        if (row.rowIndex >= 0 && (minDataRowIndex === null || minDataRowIndex > row.rowIndex)) {
          minDataRowIndex = row.rowIndex;
        }
        if (minRowIndex === null || minRowIndex > row.rowIndex) {
          minRowIndex = row.rowIndex;
        }
        if (maxRowIndex === null || maxRowIndex < row.rowIndex) {
          maxRowIndex = row.rowIndex;
        }
      });

      let range = new qxl.datagrid.source.Range([minDataRowIndex, minColumnIndex], [maxRowIndex, maxColumnIndex]);
      let start = range.getStart();
      while (start.getRow() < 0) {
        start.increment(1, 0);
      }
      if (!dataSource.isAvailable(range)) {
        let promise = dataSource.makeAvailable(range).then(() => this.updateWidgets());
        return promise;
      }

      let children = {};
      qx.lang.Array.clone(this._getChildren()).forEach(child => {
        let cellData = child.getUserData("qxl.datagrid.cellData");
        // prettier-ignore
        if (cellData.row < minDataRowIndex || 
            cellData.row > maxRowIndex || 
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
      for (let visibleRowIndex = 0; visibleRowIndex < sizesData.rows.length; visibleRowIndex++) {
        let left = 0;
        let rowSizeData = sizesData.rows[visibleRowIndex];
        // Negative rowIndex means its a header row
        if (rowSizeData.rowIndex < 0) {
          continue;
        }

        for (let visibleColumnIndex = 0; visibleColumnIndex < sizesData.columns.length; visibleColumnIndex++) {
          let columnSizeData = sizesData.columns[visibleColumnIndex];
          let id = rowSizeData.rowIndex + ":" + columnSizeData.columnIndex;

          let child = children[id];
          if (!child) {
            child = this.__widgetFactory.getWidgetFor(rowSizeData.rowIndex, columnSizeData.columnIndex);
            children[id] = child;
            child.setUserData("qxl.datagrid.cellData", {
              row: rowSizeData.rowIndex,
              column: columnSizeData.columnIndex
            });
            this._add(child);
            let model = dataSource.getValueAt(new qxl.datagrid.source.Position(rowSizeData.rowIndex, columnSizeData.columnIndex));
            this.__widgetFactory.bindWidget(child, model);
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
