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
 * Formats the data as a date/time
 */
qx.Class.define("qxl.datagrid.column.DateColumn", {
  extend: qxl.datagrid.column.Column,

  properties: {
    dateFormat: {
      init: null,
      check: "qx.util.format.DateFormat",
      event: "changeDateFormat"
    }
  },

  members: {
    /**
     * @override
     */
    _convertValueForDisplay(value) {
      let format = this.getDateFormat() || qx.util.format.DateFormat.getDateInstance();
      return !value ? "" : format.format(value);
    },

    /**
     * @override
     */
    _getBindingOptions(widget, model) {
      return {
        converter: (data, model, source, target) => {
          let format = this.getDateFormat() || qx.util.format.DateFormat.getDateInstance();
          return !data ? "" : format.format(data);
        }
      };
    }
  }
});
