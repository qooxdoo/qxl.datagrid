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
 * Formats the data as a date/time; the editor is a text field which takes the text in `dateFormat`
 */
qx.Class.define("qxl.datagrid.column.DateColumn", {
  extend: qxl.datagrid.column.Column,

  properties: {
    /** The format for display, editing and the clipboard; by default the short date of the locale */
    dateFormat: {
      init: null,
      check: "qx.util.format.DateFormat",
      event: "changeDateFormat"
    }
  },

  /**
   * @param {String?} path the path to the value in the model
   */
  construct(path) {
    super(path);
    this.setBindingOptions((widget, model) => ({
      converter: data => this._formatForEdit(data)
    }));
  },

  members: {
    /**
     * Keeps the value of the model in the editor, so that an unchanged text gives it back as it was,
     * with its time of day and without counting as a change
     *
     * @override
     */
    setEditorValue(editor, value) {
      editor.setUserData("qxl.datagrid.DateColumn.original", value);
      super.setEditorValue(editor, value);
    },

    /**
     * @override
     */
    getEditorValue(editor) {
      let original = editor.getUserData("qxl.datagrid.DateColumn.original");
      if (editor.getValue() === this._formatForEdit(original)) {
        return original;
      }
      return super.getEditorValue(editor);
    },

    /**
     * @override
     */
    _formatForEdit(value) {
      return value === null || value === undefined || value === "" ? "" : this.__getFormat().format(this.__toDate(value));
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
        value = null;
      }
      if (!value || isNaN(value.getTime())) {
        throw new Error(qx.locale.Manager.tr("Not a date: %1", text));
      }
      return value;
    },

    /**
     * Returns the format in use; the default instance of `DateFormat` is shared and follows the locale
     *
     * @return {qx.util.format.DateFormat}
     */
    __getFormat() {
      return this.getDateFormat() ?? qx.util.format.DateFormat.getDateInstance();
    },

    /**
     * Converts a value of the model into a date: a date, a text which `Date.parse` reads or a number
     * of milliseconds
     *
     * @param {Date|String|Number} value
     * @return {Date}
     */
    __toDate(value) {
      if (typeof value == "string") {
        return new Date(Date.parse(value));
      }
      if (typeof value == "number") {
        return new Date(value);
      }
      return value;
    }
  }
});
