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
 *      * Will Johnson (willsterjohnson)
 *
 * *********************************************************************** */

/**
 * Basic decorations needed for the datagrid; this is for the Simple theme
 */
qx.Theme.define("qxl.datagrid.theme.simple.MDecoration", {
  decorations: {
    "qxl-datagrid-row": {
      style: {
        radius: 0,
        color: "table-row",
        width: [0, 0, 1, 0]
      }
    },

    "qxl-datagrid-row-focused": {
      style: {
        radius: 0,
        color: "table-row-selected",
        width: 1,
        style: "dashed"
      }
    },

    "qxl-datagrid-cell-focused": {
      style: {
        radius: 0,
        width: 1,
        color: "table-row-selected",
        style: "dashed"
      }
    }
  }
});
