/**
 * Defines the additional methods for a datasource for trees (eg specifies what the `qxl.datagrid.*.tree.*`
 * classes will expect)
 */
qx.Interface.define("qxl.datagrid.source.tree.ITreeDataSource", {
  members: {
    /**
     * @typedef {"none" | "open" | "closed"} NodeStateType
     *
     * @typedef NodeState
     * @property {Integer} level indentation level
     * @property {NodeStateType} state the state of the node - if a branch, then
     *  open or closed, else a leaf is just `none`
     *
     * @param {qx.core.Object} model
     * @return {NodeState}
     */
    getNodeStateFor(model) {}
  }
});
