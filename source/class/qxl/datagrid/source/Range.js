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
 * Represents a range of coordinates, eg x1,y1 -> x2,y2
 */
qx.Class.define("qxl.datagrid.source.Range", {
  extend: qx.core.Object,

  construct(start, end) {
    super();
    this.setStart(new qxl.datagrid.source.Position(start));
    this.setEnd(new qxl.datagrid.source.Position(end));
  },

  properties: {
    /**
     * Starting position; the value never changes, if you call `setStart` a change event will be fired
     */
    start: {
      check: "qxl.datagrid.source.Position",
      transform: "__transformXxx",
      event: "changeStart",
      apply: "__applyXxxx"
    },

    /**
     * Ending position; the value never changes, if you call `setEnd` a change event will be fired
     */
    end: {
      check: "qxl.datagrid.source.Position",
      transform: "__transformXxx",
      event: "changeEnd",
      apply: "__applyXxxx"
    }
  },

  events: {
    /**
     * Fired when the start or end position changes
     */
    change: "qx.event.type.Event"
  },

  members: {
    /**
     * Creates a clone of this `Range`
     *
     * @returns {qxl.datagrid.source.Range}
     */
    clone() {
      let clone = new qxl.datagrid.source.Range();
      clone.set({
        start: this.getStart(),
        end: this.getEnd()
      });
      return clone;
    },

    /**
     * Tests whether a given position is within this range
     *
     * @param {qxl.datagrid.source.Position} pos
     * @returns {Boolean}
     */
    contains(pos) {
      let startRow = this.getStart().getRow();
      let endRow = this.getEnd().getRow();
      let startColumn = this.getStart().getColumn();
      let endColumn = this.getEnd().getColumn();

      let row = pos.getRow();
      let column = pos.getColumn();

      return row >= startRow && row <= endRow && column >= startColumn && column <= endColumn;
    },

    /**
     * Tests whether this range eclipses (ie completely overlaps) another range
     *
     * @param {qxl.datagrid.rource.Range} range
     * @returns {Boolean}
     */
    eclipses(range) {
      return this.contains(range.getStart()) && this.contains(range.getEnd());
    },

    /**
     * Returns an iterator/iterable for all cells
     *
     * @return {*} see Javascript Iterable and Iterator protocols for details
     */
    iterator() {
      let startRow = this.getStart().getRow();
      let endRow = this.getEnd().getRow();
      let startColumn = this.getStart().getColumn();
      let endColumn = this.getEnd().getColumn();

      let pos = new qxl.datagrid.source.Position(-1, -1);

      return {
        next() {
          if (pos.getRow() == -1) {
            pos.setRow(startRow);
            pos.setColumn(startColumn);
            return {
              value: pos
            };
          }
          if (pos.getColumn() < endColumn) {
            pos.increment(0, 1);
            return {
              value: pos
            };
          } else if (pos.getRow() < endRow) {
            pos.increment(1, 0);
            pos.setColumn(startColumn);
            return {
              value: pos
            };
          } else {
            return {
              done: true
            };
          }
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    },

    /**
     * Returns an iterator/iterable for all cells, except those in the given range
     *
     * @param {qxl.datagrid.source.Range} range the range to exclude
     * @return {*} see Javascript Iterable and Iterator protocols for details
     */
    iteratorExcept(range) {
      let srcIterator = this.iterator();

      return {
        next() {
          while (true) {
            let result = srcIterator.next();
            if (result.done) {
              return result;
            }

            if (!range.contains(result.value)) {
              return result;
            }
          }
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    },

    /**
     * Returns an iterator/iterable for all cells
     *
     * @return {*} see Javascript Iterable and Iterator protocols for details
     */
    rowsIterator() {
      let startRow = this.getStart().getRow();
      let endRow = this.getEnd().getRow();

      let pos = new qxl.datagrid.source.Position(-1, 0);

      return {
        next() {
          if (pos.getRow() == -1) {
            pos.setRow(startRow);
            return {
              value: pos
            };
          }
          if (pos.getRow() < endRow) {
            pos.increment(1, 0);
            return {
              value: pos
            };
          } else {
            return {
              done: true
            };
          }
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    },

    /**
     * Returns an iterator/iterable for all cells
     *
     * @return {*} see Javascript Iterable and Iterator protocols for details
     */
    columnsIterator() {
      let startColumn = this.getStart().getColumn();
      let endColumn = this.getEnd().getColumn();

      let pos = new qxl.datagrid.source.Position(0, -1);

      return {
        next() {
          if (pos.getColumn() == -1) {
            pos.setColumn(startColumn);
            return {
              value: pos
            };
          }
          if (pos.getColumn() < endColumn) {
            pos.increment(0, 1);
            return {
              value: pos
            };
          } else {
            return {
              done: true
            };
          }
        },
        [Symbol.iterator]() {
          return this;
        }
      };
    },

    /**
     * Creates a copy of the range but with the column set to 0 (zero)
     *
     * @returns {qxl.datagrid.source.Range}
     */
    columnZero() {
      let startRow = this.getStart().getRow();
      let endRow = this.getEnd().getRow();
      let clone = new qxl.datagrid.source.Range([startRow, 0], [endRow, 0]);
      return clone;
    },

    /**
     * Transform for `start` and `end`
     */
    __transformXxx(value, oldValue) {
      if (!oldValue) {
        return value;
      }
      oldValue.copyFrom(value);
    },

    /**
     * Apply for `start` and `end`
     */
    __applyXxxx(value) {
      if (value) {
        value.addListener("change", evt => this.fireEvent("change"));
      }
    }
  },

  defer(statics) {
    statics.prototype[Symbol.iterator] = function () {
      return this.iterator();
    };
  }
});
