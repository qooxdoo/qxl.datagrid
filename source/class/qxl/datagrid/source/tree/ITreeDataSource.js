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
