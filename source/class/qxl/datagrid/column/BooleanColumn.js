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
 * Displays a boolean as a check mark; the value is switched directly with Space, F2, Enter or a
 * click, without an editor.
 *
 * A cell with true has the state `checked`; a theme which gives `qxl-datagrid-cell/icon` a source for
 * it shows that icon instead of `checkMark`. A font icon takes the text color of the cell.
 */
qx.Class.define("qxl.datagrid.column.BooleanColumn", {
  extend: qxl.datagrid.column.Column,

  /**
   * @param {String?} path the path to the value in the model
   */
  construct(path) {
    super(path);
    this.setBindingOptions((widget, model) => ({
      converter: value => (value ? { label: this.getCheckMark(), checked: true } : null)
    }));
  },

  properties: {
    /** The text shown for true, unless the theme gives an icon */
    checkMark: {
      init: "✓",
      check: "String",
      event: "changeCheckMark"
    }
  },

  members: {
    /**
     * @override
     */
    createWidgetForDisplay() {
      return new qxl.datagrid.ui.IconCell();
    },

    /**
     * @override
     */
    createWidgetForEdit() {
      return null;
    },

    /**
     * @override
     */
    getToggledValue(value) {
      return !value;
    },

    /**
     * @override
     */
    formatForClipboard(value) {
      return value ? "true" : "false";
    },

    /**
     * Accepts "true"/"false", "1"/"0" and the check mark
     *
     * @override
     */
    parseFromClipboard(text) {
      let trimmed = text.trim().toLowerCase();
      if (trimmed == "true" || trimmed == "1" || trimmed == this.getCheckMark()) {
        return true;
      }
      if (trimmed == "false" || trimmed == "0" || trimmed == "") {
        return false;
      }
      throw new Error(qx.locale.Manager.tr("Not a yes/no value: %1", text));
    }
  }
});
