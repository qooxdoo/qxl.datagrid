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
    if (row !== undefined && row !== null) {
      this.setRow(row);
    }
    if (column !== undefined && column !== null) {
      this.setColumn(column);
    }
  },

  properties: {
    /** The row this position represents */
    row: {
      init: 0,
      check: "Integer",
      event: "changeRow",
      apply: "__applyRow"
    },

    /** The column this position represents */
    column: {
      init: 0,
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
    __applyRow(value) {
      this.fireEvent("change");
    },

    /**
     * Apply for `column`
     */
    __applyColumn(value) {
      this.fireEvent("change");
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
     * (c) one objectm which has `row` and `column` properties
     *
     * Nulls are mapped to be `undefined`
     *
     * @returns {SimpleCoords}
     */
    __coerceValues(args) {
      let row, column;
      if (args.length == 1 && qx.lang.Type.isObject(args[0])) {
        ({ row, column } = args[0]);
      } else if (args.length == 1 && qx.lang.Type.isArray(args[0])) {
        [row, column] = args[0];
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
    }
  }
});
