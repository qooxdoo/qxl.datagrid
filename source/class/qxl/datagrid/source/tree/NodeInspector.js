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

qx.Class.define("qxl.datagrid.source.tree.NodeInspector", {
  extend: qx.core.Object,

  construct() {
    super();
  },

  properties: {
    childrenPath: {
      check: "String"
    }
  },

  members: {
    /**
     * Obtains the children of a node in the tree
     *
     * @param {qx.core.Object} node an object to look at
     * @return {qx.core.Object[]?} the children
     */
    async getChildrenOf(node) {
      if (node) {
        let upname = qx.lang.String.firstUp(this.getChildrenPath());
        let children = await node["get" + upname]();
        return children;
      }
      return null;
    }
  }
});
