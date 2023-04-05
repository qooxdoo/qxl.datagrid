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
 * Implemented by objects that can provide a list of columns for the datagrid.
 *
 * Columns can be shared between column indexes, eg a generic column could be implemented
 * and the same instance returned for multiple columns - this means that may not be appropriate
 * to use the `toHashCode` of the column as a lookup.
 *
 * Columns cannot be reordered - it is up to the UI to maintain mappings between the column
 * order and filter on display and the underlying columns.
 */
qx.Interface.define("qxl.datagrid.column.IColumns", {
  members: {
    getColumn(index) {},

    getLength() {},

    indexOf(column) {}
  }
});
