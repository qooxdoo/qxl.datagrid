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
   * @param {Boolean?true} canHaveChildren default return value for `canHaveChildren()`
   */
  construct(canHaveChildren) {
    super();
    this.__canHaveChildren = !(canHaveChildren === false);
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
    /** @type{Boolean} default return value for `canHaveChildren()` */
    __canHaveChildren: true,

    /**
     * @override
     */
    async getChildrenOf(node) {
      if (node) {
        let upname = qx.lang.String.firstUp(this.getChildrenPath());
        let children = await node["get" + upname]();
        return children;
      }
      return null;
    },

    /**
     * @override
     */
    canHaveChildren(node) {
      return this.__canHaveChildren;
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
