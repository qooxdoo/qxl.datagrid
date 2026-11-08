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
 * click, without an editor, so that no widget beyond the label is needed per cell
 */
qx.Class.define("qxl.datagrid.column.BooleanColumn", {
  extend: qxl.datagrid.column.Column,

  /**
   * @param {String?} path the path to the value in the model
   */
  construct(path) {
    super(path);
    this.setBindingOptions((widget, model) => ({
      converter: value => (value ? this.getCheckMark() : "")
    }));
  },

  properties: {
    /** The text shown for true */
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
    createWidgetForEdit() {
      return null;
    },

    /**
     * @override
     */
    getToggledValue(value) {
      return !value;
    }
  }
});
