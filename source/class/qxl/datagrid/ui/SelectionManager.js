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
      check: ["row", "cell", "area"],
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
      if (value === "row") {
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
      if (value === "one" && this.__selection.getLength() > 1) {
        this.__selection.replace([this.__selection.getItem(0)]);
      }

      if (qx.core.Environment.get("qx.debug")) {
        if (this.getSelectionStyle() === "area") {
          this.warn(`${this.classname}.selectionMode has no effect when the selectionStyle is 'area'`);
        }
      }
    },

    /**
     * Transform for `focused`
     */
    __transformFocused(value) {
      if (this.getSelectionStyle() === "row") {
        value = this.__forceRowModel(value);
      }
      return value;
    },

    /**
     * Batch handler to fires the selection change
     */
    __fireSelectionChange() {
      let newData = this.__selection;
      let oldData = this.__selectionChangeOldData;
      this.__selectionChangeOldData = newData.copy();
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

    getSelectionRange() {
      return this.__selectionRange;
    },

    /**
     * Replaces current selection with the given items.
     *
     * @param {qx.ui.core.Widget[]|qx.data.Array<qx.ui.core.Widget>|qxl.datagrid.source.Range} selection Items to select.
     * @throws {Error} if one of the items is not a child element and if
     *    items contains more than one elements.
     */
    setSelection(selection) {
      this.__selectionRange = null;
      if (this.getSelectionStyle() === "area") {
        this.__setSelectionArea(selection);
      } else {
        this.__setSelectionStandard(selection);
      }
    },

    __setSelectionArea(range) {
      if (qx.core.Environment.get("qx.debug")) {
        this.assertInstance(range, qxl.datagrid.source.Range, `Failed to set selection in area selection style. The selection ${range} is not an instance of qxl.datagrid.source.Range`);
      }
      this.__selectionRange = range;
      this.__selection.replace(this.__cellsFromRange(range));
      this.setFocused(this.__selection.getItem(0));
    },

    __cellsFromRange(range) {
      const dataSource = this.getDataSource();
      const x1 = Math.min(range.getStart().getColumn(), range.getEnd().getColumn());
      const x2 = Math.max(range.getStart().getColumn(), range.getEnd().getColumn());
      const y1 = Math.min(range.getStart().getRow(), range.getEnd().getRow());
      const y2 = Math.max(range.getStart().getRow(), range.getEnd().getRow());
      const items = new qx.data.Array();
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          const nextItem = dataSource.getModelForPosition(new qxl.datagrid.source.Position(y, x));
          if (qx.core.Environment.get("qx.debug")) {
            this.assertNotNull(nextItem, `Failed to set selection in area selection style. There is no item at position (${x},${y}) in the DataGrid.`);
          }
          items.push(nextItem);
        }
      }
      return items;
    },

    __setSelectionStandard(items) {
      if (qx.core.Environment.get("qx.debug")) {
        const dataSource = this.getDataSource();
        items.forEach(item => {
          this.assertNotNull(dataSource.getPositionOfModel(item), "Failed to set selection. The item " + item + " is not found in the DataGrid!");
        });
      }
      if (items instanceof qx.data.Array) {
        items = items.toArray();
      }
      if (["one", "single"].includes(this.getSelectionMode()) && items.length > 1) {
        items = [items[0]];
      }
      if (this.getSelectionStyle() === "row") {
        items = items.map(model => this.__forceRowModel(model));
      }
      if (this.getSelectionMode() === "single" && items[0] === this.__selection.getItem(0)) {
        items = [];
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
      return this.__selection.getLength() === 0;
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
