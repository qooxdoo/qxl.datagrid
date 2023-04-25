qx.Class.define("qxl.datagrid.demo.tree.TreeDemoNodeInspector", {
  extend: qxl.datagrid.source.tree.NodeInspector,

  members: {
    /**
     * @override
     */
    canHaveChildren(node) {
      return node.getType() == "directory";
    }
  }
});
