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
 * In order for a `qxl.datagrid.source.tree.TreeDataSource` to navigate the data, it uses
 * an instance of this class
 */
qx.Interface.define("qxl.datagrid.source.tree.INodeInspector", {
  members: {
    /**
     * Obtains the children of a node in the tree
     *
     * @param {qx.core.Object} node an object to look at
     * @return {qx.core.Object[]?} the children
     */
    async getChildrenOf(node) {},

    /**
     * Detects whether the node can have children (ie is it a [potential] branch or a leaf?)
     * @param {qx.core.Object?} node
     * @return {Boolean}
     */
    canHaveChildren(node) {}
  }
});
