/* ************************************************************************
 *
 *    Qooxdoo DataGrid
 *
 *    https://github.com/qooxdoo/qooxdoo
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 * *********************************************************************** */

/**
 * What the demos add to the appearance of the grid: the state "changed" of the array demo, set by
 * `rowStates` and `cellStates`, and a visible icon on the column button. `base: true` keeps everything
 * else of the grid's appearance (selection, focus, errors), so nothing of it is copied here.
 */
qx.Theme.define("qxl.datagrid.demo.theme.tangible.DemoAppearance", {
  extend: qxl.datagrid.demo.theme.tangible.Appearance,

  appearances: {
    "qxl-datagrid-cell": {
      base: true,
      style(states) {
        return states.changed && !states.selected ? { backgroundColor: "qxl-datagrid-demo-changed-cell" } : {};
      }
    },

    "qxl-datagrid-row": {
      base: true,
      style(states) {
        return states.changed && !states.selected ? { backgroundColor: "qxl-datagrid-demo-changed-row" } : {};
      }
    },

    // the column button of qx.ui.table (which the grid's column button takes) is an alias of "button",
    // so in this theme its icon took the white of primary buttons on its white background
    "table/column-button/icon": {
      style(states) {
        return { textColor: "text-primary-on-surface" };
      }
    }
  }
});
