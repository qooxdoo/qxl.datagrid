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
 * Helper methods for labels fo spreadsheets
 */
qx.Class.define("qxl.datagrid.util.Labels", {
  extend: qx.core.Object,

  statics: {
    /**
     * Returns the columnIndex as a spreadsheet-style letters, eg 0 == A, 1 == B, 26 == AA, 27 == AB, etc
     *
     * @param {Integer} columnIndex
     * @return {String}
     */
    getColumnLetters(columnIndex) {
      columnIndex++;
      let letters = "";
      while (columnIndex > 0) {
        let temp = (columnIndex - 1) % 26;
        letters = String.fromCharCode(temp + 65) + letters;
        columnIndex = (columnIndex - temp - 1) / 26;
      }
      return letters;
    }
  }
});
