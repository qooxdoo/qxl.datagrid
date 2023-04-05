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
