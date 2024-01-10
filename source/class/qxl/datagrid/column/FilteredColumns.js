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
 * Wraps another instance of IColumns to filter and sort the list; this allows the user interface
 * components to be given a subset to work on, and not worry about the start index or the ordering
 * etc
 */
qx.Class.define("qxl.datagrid.column.FilteredColumns", {
  extend: qxl.datagrid.column.Columns,

  construct(sourceColumns) {
    super();
    this.__sourceColumns = sourceColumns;
  },

  members: {
    /** @type{qxl.datagrid.column.IColumns} the underlying, "real" list of columns */
    __sourceColumns: null,

    /**
     * @Override
     */
    isValid(column) {
      return this.__sourceColumns.indexOf(column) > -1;
    },

    /**
     * Adds a range of columns from the source columns; if any column is already in the
     * list, it will be moved to the end.
     *
     * Note that the column at position `end` will not itself be copied; if `end` is -1
     * that is interpretted as meaning to copy from start onwards.
     *
     * @param {qxl.datagrid.column.Column|Integer} start start of the range to add
     * @param {qxl.datagrid.column.Column|Integer} end end of the range to add
     */
    addRange(start, end) {
      if (!qx.lang.Type.isNumber(start)) {
        start = this.__sourceColumns.indexOf(start);
        if (start < 0) {
          throw new Error(`Invalid start, does not exist in source columns`);
        }
      }
      if (!qx.lang.Type.isNumber(end)) {
        end = this.__sourceColumns.indexOf(end);
        if (end < 0) {
          throw new Error(`Invalid end, does not exist in source columns`);
        }
      }
      if (end < 0) {
        end = this.__sourceColumns.getLength();
      }
      if (start < 0) {
        throw new Error(`Invalid start, found ${start}`);
      }
      if (start > end) {
        let tmp = start;
        start = end;
        end = tmp;
      }
      for (let i = start; i < end; i++) {
        this.add(this.__sourceColumns.getColumn(i));
      }
    },

    /**
     * Gets the index in the underlying columns
     *
     * @param {qxl.datagrid.column.Column|Integer} column to search for
     */
    sourceIndexOf(column) {
      if (qx.lang.Type.isNumber(column)) {
        column = this.getColumn(column);
      }
      return this.__sourceColumns.indexOf(column);
    },

    /**
     * Called to sort the columns
     *
     * @param {Function} fn callback for `Array.sort`
     */
    sort(fn) {
      this._columns.sort(fn);
      this.fireDataEvent("change", {
        type: "order"
      });
    }
  }
});
