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
 * Basic appearances needed for the datagrid; this is for the Tangible theme
 */
qx.Theme.define("qxl.datagrid.theme.tangible.MAppearance", {
  appearances: {
    "qxl-datagrid": "widget",
    "qxl-datagrid/scrollbar-x": "scrollbar",
    "qxl-datagrid/scrollbar-y": "scrollbar",

    "qxl-datagrid-header": "table-scroller/header",
    "qxl-datagrid-header-cell": "widget",

    "qxl-datagrid-widgetpane": {
      style(states) {
        return {
          backgroundColor: "transparent"
        };
      }
    },

    "qxl-datagrid-cell": {
      style(states) {
        let backgroundColor = "transparent";
        let decorator;
        if (states.selected) {
          backgroundColor = "qxl-datagrid-row-background-selected";
        }
        if (states.focused) {
          decorator = "qxl-datagrid-cell-focused";
        }
        return {
          backgroundColor,
          decorator
        };
      }
    },
    "qxl-datagrid-row": {
      style(states) {
        let backgroundColor = "qxl-datagrid-row-background-even";
        if (states.selected) {
          backgroundColor = "qxl-datagrid-row-background-selected";
        } else if (states.odd) {
          backgroundColor = "qxl-datagrid-row-background-odd";
        }
        let decorator = "qxl-datagrid-row";
        if (states.focused) {
          decorator += "-focused";
        }
        return {
          backgroundColor,
          decorator
        };
      }
    }
  }
});
