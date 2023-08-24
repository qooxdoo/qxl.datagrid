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
 * Basic decorations needed for the datagrid; this is for the Tangible theme
 */
qx.Theme.define("qxl.datagrid.theme.tangible.MDecoration", {
  decorations: {
    "qxl-datagrid-row": {
      style: {
        radius: 0,
        color: "text-hint-on-surface",
        width: [0, 0, 1, 0]
      }
    },

    "qxl-datagrid-row-focused": {
      style: {
        radius: 0,
        color: "text-hint-on-surface",
        width: 1,
        style: "dashed"
      }
    },

    "qxl-datagrid-cell-focused": {
      style: {
        radius: 0,
        width: 1,
        color: "text-hint-on-surface",
        style: "dashed"
      }
    }
  }
});
