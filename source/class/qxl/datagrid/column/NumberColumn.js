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
 * *********************************************************************** */

/**
 * Displays and edits a number with `numberFormat`, by default with 2 decimal places in the format of
 * the current locale; an empty input becomes null
 */
qx.Class.define("qxl.datagrid.column.NumberColumn", {
  extend: qxl.datagrid.column.Column,

  /**
   * @param {String?} path the path to the value in the model
   */
  construct(path) {
    super(path);
    this.setBindingOptions((widget, model) => ({
      converter: value => this._formatForEdit(value)
    }));
  },

  properties: {
    /** Format for display and editing; null for 2 decimal places in the format of the current locale */
    numberFormat: {
      init: null,
      nullable: true,
      check: "qx.util.format.NumberFormat",
      event: "changeNumberFormat"
    }
  },

  members: {
    /** @type {qx.util.format.NumberFormat} the format used while `numberFormat` is null */
    __defaultFormat: null,

    /**
     * Returns the format for display and editing
     *
     * @return {qx.util.format.NumberFormat}
     */
    __getFormat() {
      let format = this.getNumberFormat();
      if (!format) {
        format = this.__defaultFormat;
        if (!format) {
          format = this.__defaultFormat = new qx.util.format.NumberFormat().set({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      }
      return format;
    },

    /**
     * @override
     */
    _formatForEdit(value) {
      return value === null || value === undefined || value === "" ? "" : this.__getFormat().format(value);
    },

    /**
     * @override
     */
    _parseFromEditor(text) {
      if (!text || !text.trim()) {
        return null;
      }
      let value;
      try {
        value = this.__getFormat().parse(text.trim());
      } catch (ex) {
        value = NaN;
      }
      if (isNaN(value)) {
        throw new Error(qx.locale.Manager.tr("Not a number: %1", text));
      }
      return value;
    }
  },

  destruct() {
    this._disposeObjects("__defaultFormat");
  }
});
