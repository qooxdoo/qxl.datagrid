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
 * Presents a numberic value as Kb, Mb, Gb, etc
 */
qx.Class.define("qxl.datagrid.column.FileSizeColumn", {
  extend: qxl.datagrid.column.Column,

  properties: {
    /** Whether to use IEC "binary" (ie 1kb == 1,024 bytes); if false then 1kb == 1,000 bytes */
    binary: {
      init: true,
      check: "Binary"
    }
  },
  construct() {
    super();
    this.setBindingOptions((widget, model) => {
      return {
        converter: (data, model, source, target) => {
          return !data ? "" : this._convertValueForDisplay(data);
        }
      };
    });
  },

  members: {
    _convertValueForDisplay(value) {
      if (typeof value != "number") {
        return "";
      }
      let multiplier = this.getBinary() ? 1024 : 1000;

      if (value < multiplier) {
        return "" + value;
      }
      if (value < multiplier * multiplier) {
        return "" + Math.round(value / multiplier) + "KB";
      }
      if (value < multiplier * multiplier * multiplier) {
        return "" + Math.round(value / (multiplier * multiplier)) + "MB";
      }
      return "" + Math.round(value / (multiplier * multiplier * multiplier)) + "GB";
    }
  }
});
