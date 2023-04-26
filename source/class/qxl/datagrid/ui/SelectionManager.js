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
 * Manages selection and focus
 */
qx.Class.define("qxl.datagrid.ui.SelectionManager", {
  extend: qx.core.Object,

  construct() {
    super();
    this.__batchSelectionChange = new qxl.datagrid.util.Batch(() => this.__fireSelectionChange());
    this.__selection = new qx.data.Array();
    this.__selection.addListener("change", () => {
      if (qx.core.Environment.get("qx.debug")) {
        this.__selection.forEach(item => this.assertTrue(!!item));
      }
      this.__batchSelectionChange.run();
    });
  },

  properties: {
    /** The data source */
    dataSource: {
      init: null,
      check: "qxl.datagrid.source.IDataSource",
      event: "changeDataSource"
    },

    /** Whether the user has to select entire rows, or just individual cells */
    selectionStyle: {
      init: "row",
      check: ["row", "cell"],
      apply: "_applySelectionStyle",
      event: "changeSelectionStyle"
    },

    /** How selection addition is controlled */
    selectionMode: {
      check: ["single", "multi", "additive", "one"],
      init: "single",
      apply: "_applySelectionMode",
      event: "changeSelectionMode"
    },

    /** The focused model item */
    focused: {
      init: null,
      nullable: true,
      transform: "__transformFocused",
      event: "changeFocused"
    }
  },

  events: {
    /** Fired when the selection changes; `data` is an `Array` of model objects in the selection */
    changeSelection: "qx.event.type.Data"
  },

  members: {
    /** @type{qx.data.Array<qx.core.Object>} currently selected model objects */
    __selection: null,

    /** @type{qxl.datagrid.util.Batch} the batched notification for selection change */
    __batchSelectionChange: null,

    /** @type{Array} the oldData for batched notification of selection change */
    __selectionChangeOldData: null,

    /**
     * Apply for `selectionStyle`
     */
    _applySelectionStyle(value) {
      if (value == "row") {
        let dataSource = this.getDataSource();
        for (let i = 0; i < this.__selection.getLength(); i++) {
          let model = this.__selection.getItem(i);
          model = this.__forceRowModel(model);
          if (model !== this.__selection.getItem(i)) {
            this.__selection.setItem(i, model);
          }
        }
        let model = this.getFocused();
        model = model ? this.__forceRowModel(model) : null;
        if (model !== this.getFocused()) {
          this.setFocused(model);
        }
      }
    },

    /**
     * Apply for `selectionMode`
     */
    _applySelectionMode(value) {
      if (value == "one" && this.__selection.getLength() > 1) {
        this.__selection.replace([this.__selection.getItem(0)]);
      }
    },

    /**
     * Transform for `focused`
     */
    __transformFocused(value) {
      if (this.getSelectionStyle() == "row") {
        value = this.__forceRowModel(value);
      }
      return value;
    },

    /**
     * Batch handler to fires the selection change
     */
    __fireSelectionChange() {
      let newData = this.__selection.toArray();
      let oldData = this.__selectionChangeOldData;
      this.__selectionChangeOldData = newData;
      this.fireDataEvent("changeSelection", newData, oldData);
    },

    /**
     * Returns an array of currently selected items.
     *
     * Note: The result is only a set of selected items, so the order can
     * differ from the sequence in which the items were added.
     *
     * @return {qx.ui.core.Widget[]} List of items.
     */
    getSelection() {
      return this.__selection;
    },

    /**
     * Replaces current selection with the given items.
     *
     * @param items {qx.ui.core.Widget[]} Items to select.
     * @throws {Error} if one of the items is not a child element and if
     *    items contains more than one elements.
     */
    setSelection(items) {
      if (items instanceof qx.data.Array) {
        items = items.toArray();
      }
      if (this.getSelectionMode() == "one" && items.length > 1) {
        items = [items[0]];
      }
      if (this.getSelectionStyle() == "row") {
        items = items.map(model => this.__forceRowModel(model));
      }
      this.__selection.replace(items);
    },

    /**
     * Clears the whole selection at once.
     */
    resetSelection() {
      this.__selection.removeAll();
    },

    /**
     * Detects whether the given item is currently selected.
     *
     * @param item {qx.ui.core.Widget} Any valid selectable item.
     * @return {Boolean} Whether the item is selected.
     * @throws {Error} if one of the items is not a child element.
     */
    isSelected(item) {
      return this.__selection.contains(item);
    },

    /**
     * Whether the selection is empty.
     *
     * @return {Boolean} Whether the selection is empty.
     */
    isSelectionEmpty() {
      return this.__selection.getLength() == 0;
    },

    /**
     * Makes sure that the model item is the row model, ie the first cell data in that row
     *
     * @param {*} model
     * @returns {*} the first model, may be the `model` parameter
     */
    __forceRowModel(model) {
      let dataSource = this.getDataSource();
      let pos = dataSource.getPositionOfModel(model);
      if (pos.getColumn() != 0) {
        model = dataSource.getModelForPosition(new qxl.datagrid.source.Position(pos.getRow(), 0));
      }
      return model;
    }
  }
});
