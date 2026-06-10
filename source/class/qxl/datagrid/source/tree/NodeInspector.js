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
 * Base implementation of `qxl.datagrid.source.tree.INodeInspector`
 */
qx.Class.define("qxl.datagrid.source.tree.NodeInspector", {
  extend: qx.core.Object,
  implement: [qxl.datagrid.source.tree.INodeInspector],

  /**
   * Constructor
   *
   * @param {(Boolean | CanHaveChildren) ? true} canHaveChildren default return value for `canHaveChildren()`
   * @param {GetChildrenOf ? null} getChildrenOf function to get children of a node
   *
   * @callback CanHaveChildren
   * @param {Object} node
   * @returns {Boolean}
   *
   * @callback GetChildrenOf
   * @param {Object} node
   * @returns {Promise<qx.data.Array>}
   */
  construct(canHaveChildren, getChildrenOf) {
    super();

    this.__getChildrenOfImpl =
      getChildrenOf ??
      async function (node) {
        if (node) {
          let upname = qx.lang.String.firstUp(this.getChildrenPath());
          let children = await node["get" + upname]();
          return children;
        }
        return null;
      };

    this.__canHaveChildrenImpl = typeof canHaveChildren == "function" ? canHaveChildren : () => !(canHaveChildren === false);
  },

  properties: {
    /** Where to find the children of the node */
    childrenPath: {
      init: "children",
      check: "String"
    },

    /** Where to find the parent of the node */
    parentPath: {
      init: "parent",
      check: "String"
    }
  },

  members: {
    /** @type {CanHaveChildren} default return value for `canHaveChildren()` */
    __canHaveChildrenImpl: true,

    /** @type {GetChildrenOf} function to get children of a node */
    __getChildrenOfImpl: null,

    /**
     * @override
     */
    async getChildrenOf(node) {
      return this.__getChildrenOfImpl(node);
    },

    /**
     * @override
     */
    canHaveChildren(node) {
      return this.__canHaveChildrenImpl(node);
    },

    /**
     * @override
     */
    createChildrenChangeBinding(node, cb, context) {
      let children = node.get(this.getChildrenPath());
      return new qxl.datagrid.binding.Bindings(children, children.addListener("change", cb, context), "listener");
    },

    /**
     * @override
     */
    async getParentOf(node) {
      return node.get(this.getParentPath());
    }
  }
});
