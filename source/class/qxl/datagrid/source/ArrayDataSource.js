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
 * Provides an implementation of `qxl.datagrid.source.IDataSource` for displaying a simple
 * 1-dimensional array of data.
 */
qx.Class.define("qxl.datagrid.source.ArrayDataSource", {
  extend: qx.core.Object,
  implement: [qxl.datagrid.source.IDataSource],

  properties: {
    /**
     * The columns of the data.
     */
    columns: {
      init: null,
      nullable: true,
      check: "qxl.datagrid.column.IColumns",
      event: "changeColumns"
    },

    /**
     * The data model to display.
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
    /**
     * Apply for `model`
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
      this.fireDataEvent("changeSize", this.getSize());
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
      if (pos.getRow() < 0 || pos.getRow() >= this.getModel().getLength()) {
        return null;
      }
      return this.getModel().getItem(pos.getRow());
    },

    /**
     * @Override
     */
    getPositionOfModel(value) {
      let rowIndex = this.getModel().indexOf(value);
      let pos = new qxl.datagrid.source.Position(rowIndex, 0);
      return pos;
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
  }
});
