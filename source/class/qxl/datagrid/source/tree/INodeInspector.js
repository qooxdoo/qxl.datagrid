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
    canHaveChildren(node) {},

    /**
     * Adds a change listener to the node's children and returns a binding object for that listener
     * @param {qx.core.Object} node The node of the tree of which the children the listener should be added to
     * @param {Function} fn Listener function
     * @param {Object?} context Context for listener function
     * @return {qxl.datagrid.binding.Bindings} The bindings object
     */
    createChildrenChangeBinding(node, fn, context) {},
    /**
     * @param {qx.core.Object} node The node to look at
     * @returns {qx.core.Object} The parent of the node, or null if it has no parent.
     */
    getParentOf(node) {}
  }
});
