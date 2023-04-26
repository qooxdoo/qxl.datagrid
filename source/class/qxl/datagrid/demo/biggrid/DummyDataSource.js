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
 * This example DataSource works by fabricating a potentially huge array of model
 * objects - you can literally specify the number of rows in the millions and
 * it will still be quick and efficient.
 *
 * For example, the `qxl.datagrid.demo.biggrid.BigGridDemo` class configures this
 * `DummyDataSource` to have 1,000,000 rows with 10,000 columns, i.e. 10 _billion_
 * model objects.
 *
 * To handle this, the DummyDataSource will only create model objects on demand,
 * ie when the `makeAvailable` method is called to notify it that a certain set
 * of data is required.  When it does this, it will do it asynchronously - which is
 * a good simulation of what you would have to do if you were calling back to a
 * server somewhere in order to dip into that massive, 10billion data set in the
 * database.
 *
 * The other functions (ie those defined by `qxl.datagrid.source.IDataSource`) are
 * all synchronous and report data from the cache kept by the DummyDataSource; the
 * DataGrid will wait until `makeAvailable` has completed.
 */
qx.Class.define("qxl.datagrid.demo.biggrid.DummyDataSource", {
  extend: qx.core.Object,
  implement: [qxl.datagrid.source.IDataSource],

  /**
   * Constructor
   *
   * @param {Integer} numRows number of rows to fabricate
   * @param {Integer} numColumns number of columns to fabricate
   */
  construct(numRows, numColumns) {
    super();
    this.__data = {};
    if (numRows) {
      this.setNumRows(numRows);
    }
    if (numColumns) {
      this.setNumColumns(numColumns);
    }
  },

  properties: {
    /** Number of rows to fabricate */
    numRows: {
      init: 100,
      event: "changeNumRows",
      apply: "_applyNumXxx"
    },

    /** Number of columns to fabricate */
    numColumns: {
      init: 100,
      event: "changeNumColumns",
      apply: "_applyNumXxx"
    }
  },

  events: {
    /** Fired when the size changes */
    changeSize: "qx.event.type.Data"
  },

  members: {
    /** @type{Map<String.qx.core.Object>} all the available models, indexed by row:column */
    __data: null,

    /** @type{qxl.datagrid.source.Range} the current range of data that has been promised via `makeAvailable` */
    __range: null,

    /**
     * Apply for numRows and numColumns
     */
    _applyNumXxx(value) {
      for (let id in this.__data) {
        let pos = qxl.datagrid.source.Position.fromId(id);
        if (pos.getColumn() >= this.getNumColumns() || pos.getRow() >= this.getNumRows()) {
          let model = this.__data[id];
          model.dispose();
          delete this.__data[id];
        }
      }
      if (this.__range) {
        if (this.__range.getColumn() > this.getNumColumns()) {
          this.__range.setColumn(this.getNumColumns());
        }
        if (this.__range.getRow() > this.getNumRows()) {
          this.__range.setRow(this.getNumRows());
        }
      }
    },

    /*
     * @override
     */
    isAvailable(range) {
      if (!this.__range) {
        return false;
      }
      return this.__range.eclipses(range) || this.__range.columnZero().eclipses(range);
    },

    /*
     * @override
     */
    async makeAvailable(range) {
      let oldData = this.__data;
      let newData = {};

      // Create our model object
      const allocate = pos => {
        let id = pos.toId();
        let model = oldData[id];
        if (!model) {
          model = new qxl.datagrid.demo.biggrid.DummyModel().set({
            rowIndex: pos.getRow(),
            columnIndex: pos.getColumn()
          });
        } else {
          delete oldData[id];
        }
        newData[id] = model;
      };

      // Make sure we have all of the data required for the range that DataGrid is asking for
      for (let pos of range) {
        allocate(pos);
      }

      // Make sure that we also have all of the data for column zero for each row
      for (let pos of range.rowsIterator()) {
        allocate(pos);
      }

      // Get rid of data no longer on display
      for (let id in oldData) {
        oldData[id].dispose();
      }

      // Save it
      this.__data = newData;
      this.__range = range;
    },

    /**
     * @override
     */
    getModelForPosition(pos) {
      let model = this.__data[pos.toId()];
      return model;
    },

    /**
     * @override
     */
    getPositionOfModel(value) {
      return new qxl.datagrid.source.Position(value.getRowIndex(), value.getColumnIndex());
    },

    /**
     * @override
     */
    getSize() {
      return new qxl.datagrid.source.Position(this.getNumRows(), this.getNumColumns());
    }
  }
});
