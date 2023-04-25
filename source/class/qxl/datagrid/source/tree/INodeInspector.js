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
