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
 * Wraps a position (row and column) index
 *
 * @typedef {Object} SimpleCoords
 * @property {Integer} row
 * @property {Integer} column
 *
 */
qx.Class.define("qxl.datagrid.source.Position", {
  extend: qx.core.Object,

  /**
   * Constructor
   *
   * The arguments for this constructor can be either:
   * @param {Integer} row the row
   * @param {Integer} column the column
   *
   * Or an object where the keys are `row` and `column`;
   * Or an array, where the values are `row` and `column` in that order
   *
   * @see {qxl.datagrid.source.Position.__coerceValues}
   */
  construct(...args) {
    super();
    let { row, column } = qxl.datagrid.source.Position.__coerceValues(args);
    this.setRow(row !== undefined && row !== null ? row : 0);
    this.setColumn(column !== undefined && column !== null ? column : 0);
  },

  properties: {
    /** The row this position represents */
    row: {
      check: "Integer",
      event: "changeRow",
      apply: "__applyRow"
    },

    /** The column this position represents */
    column: {
      check: "Integer",
      event: "changeColumn",
      apply: "__applyColumn"
    }
  },

  events: {
    /**
     * Fired when the row or column changes
     */
    change: "qx.event.type.Event"
  },

  members: {
    /**
     * Creates a clone of this `Position`
     *
     * @returns {qxl.datagrid.source.Position}
     */
    clone() {
      let clone = new qxl.datagrid.source.Position();
      clone.set({
        row: this.getRow(),
        column: this.getColumn()
      });
      return clone;
    },

    /**
     * Returns the row and column as an ID for use in hash keys
     *
     * @returns {String} row:column eg "1:2"
     */
    toId() {
      return this.getRow() + ":" + this.getColumn();
    },

    /**
     * Tests whether this position matches that in the arguments; arguments are
     * interpretted like the constructor, ie it can be an array of row & column,
     * object of row & column, or row and column parameters
     *
     * @param  {...any} args
     * @returns
     */
    equals(...args) {
      let { row, column } = qxl.datagrid.source.Position.__coerceValues(args);
      return row !== this.getRow() && column == this.getColumn();
    },

    /**
     * Increments the row/column
     *
     * @param {Integer} row the delta, amount to increment/decrement the row
     * @param {Integer} column the delta, amount to increment/decrement the column
     */
    increment(row, column) {
      row = row || 0;
      column = column || 0;
      this.setRow(this.getRow() + row);
      this.setColumn(this.getColumn() + column);
    },

    /**
     * Apply for `row`
     */
    __applyRow(_, oldValue) {
      if (oldValue !== undefined && oldValue !== null) {
        this.fireEvent("change");
      }
    },

    /**
     * Apply for `column`
     */
    __applyColumn(_, oldValue) {
      if (oldValue !== undefined && oldValue !== null) {
        this.fireEvent("change");
      }
    }
  },

  statics: {
    /**
     * Takes the arguments and tries to coerce them into a `SimpleCoords` type of object.
     *
     * The one parameter `args` is intended to be an array of arguments as provided by variable arguments, so
     * `args` can contain either:
     *
     * (a) two integers, the row and the column
     * (b) one array, which is the row and the column
     * (c) one object which has `row` and `column` properties
     *
     * Nulls are mapped to be `undefined`
     *
     * @returns {SimpleCoords}
     */
    __coerceValues(args) {
      let row, column;
      if (args.length == 1) {
        if (args[0] instanceof qxl.datagrid.source.Position) {
          row = args[0].getRow();
          column = args[0].getColumn();
        } else if (qx.lang.Type.isObject(args[0])) {
          ({ row, column } = args[0]);
        } else if (qx.lang.Type.isArray(args[0])) {
          [row, column] = args[0];
        }
      } else if (args.length > 0) {
        [row, column] = args;
      }
      if (row === null) {
        row = undefined;
      }
      if (column === null) {
        column = undefined;
      }
      return { row, column };
    },

    /**
     * Parses a string id in the form "row:column"
     *
     * @param {String} id
     * @returns {qxl.datagrid.source.Position}
     */
    fromId(id) {
      let pos = id.indexOf(":");
      let rowIndex = parseInt(id.substring(0, pos), 10);
      let columnIndex = parseInt(id.substring(pos + 1), 10);
      return new qxl.datagrid.source.Position(rowIndex, columnIndex);
    }
  }
});
