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
 *      * Will Johnson (willsterjohnson)
 *
 * *********************************************************************** */

/**
 * @template T The type of the data in the model array
 * Provides an implementation of `qxl.datagrid.source.IDataSource` for displaying a simple
 * 1-dimensional array of data.
 */
qx.Class.define("qxl.datagrid.source.ArrayDataSource", {
  extend: qx.core.Object,
  implement: [qxl.datagrid.source.IDataSource],

  construct() {
    super();
    // collects all changes of the array within one task (eg a loop of `push`) into one `changeSize`
    this.__debounceChangeSize = new qxl.datagrid.util.Debounce(() => this.fireDataEvent("changeSize", this.getSize()), 0);
  },

  properties: {
    /**
     * The columns of the data.
     */
    columns: {
      init: null,
      nullable: true,
      check: "qxl.datagrid.column.IColumns",
      event: "changeColumns",
      apply: "_applyColumns"
    },

    /**
     * The data model to display.
     * @type {qx.data.Array<T>}
     */
    model: {
      init: null,
      nullable: true,
      check: "qx.data.Array",
      event: "changeModel",
      apply: "_applyModel"
    }
  },

  events: {
    /**
     * @Override
     */
    changeSize: "qx.event.type.Data"
  },

  members: {
    __debounceChangeSize: null,

    /**
     * @type {qx.core.Object[]?} the models in sorted order, references to the same objects as the
     * model array; null while it has to be built again or nothing is sorted
     */
    __order: null,

    /** @type {Map<qx.core.Object, Integer>?} the row of each model in `__order` */
    __rowOf: null,

    /**
     * Apply for `columns`: the rows follow the sorting of the columns
     *
     * @param {qxl.datagrid.column.IColumns?} value
     * @param {qxl.datagrid.column.IColumns?} oldValue
     */
    _applyColumns(value, oldValue) {
      oldValue?.removeListener("changeSort", this.sort, this);
      value?.addListener("changeSort", this.sort, this);
      this.__order = null;
    },

    /**
     * Sorts the rows again by the sorted columns (`Columns.getSortColumns`); this happens by itself
     * when the sorting or the array changes, but not when values change, so that rows do not jump while
     * they are edited. To sort after editing, call it on `cellValueChanged` of the grid.
     */
    sort() {
      this.__order = null;
      this.__debounceChangeSize.run();
    },

    /**
     * Returns the models in the order of the rows: the model array itself, or a sorted array of
     * references to its models while a column is sorted
     *
     * @return {qx.core.Object[]}
     */
    __getRows() {
      let model = this.getModel();
      let columns = this.getColumns();
      if (!model || !columns?.isSorted?.()) {
        return model ? model.toArray() : [];
      }
      if (!this.__order) {
        this.__order = columns.sortModels(model.toArray());
        this.__rowOf = new Map(this.__order.map((item, row) => [item, row]));
      }
      return this.__order;
    },

    /**
     * Returns the row of a model
     *
     * @param {qx.core.Object} value
     * @return {Integer} -1 if the model is not in the data
     */
    __getRowOf(value) {
      let rows = this.__getRows();
      if (rows === this.__order) {
        return this.__rowOf.get(value) ?? -1;
      }
      return rows.indexOf(value);
    },

    /**
     * Apply for `model`
     * @param value
     * @param oldValue
     */
    _applyModel(value, oldValue) {
      if (oldValue) {
        oldValue.removeListener("change", this.__onModelChange, this);
      }
      if (value) {
        value.addListener("change", this.__onModelChange, this);
        this.__onModelChange();
      }
    },

    /**
     * Event handler for `model` change event.
     *
     * @param {*} evt
     */
    __onModelChange(evt) {
      this.__order = null;
      this.__debounceChangeSize.run();
    },

    /**
     * @Override
     */
    isAvailable(range) {
      return true;
    },

    /**
     * @Override
     */
    async makeAvailable(range) {
      return true;
    },

    /**
     * @Override
     */
    getModelForPosition(pos) {
      let rows = this.__getRows();
      if (pos.getRow() < 0 || pos.getRow() >= rows.length) {
        return null;
      }
      return rows[pos.getRow()];
    },

    /**
     * @Override
     */
    getPositionOfModel(value) {
      return new qxl.datagrid.source.Position(this.__getRowOf(value), 0);
    },

    /**
     * @Override
     */
    isModelValid(value) {
      return this.__getRowOf(value) >= 0;
    },

    /**
     * @Override
     */
    getSize() {
      if (!this.getModel()) {
        return new qxl.datagrid.source.Position(0, 0);
      }
      let size = new qxl.datagrid.source.Position(this.getModel().getLength(), this.getColumns().getLength());
      return size;
    }
  },

  destruct() {
    // the model array and the columns often outlive the data source
    this.getModel()?.removeListener("change", this.__onModelChange, this);
    this.getColumns()?.removeListener("changeSort", this.sort, this);
    this._disposeObjects("__debounceChangeSize");
  }
});
