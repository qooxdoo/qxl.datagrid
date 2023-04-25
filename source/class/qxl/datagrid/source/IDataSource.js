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
 * The DataGrid obtains the data it displays from an `qxl.datagrid.source.IDataSource`
 */
qx.Interface.define("qxl.datagrid.source.IDataSource", {
  members: {
    /**
     * Asks the datasource to whether the range of cells is available without having to make an
     * asynchronous call; if the return is `true` then `makeAvailable` will not be called
     *
     * @param {qxl.datagrid.source.Range} range
     * @return {Boolean}
     */
    isAvailable(range) {},

    /**
     * Tells the datasource to make sure that the range of cells is available; anything outside of the
     * range can be discarded (or cached, it's implementation dependent)
     *
     * @param {qxl.datagrid.source.Range} range
     */
    async makeAvailable(range) {},

    /**
     * Gets a value from a coordinate in the grid; not all data sources support two dimensional models,
     * so it is entirely reasonable for a data source to return a model for column 0.  It is the
     * `qxl.datagrid.column.Column` which is responsible for pulling columnar value data for display
     *
     *
     * @param {qxl.datagrid.source.Position} pos
     * @return {*}
     */
    getModelForPosition(pos) {},

    /**
     * Finds the row & column co-ordinate of a model value
     *
     * @param {*} value
     * @return {qxl.datagrid.source.Position}
     */
    getPositionOfModel(value) {},

    /**
     * Returns the size of the datasource
     *
     * @return {qxl.datagrid.source.Position}
     */
    getSize() {}
  },

  events: {
    /** Fired when the size changes */
    changeSize: "qx.event.type.Data"
  }
});
