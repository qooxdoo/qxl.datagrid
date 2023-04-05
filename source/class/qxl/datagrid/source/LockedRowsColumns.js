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
 * Provides a data source for use where the first few rows and columns are locked - this
 * class will effectively hide those rows and columns from the underlying data, so when
 * a request is for cell (0,0) and there is a hidden row and column, this will be mapped
 * onto cell (1,1) on the underlying data source
 */
qx.Class.define("qxl.datagrid.source.LockedRowsColumns", {
  extend: qx.core.Object,
  implement: [qxl.datagrid.source.IDataSource],

  construct(parent) {
    super();
    this.__parent = parent;
  },

  properties: {
    lockedRows: {
      init: 0,
      check: "Integer",
      event: "changeLockedRows",
      apply: "_applyLockedRows"
    },

    lockedColumns: {
      init: 0,
      check: "Integer",
      event: "changeLockedColumns",
      apply: "_applyLockedColumns"
    }
  },

  members: {
    /** @type{qxl.datagrid.source.IDataSource} the parent data source where data is obtained from */
    __parent: null,

    /**
     * @Override
     */
    async makeAvailable(range) {
      range = range.clone();
      range.getStart().move(this.getLockedRows(), this.getLockedColumns());
      await this.__parent.makeAvailable(range);
    },

    /**
     * @Override
     */
    getValueAt(pos) {
      pos = pos.clone();
      pos.move(this.getLockedRows(), this.getLockedColumns());
      return this.__parent.getValueAt(pos);
    },

    /**
     * @Override
     */
    getSize() {
      let size = super.getSize();
      size = size.clone();
      size.move(0 - this.getLockedRows(), 0 - this.getLockedColumns());
      return size;
    },

    _applyLockedRows(value) {
      //
    },

    _applyLockedColumns(value) {
      //
    }
  }
});
