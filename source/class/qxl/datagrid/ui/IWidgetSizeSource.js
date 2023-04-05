qx.Interface.define("qxl.datagrid.ui.IWidgetSizeSource", {
  members: {
    /**
     * Returns the size hint for a widget in a given row and column
     *
     * @param {Integer} rowIndex
     * @param {qxl.datagrid.column.Column} column
     * @return {*} see qx.ui.core.LayoutItem.getSizeHint
     */
    getWidgetSize(rowIndex, column) {}
  }
});
