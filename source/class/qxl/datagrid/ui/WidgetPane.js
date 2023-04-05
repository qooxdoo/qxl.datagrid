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

  properties: {
    /** The columns on display in this widget */
    columns: {
      init: null,
      nullable: true,
      check: "qxl.datagrid.column.IColumns",
      apply: "__applyColumns",
      event: "changeColumns"
    }
  },

  members: {
    /**
     * Apply for `columns`
     */
    __applyColumns(value) {
      this.scheduleLayoutUpdate();
    },

    /**
     * @Override
     */
    renderLayout(left, top, width, height) {
      let columns = this.getColumns();

      super.renderLayout(left, top, width, height);
    },

    /**
     * @Override
     */
    _computeSizeHint() {
      let size = super._computeSizeHint();
      let columns = this.getColumns();
      let hasFlexColumn = columns.toArray().find(column => !!column.getFlex());
      let minWidth = 0;
      let maxWidth = 0;

      // Any flex columns at all mean that we use all available width,
      //  which is what the default size is
      if (!hasFlexColumn) {
        for (let column of columns) {
          minWidth += column.getMinWidth() || 0;
          if (column.getMaxWidth() !== null) {
            maxWidth += column.getMaxWidth();
          }
        }
      }

      if (minWidth && size.minWidth < minWidth) {
        size.minWidth = minWidth;
      }
      if (maxWidth && size.maxWidth > maxWidth) {
        size.maxWidth = maxWidth;
      }
      return size;
    }
  }
});
