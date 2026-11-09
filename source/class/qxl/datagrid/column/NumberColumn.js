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
 *
 * @ignore(Intl)
 */
qx.Class.define("qxl.datagrid.column.NumberColumn", {
  extend: qxl.datagrid.column.Column,

  /**
   * @param {String?} path the path to the value in the model
   */
  construct(path) {
    super(path);
    this.setBindingOptions((widget, model) => ({
      converter: value => this._formatForDisplay(value)
    }));
  },

  properties: {
    /**
     * Format for display and editing; null for 2 decimal places in the format of the current locale.
     * The cells are shown with an `Intl.NumberFormat` of the same settings (see `_formatForDisplay`),
     * so the separators come from the browser.
     */
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
     * Formats a value for the cell with an `Intl.NumberFormat` which has the settings of the number
     * format, because `qx.util.format.NumberFormat.format` looks up the separators of the locale on
     * every call (about 10 µs), which is noticeable when hundreds of cells are bound while scrolling.
     * Only a format with `maximumIntegerDigits`, which `Intl` cannot express, is used directly.
     *
     * @param {Number?} value
     * @return {String}
     */
    _formatForDisplay(value) {
      if (value === null || value === undefined || value === "") {
        return "";
      }
      let format = this.__getFormat();
      let intl = this.__getIntlFormat(format);
      if (!intl) {
        return format.format(value);
      }
      return (format.getPrefix() || "") + intl.format(value) + (format.getPostfix() || "");
    },

    /** @type {Object?} `{format, settings, intl}`, the cached `Intl.NumberFormat` and what it was made of */
    __intlCache: null,

    /**
     * Returns an `Intl.NumberFormat` with the settings of a number format; it is cached and made anew
     * when a setting has changed, since `qx.util.format.NumberFormat` fires no event for most of them
     *
     * @param {qx.util.format.NumberFormat} format
     * @return {Intl.NumberFormat?} null if `Intl` cannot express the settings
     */
    __getIntlFormat(format) {
      let settings = [
        format.getLocale() || qx.locale.Manager.getInstance().getLocale(),
        format.getMinimumIntegerDigits(),
        format.getMaximumIntegerDigits(),
        format.getMinimumFractionDigits(),
        format.getMaximumFractionDigits(),
        format.getGroupingUsed()
      ];
      let cache = this.__intlCache;
      if (cache && cache.format === format && settings.every((setting, i) => setting === cache.settings[i])) {
        return cache.intl;
      }
      let [locale, minimumIntegerDigits, maximumIntegerDigits, minimumFractionDigits, maximumFractionDigits, groupingUsed] = settings;
      let intl = null;
      if (maximumIntegerDigits === null) {
        // without a maximum, qx shows all places of the number; Intl needs a limit
        let maximum = maximumFractionDigits ?? Math.max(minimumFractionDigits, 15);
        intl = new Intl.NumberFormat(locale.replace("_", "-"), {
          minimumIntegerDigits: Math.max(1, minimumIntegerDigits),
          minimumFractionDigits: Math.min(minimumFractionDigits, maximum),
          maximumFractionDigits: maximum,
          useGrouping: groupingUsed
        });
      }
      this.__intlCache = { format, settings, intl };
      return intl;
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
