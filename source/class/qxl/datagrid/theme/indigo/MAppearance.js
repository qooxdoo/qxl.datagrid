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
 * Basic appearances needed for the datagrid; this is for the Indigo theme
 */
qx.Theme.define("qxl.datagrid.theme.indigo.MAppearance", {
  appearances: {
    "qxl-datagrid": "widget",
    "qxl-datagrid/scrollbar-x": "scrollbar",
    "qxl-datagrid/scrollbar-y": "scrollbar",

    "qxl-datagrid-header": "table-scroller/header",
    // the button for the column menu looks like the one of qx.ui.table
    "qxl-datagrid-column-button": "table/column-button",
    "qxl-datagrid-header-cell": {
      include: "widget",
      style(states) {
        // the keyboard focus in the header, like a focused cell
        return {
          decorator: states.focused ? "qxl-datagrid-cell-focused" : undefined
        };
      }
    },

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
        let textColor = "qxl-datagrid-row";
        let decorator;
        if (states.selected) {
          backgroundColor = "qxl-datagrid-row-background-selected";
          textColor = "qxl-datagrid-row-selected";
        }
        if (states.focused) {
          decorator = "qxl-datagrid-cell-focused";
        }
        if (states.invalid) {
          decorator = "qxl-datagrid-cell-invalid";
        }
        return {
          backgroundColor,
          textColor,
          decorator
        };
      }
    },
    "qxl-datagrid-row": {
      style(states) {
        let backgroundColor = "qxl-datagrid-row-background-even";
        let textColor = "qxl-datagrid-row";
        if (states.selected) {
          backgroundColor = "qxl-datagrid-row-background-selected";
          textColor = "qxl-datagrid-row-selected";
        } else if (states.odd) {
          backgroundColor = "qxl-datagrid-row-background-odd";
        }
        let decorator = "qxl-datagrid-row";
        if (states.focused) {
          decorator += "-focused";
        }
        return {
          backgroundColor,
          textColor,
          decorator
        };
      }
    }
  }
});
