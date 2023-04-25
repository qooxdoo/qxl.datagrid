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
 * Creates widgets on demand and binds them to model objects in the grid
 */
qx.Interface.define("qxl.datagrid.ui.factory.IWidgetFactory", {
  properties: {
    /** The data source */
    dataSource: {
      init: null,
      check: "qxl.datagrid.source.IDataSource",
      event: "changeDataSource"
    }
  },

  members: {
    /**
     * Provides a widget for a given row and column in the datasource; the widget will not
     * be reused (it will be disposed when no longer needed)
     *
     * @param {Integer} rowIndex row in the data source not on the display
     * @param {Integer} columnIndex column in the data source not on the display
     * @return {qx.ui.core.Widget} the new widget
     */
    getWidgetFor(rowIndex, columnIndex) {},

    /**
     * Called to bind thej previously given widget to the model
     *
     * @param {qx.ui.core.Widget} widget the widget to bind
     * @param {qxl.datagrid.column.Column} column the column that it is for
     * @param {qx.core.Object} model the model to bind
     * @return {qxl.datagrid.binding.IBinding} the binding
     */
    bindWidget(widget, column, model) {},

    /**
     * Unbinds the widget
     *
     * @param {qx.ui.core.Widget} widget as previously returned by `getWidgetFor`
     */
    unbindWidget(widget) {},

    /**
     * Obtains the model which is bound to the widget
     *
     * @param {qx.ui.core.Widget} widget
     * @return {qx.core.Object}
     */
    getModelForWidget(widget) {}
  }
});
