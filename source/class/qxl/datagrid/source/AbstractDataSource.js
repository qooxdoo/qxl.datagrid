/**
 * Base implementation of an IDataSource, which gets data on demand and caches the result
 */
qx.Class.define("qxl.datagrid.source.AbstractDataSource", {
  extend: qx.core.Object,
  type: "abstract",
  implement: [qxl.datagrid.source.IDataSource],

  construct() {
    super();
    this._data = {};
  },

  properties: {
    /** The columns in the data */
    columns: {
      init: null,
      nullable: true,
      check: "qxl.datagrid.column.IColumns",
      event: "changeColumns"
    }
  },

  members: {
    /** @type{Map<String,Object>} cell data indexed by row/column as a key (@see _createDataKey) */
    _data: null,

    /**
     * Returns a string key to be used in `this._data`
     *
     * @param {Integer} row
     * @param {Integer} column
     */
    _createDataKey(row, column) {
      return String(row).padStart("0") + ":" + String(column).padStart("0");
    },

    /**
     * Reverses the `_createDataKey`
     *
     * @param {String} str
     * @returns {Object} with `row` and `column` integers
     */
    _parseDataKey(str) {
      let pos = 5;
      if (str.length !== 11) pos = str.indexOf(":");
      let row = parseInt(str.substring(0, pos), 10);
      let column = parseInt(str.substring(pos + 1), 10);
      return { row, column };
    },

    /**
     * @Override
     */
    getValueAt(pos) {
      let key = this._createDataKey(pos.getRow(), pos.getColumn());
      return this._data[key];
    }
  }
});
