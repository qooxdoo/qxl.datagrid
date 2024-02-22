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
 * Provides size information
 */
qx.Interface.define("qxl.datagrid.ui.IWidgetSizeSource", {
  members: {
    /**
     * Returns the size hint for a widget in a given row and column
     *
     * @param {Integer} rowIndex
     * @param {Integer} columnIndex
     * @return {*} see qx.ui.core.LayoutItem.getSizeHint
     */
    getWidgetSize(rowIndex, columnIndex) {},

    /**
     * Returns the size of the datasource
     *
     * @returns {qxl.datagrid.source.Position}
     */
    getDataSourceSize() {}
  }
});
