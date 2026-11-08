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
    this.__sortColumns = [];
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
    change: "qx.event.type.Data",

    /**
     * Fired once when the sorting has changed, by a click, a key or `setSortOrder`; data is
     * `{column, sortOrder, columns}` with the column changed last, its new sort order and all sorted
     * columns in the order of their priority (see `getSortColumns`). `ArrayDataSource` and
     * `TreeDataSource` sort their rows on it.
     */
    changeSort: "qx.event.type.Data"
  },

  members: {
    /** @type {qxl.datagrid.column.Column[]} the columns */
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
      this.__watchColumn(column, moved);
      this.fireDataEvent("change", {
        type: "add",
        column: column,
        moved: moved
      });
    },

    /**
     * Adds all columns in an array
     *
     * @param {qxl.datagrid.column.Column[]|qx.data.Array<qxl.datagrid.column.Column>} columns the new columns
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
        column.removeListener("changeSortOrder", this.__onColumnSortOrderChange, this);
        for (let event of qxl.datagrid.column.Columns.SIZE_EVENTS) {
          column.removeListener(event, this.__onColumnSizeChange, this);
        }
        if (qx.lang.Array.remove(this.__sortColumns, column)) {
          this.__fireChangeSort(column);
        }
      }
    },

    /**
     * Listens to the sort order and the width settings of a column which has been added
     *
     * @param {qxl.datagrid.column.Column} column
     * @param {Boolean} moved whether the column was in the list already
     */
    __watchColumn(column, moved) {
      if (moved) {
        return;
      }
      column.addListener("changeSortOrder", this.__onColumnSortOrderChange, this);
      for (let event of qxl.datagrid.column.Columns.SIZE_EVENTS) {
        column.addListener(event, this.__onColumnSizeChange, this);
      }
      if (column.getSortOrder() && !this.__sortColumns.includes(column)) {
        this.__sortColumns.push(column);
      }
    },

    /**
     * Event handler for changes of the width settings of a column: the grid lays out again
     *
     * @param {qx.event.type.Data} evt
     */
    __onColumnSizeChange(evt) {
      this.fireDataEvent("change", { type: "size", column: evt.getTarget() });
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
      this.__watchColumn(column, moved);
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
      this.__watchColumn(column, moved);
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
    },

    /** @type {qxl.datagrid.column.Column[]} the sorted columns in the order of their priority */
    __sortColumns: null,

    /** @type {Boolean} while `toggleSort` adds a column, the other sorted columns stay */
    __addingSort: false,

    /** @type {Integer} nesting of sort order changes, `changeSort` is fired for the outermost one */
    __sortDepth: 0,

    /**
     * Returns the sorted columns in the order of their priority: the first one sorts, the next one
     * sorts rows with equal values, and so on
     *
     * @return {qxl.datagrid.column.Column[]} a copy
     */
    getSortColumns() {
      return [...this.__sortColumns];
    },

    /**
     * Whether at least one column is sorted; cheaper than `getSortColumns`, eg for every cell
     *
     * @return {Boolean}
     */
    isSorted() {
      return this.__sortColumns.length > 0;
    },

    /**
     * Returns the sort order which `toggleSort` would give a column, eg for `beforeSort`
     *
     * @param {qxl.datagrid.column.Column} column
     * @param {Boolean?} add whether the column is added to the other sorted columns (Shift)
     * @return {"asc"|"desc"|null}
     */
    nextSortOrder(column, add) {
      let sortOrder = column.getSortOrder();
      if (add) {
        return sortOrder == "asc" ? "desc" : "asc";
      }
      return !sortOrder ? "asc" : sortOrder == "asc" ? "desc" : null;
    },

    /**
     * Changes the sorting like a click on the header of a column:
     *
     * - without `add` the column changes from ascending to descending to unsorted, all other columns
     *   are no longer sorted
     * - with `add` (Shift) an unsorted column is added as the last criterion (ascending), a sorted one
     *   switches between ascending and descending, the other columns stay
     *
     * Setting `sortOrder` of a column directly unsorts the other columns, like a click.
     *
     * @param {qxl.datagrid.column.Column} column
     * @param {Boolean?} add whether the column is added to the other sorted columns
     * @return {"asc"|"desc"|null} the new sort order of the column
     */
    toggleSort(column, add) {
      let sortOrder = this.nextSortOrder(column, add);
      this.__sortDepth++;
      try {
        if (add) {
          this.__addingSort = true;
          column.setSortOrder(sortOrder);
        } else {
          for (let other of this.getSortColumns()) {
            if (other !== column) {
              other.setSortOrder(null);
            }
          }
          column.setSortOrder(sortOrder);
        }
      } finally {
        this.__addingSort = false;
        this.__sortDepth--;
      }
      this.__fireChangeSort(column);
      return sortOrder;
    },

    /**
     * Sorts models by the sorted columns (`getSortColumns`): the values of `Column.getSortValue` are
     * read once per model and compared with `compareValues`, criterion by criterion. The sort is
     * stable, models with equal values keep their order.
     *
     * @param {qx.core.Object[]} models
     * @return {qx.core.Object[]} a new array with the same models, sorted; the models themselves if no
     *  column is sorted
     */
    sortModels(models) {
      let sortColumns = this.__sortColumns;
      if (!sortColumns.length) {
        return models;
      }
      let directions = sortColumns.map(column => (column.getSortOrder() == "desc" ? -1 : 1));
      let entries = models.map(model => ({ model, keys: sortColumns.map(column => column.getSortValue(model)) }));
      const compare = qxl.datagrid.column.Columns.compareValues;
      entries.sort((a, b) => {
        for (let i = 0; i < directions.length; i++) {
          let result = compare(a.keys[i], b.keys[i], directions[i]);
          if (result) {
            return result;
          }
        }
        return 0;
      });
      return entries.map(entry => entry.model);
    },

    /**
     * Called when the sortOrder property of any of the columns changes: keeps the order of the sorted
     * columns; unless `toggleSort` adds a column, a newly sorted column unsorts the others
     *
     * @param {qx.event.type.Data} evt
     */
    __onColumnSortOrderChange(evt) {
      let column = evt.getTarget();
      let sortOrder = evt.getData();
      this.__sortDepth++;
      try {
        if (!sortOrder) {
          qx.lang.Array.remove(this.__sortColumns, column);
        } else {
          if (!this.__sortColumns.includes(column)) {
            this.__sortColumns.push(column);
          }
          if (!this.__addingSort) {
            for (let other of this.getSortColumns()) {
              if (other !== column) {
                other.setSortOrder(null);
              }
            }
          }
        }
      } finally {
        this.__sortDepth--;
      }
      if (this.__sortDepth == 0) {
        this.__fireChangeSort(column);
      }
    },

    /**
     * Fires `changeSort`
     *
     * @param {qxl.datagrid.column.Column} column the column changed last
     */
    __fireChangeSort(column) {
      this.fireDataEvent("changeSort", { column, sortOrder: column.getSortOrder(), columns: this.getSortColumns() });
    }
  },

  statics: {
    /** @type {String[]} events of a column which change its width */
    SIZE_EVENTS: ["changeWidth", "changeMinWidth", "changeMaxWidth", "changeFlex"],

    /** @type {Intl.Collator?} compares texts, made for the locale on first use */
    __collator: null,

    /** @type {String?} the locale of `__collator` */
    __collatorLocale: null,

    /**
     * Compares two values for sorting: empty values (null, undefined, "") come last in both
     * directions, numbers and dates compare by value, booleans false before true, texts by the current
     * locale with numbers inside compared as numbers ("Type 2" before "Type 10")
     *
     * @param {*} a
     * @param {*} b
     * @param {Integer?} direction 1 ascending (default), -1 descending
     * @return {Integer} negative, 0 or positive like for `Array.sort`
     */
    compareValues(a, b, direction = 1) {
      const isEmpty = value => value === null || value === undefined || value === "";
      if (isEmpty(a) || isEmpty(b)) {
        return isEmpty(a) == isEmpty(b) ? 0 : isEmpty(a) ? 1 : -1;
      }
      let result;
      if (typeof a == "string" || typeof b == "string") {
        let statics = qxl.datagrid.column.Columns;
        let locale = qx.locale.Manager.getInstance().getLocale().replace("_", "-");
        if (!statics.__collator || statics.__collatorLocale !== locale) {
          statics.__collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
          statics.__collatorLocale = locale;
        }
        result = statics.__collator.compare(String(a), String(b));
      } else {
        let valueA = a instanceof Date ? a.getTime() : Number(a);
        let valueB = b instanceof Date ? b.getTime() : Number(b);
        result = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      }
      return result * direction;
    }
  },

  defer(statics) {
    statics.prototype[Symbol.iterator] = function () {
      return this.iterator();
    };
  }
});
