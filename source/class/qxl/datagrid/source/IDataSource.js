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

qx.Interface.define("qxl.datagrid.source.IDataSource", {
  members: {
    /**
     * Tells the datasource to make sure that the range of cells is available; anything outside of the
     * range can be discarded (or cached, it's implementation dependent)
     *
     * @param {qxl.datagrid.source.Range} range
     */
    async makeAvailable(range) {},

    /**
     * Gets a value from a coordinate in the grid
     *
     * @param {qxl.datagrid.source.Position} pos
     * @return {*}
     */
    getValueAt(pos) {},

    /**
     * Returns the size of the datasource
     *
     * @return {qxl.datagrid.source.Position}
     */
    getSize() {}
  }
});
