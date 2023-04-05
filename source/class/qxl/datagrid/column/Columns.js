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
 * Provides a simple list of columns
 */
qx.Class.define("qxl.datagrid.column.Columns", {
  extend: qx.core.Object,
  implement: [qxl.datagrid.column.IColumns],

  construct() {
    super();
    this._columns = [];
  },

  events: {
    /**
     * @typedef ChangeData
     * @property {String} type the type of change, can be either "add", "remove", or "order"
     * @property {qxl.datagrid.column.Column} the column being added or removed
     * @property {Boolean} moved true if the column was moved instead of just being added
     *
     * Fired when the list of columns changes; data is {ChangeData}
     */
    change: "qx.event.type.Data"
  },

  members: {
    /** @type{qxl.datagrid.column.Column[]} the columns */
    _columns: null,

    /**
     * Tests whether the column is allowed to be in this list
     *
     * @param {qxl.datagrid.column.Column} column
     * @returns {Boolean}
     */
    isValid(column) {
      return true;
    },

    /**
     * Adds a column
     *
     * @param {qxl.datagrid.column.Column} column the new column
     */
    add(column) {
      if (!this.isValid(column)) {
        throw new Error(`Cannot add column ${column} because it is not allowed in this list`);
      }
      let moved = !!qx.lang.Array.remove(this._columns, column);
      this._columns.push(column);
      this.fireDataEvent("change", {
        type: "add",
        column: column,
        moved: moved
      });
    },

    /**
     * Adds all columns in an array
     *
     * @param {qxl.datagrid.column.Column[]|qx.data.Array<qxl.datagrid.column.Column>} column the new column
     */
    addAll(columns) {
      for (let column of columns) {
        this.add(column);
      }
    },

    /**
     * Removes a column
     *
     * @param {qxl.datagrid.column.Column} column to remove
     */
    remove(column) {
      let removed = !!qx.lang.Array.remove(this._columns, column);
      if (removed) {
        this.fireDataEvent("change", {
          type: "remove",
          column: column
        });
      }
    },

    /**
     * Adds a column before another; if it is already in the list, it will be removed from its
     * current position.  If `insertBeforeColumn` is null, `column` will be inserted at the
     * start of the list
     *
     * @param {qxl.datagrid.column.Column} column to add
     * @param {qxl.datagrid.column.Column} insertBeforeColumn the column to insert before
     */
    insertBefore(column, insertBeforeColumn) {
      if (!this.isValid(column)) {
        throw new Error(`Cannot add column ${column} because it is not allowed in this list`);
      }
      let moved = !!qx.lang.Array.remove(this._columns, column);
      if (!insertBeforeColumn) {
        this._columns.unshift(column);
      } else {
        qx.lang.Array.insertBefore(this._columns, column, insertBeforeColumn);
      }
      this.fireDataEvent("change", {
        type: "add",
        column: column,
        moved: moved
      });
    },

    /**
     * Adds a column after another; if it is already in the list, it will be removed from its
     * current position.  If `insertAfterColumn` is null, the `column` will be appended to the
     * list
     *
     * @param {qxl.datagrid.column.Column} column to add
     * @param {qxl.datagrid.column.Column?} insertAfterColumn the column to insert before
     */
    insertAfter(column, insertAfterColumn) {
      if (!this.isValid(column)) {
        throw new Error(`Cannot add column ${column} because it is not allowed in this list`);
      }
      let moved = !!qx.lang.Array.remove(this._columns, column);
      if (!insertAfterColumn) {
        this._columns.push(column);
      } else {
        qx.lang.Array.insertAfter(this._columns, column, insertAfterColumn);
      }
      this.fireDataEvent("change", {
        type: "add",
        column: column,
        moved: moved
      });
    },

    /**
     * @override
     */
    getColumn(index) {
      if (index < 0 || index >= this._columns.length) {
        throw new Error(`Index out of range, found ${index} maximum is ${this._columns.length}`);
      }
      return this._columns[index];
    },

    /**
     * @override
     */
    getLength() {
      return this._columns.length;
    },

    /**
     * @override
     */
    indexOf(column) {
      return this._columns.indexOf(column);
    },

    /**
     * Allows iteration of the columns
     *
     * @returns {Iterator}
     */
    iterator() {
      let index = 0;
      return {
        next: () => {
          if (index < this._columns.length) {
            return {
              value: this._columns[index++]
            };
          }
          return { done: true };
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    },

    /**
     * Returns the list of columns as an array - do not modify this array!
     *
     * @returns {qxl.datagrid.column.Column[]}
     */
    toArray() {
      return this._columns;
    }
  },

  defer(statics) {
    statics.prototype[Symbol.iterator] = function () {
      return this.iterator();
    };
  }
});
