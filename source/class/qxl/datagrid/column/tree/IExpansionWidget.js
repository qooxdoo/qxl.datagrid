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
 *      * Will Johnson (willsterjohnson)
 *
 * *********************************************************************** */

qx.Interface.define("qxl.datagrid.column.tree.IExpansionWidget", {
  properties: {
    /** How deep the indentation level is */
    indentationLevel: {
      init: 0,
      check: "Integer"
    }
  },

  members: {
    /**
     * Returns the expander widget
     *
     * @return {qx.ui.core.Widget}
     */
    getExpander() {},

    /**
     * Returns the widget for displaying the object
     *
     * @return {qx.ui.core.Widget}
     */
    getLabel() {}
  }
});
