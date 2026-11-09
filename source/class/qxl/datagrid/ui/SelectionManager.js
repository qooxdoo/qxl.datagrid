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
    this.__selectedSet = new Set();
    this.__selection.addListener("change", () => {
      if (qx.core.Environment.get("qx.debug")) {
        this.__selection.forEach(item => this.assertTrue(!!item));
      }
      this.__selectedSet = new Set(this.__selection.toArray());
      this.__batchSelectionChange.run();
    });
  },

  properties: {
    /** The data source */
    dataSource: {
      init: null,
      check: "qxl.datagrid.source.IDataSource",
      event: "changeDataSource",
      apply: "_applyDataSource"
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
    },

    /**
     * The focused cell, as row and column in the data source; `focused` follows with the model at
     * this position. A cell needs a position because all cells of a row can share one model (eg with
     * `ArrayDataSource`). Set a new `Position` object to change it, the object is not watched.
     */
    focusedPosition: {
      init: null,
      nullable: true,
      check: "qxl.datagrid.source.Position",
      apply: "_applyFocusedPosition",
      event: "changeFocusedPosition"
    }
  },

  events: {
    /** Fired when the selection changes; `data` is an `Array` of model objects in the selection */
    changeSelection: "qx.event.type.Data"
  },

  members: {
    /** @type{qx.data.Array<qx.core.Object>} currently selected model objects */
    __selection: null,

    /** @type{Set<qx.core.Object>} the same objects as `__selection`, for `isSelected` while rendering */
    __selectedSet: null,

    /** @type{qxl.datagrid.source.Position?} where a range selected with Shift starts */
    __anchor: null,

    /** @type{qxl.datagrid.util.Batch} the batched notification for selection change */
    __batchSelectionChange: null,

    /** @type{Array} the oldData for batched notification of selection change */
    __selectionChangeOldData: null,

    /**
     * Apply for `dataSource` property
     * @param value
     * @param oldValue
     */
    _applyDataSource(value, oldValue) {
      this.setFocusedPosition(null);
      if (oldValue) {
        oldValue.removeListener("changeSize", this.__onDataSourceChange, this);
      }
      if (value) {
        value.addListener("changeSize", this.__onDataSourceChange, this);
      }
    },

    /**
     * Event handler for changes to the data source's model
     *
     * @param {qx.event.type.Data} evt
     */
    __onDataSourceChange(evt) {
      let newSelection = [];
      let dataSource = this.getDataSource();
      if (dataSource) {
        this.__selection.forEach(model => {
          if (dataSource.isModelValid(model)) {
            newSelection.push(model);
          }
        });
      }
      this.__selection.replace(newSelection);
      this.__updateFocusedPosition();
    },

    /**
     * Apply for `focusedPosition`
     *
     * @param {qxl.datagrid.source.Position?} value
     */
    _applyFocusedPosition(value) {
      let dataSource = this.getDataSource();
      this.setFocused(value && dataSource ? dataSource.getModelForPosition(value) || null : null);
    },

    /**
     * Keeps the focused cell on its model after rows were added or removed; without a model there, the
     * position is limited to the size of the data source
     */
    __updateFocusedPosition() {
      let position = this.getFocusedPosition();
      let dataSource = this.getDataSource();
      if (!position || !dataSource) {
        return;
      }
      let size = dataSource.getSize();
      let focused = this.getFocused();
      let row = position.getRow();
      if (focused && dataSource.isModelValid(focused)) {
        row = dataSource.getPositionOfModel(focused).getRow();
      }
      row = Math.min(row, size.getRow() - 1);
      if (row < 0) {
        this.setFocusedPosition(null);
      } else if (row !== position.getRow()) {
        this.setFocusedPosition(new qxl.datagrid.source.Position(row, position.getColumn()));
      } else {
        // the model at the same row may have been replaced
        this._applyFocusedPosition(position);
      }
    },

    /**
     * Apply for `selectionStyle`
     * @param value
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
     * @param value
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
     * @param value
     */
    __transformFocused(value) {
      if (value && this.getDataSource() && this.getSelectionStyle() === "row") {
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
     * With `selectionStyle` "area", a range the data source has not loaded is ignored.
     *
     * @param {qx.ui.core.Widget[]|qx.data.Array<qx.ui.core.Widget>|qxl.datagrid.source.Range} selection Items to select.
     * @throws {Error} if one of the items is not a child element and if
     *    items contains more than one elements.
     */
    setSelection(selection) {
      if (this.getSelectionStyle() === "area") {
        this.__setSelectionArea(selection);
      } else {
        this.__selectionRange = null;
        this.__setSelectionStandard(selection);
      }
    },

    /**
     * Selects a range with `selectionStyle` "area"; a range the data source has not loaded leaves the
     * selection as it is
     *
     * @param {qxl.datagrid.source.Range} range
     */
    __setSelectionArea(range) {
      if (qx.core.Environment.get("qx.debug")) {
        this.assertInstance(range, qxl.datagrid.source.Range, `Failed to set selection in area selection style. The selection ${range} is not an instance of qxl.datagrid.source.Range`);
      }
      let cells = this.__cellsFromRange(range);
      if (!cells) {
        return;
      }
      this.__selectionRange = range;
      this.__anchor = range.getStart();
      this.__selection.replace(cells);
      this.setFocused(this.__selection.getItem(0));
    },

    /**
     * Collects the models of all cells in a range, one by one, so only from a range the data source
     * has loaded
     *
     * @param {qxl.datagrid.source.Range} range
     * @return {qx.data.Array?} the models, null if the data source has not loaded the range
     */
    __cellsFromRange(range) {
      let dataSource = this.getDataSource();
      if (!dataSource.isAvailable(range)) {
        return null;
      }
      let x1 = Math.min(range.getStart().getColumn(), range.getEnd().getColumn());
      let x2 = Math.max(range.getStart().getColumn(), range.getEnd().getColumn());
      let y1 = Math.min(range.getStart().getRow(), range.getEnd().getRow());
      let y2 = Math.max(range.getStart().getRow(), range.getEnd().getRow());
      let items = new qx.data.Array();
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          let nextItem = dataSource.getModelForPosition(new qxl.datagrid.source.Position(y, x));
          if (qx.core.Environment.get("qx.debug")) {
            this.assertNotNull(nextItem, `Failed to set selection in area selection style. There is no item at position (${x},${y}) in the DataGrid.`);
          }
          items.push(nextItem);
        }
      }
      return items;
    },

    __setSelectionStandard(items) {
      let dataSource = this.getDataSource();
      items = items.filter(item => {
        if (!dataSource.getPositionOfModel(item)) {
          this.error("Failed to set selection. The item " + item + " is not found in the DataGrid!");
          return false;
        }
        return true;
      });
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
      return this.__selectedSet.has(item);
    },

    /**
     * Changes the selection for a click, a key which moved the focus or the space bar, depending on
     * `selectionMode` and `selectionStyle`, like the selection of qooxdoo lists
     * (`qx.ui.core.selection.Abstract`) and `qx.ui.table`:
     *
     * - a move selects the focused row in the modes "single", "one" and "multi"; in "additive" it
     *   only moves the focus; with Ctrl it leaves the selection as it is
     * - the space bar selects the focused row, in "additive" it switches it; with Ctrl it switches the
     *   row in every mode ("one" cannot be emptied)
     * - a click keeps its former behaviour per mode
     * - in "multi", Shift selects the range from the anchor (move, click, space bar), Ctrl+Shift adds
     *   it to the selection
     * - with `selectionStyle` "area", the range is the focused cell, with Shift it reaches from the
     *   anchor
     *
     * Without Shift, the position becomes the anchor of later ranges. A range over cells the data
     * source has not loaded is not selected, only the focus moves.
     *
     * @param {qxl.datagrid.source.Position} position the cell clicked or focused
     * @param {"tap"|"move"|"space"} action what happened
     * @param {Object?} modifiers pressed modifier keys, `{shift, ctrl}`
     */
    selectAt(position, action, modifiers) {
      let shift = !!modifiers?.shift;
      let ctrl = !!modifiers?.ctrl;
      let anchor = this.__anchor ?? position;
      if (!shift) {
        this.__anchor = position;
      }
      let mode = this.getSelectionMode();
      if (action == "move" && ctrl && !(shift && mode == "multi")) {
        return;
      }
      if (this.getSelectionStyle() == "area") {
        this.setSelection(new qxl.datagrid.source.Range(shift ? anchor : position, position));
        return;
      }
      let model = this.__getSelectableModel(position);
      if (!model) {
        return;
      }
      if (shift && mode == "multi") {
        this.__selectRange(anchor, position, ctrl);
      } else if (action == "tap") {
        if (mode == "single") {
          // a click on the selected row unselects it
          this.setSelection([model]);
        } else if (mode == "additive" || (mode == "multi" && ctrl)) {
          this.__toggle(model);
        } else {
          this.__replaceWith(model);
        }
      } else if (action == "space" && (ctrl || mode == "additive")) {
        this.__toggle(model);
      } else if (action == "space" || mode != "additive") {
        this.__replaceWith(model);
      }
    },

    /**
     * Selects all rows (or cells, or the whole area); does nothing in the modes "single" and "one",
     * and only if the data source has loaded all cells (see `IDataSource.isAvailable`), because the
     * selection holds every model
     *
     * @return {Boolean} true if everything has been selected
     */
    selectAll() {
      let dataSource = this.getDataSource();
      let size = dataSource?.getSize();
      if (!size || size.getRow() == 0) {
        return false;
      }
      let start = new qxl.datagrid.source.Position(0, 0);
      let end = new qxl.datagrid.source.Position(size.getRow() - 1, Math.max(0, size.getColumn() - 1));
      if (this.getSelectionStyle() == "area") {
        let range = new qxl.datagrid.source.Range(start, end);
        if (!dataSource.isAvailable(range)) {
          return false;
        }
        this.setSelection(range);
        return true;
      }
      if (!["multi", "additive"].includes(this.getSelectionMode())) {
        return false;
      }
      return this.__selectRange(start, end, false);
    },

    /**
     * Returns the model which a position selects: the row model with `selectionStyle` "row"
     *
     * @param {qxl.datagrid.source.Position} position
     * @return {qx.core.Object?}
     */
    __getSelectableModel(position) {
      let dataSource = this.getDataSource();
      if (!dataSource) {
        return null;
      }
      let column = this.getSelectionStyle() == "row" ? 0 : position.getColumn();
      return dataSource.getModelForPosition(new qxl.datagrid.source.Position(position.getRow(), column)) || null;
    },

    /**
     * Makes one model the selection, unless it is already; unlike `setSelection` in the mode "single",
     * selecting the selected model again does not unselect it
     *
     * @param {qx.core.Object} model
     */
    __replaceWith(model) {
      if (this.__selection.getLength() != 1 || this.__selection.getItem(0) !== model) {
        this.__selectionRange = null;
        this.__selection.replace([model]);
      }
    },

    /**
     * Adds a model to the selection or removes it; in the mode "one" it is only selected, in "single"
     * it replaces the selection
     *
     * @param {qx.core.Object} model
     */
    __toggle(model) {
      let mode = this.getSelectionMode();
      this.__selectionRange = null;
      if (this.isSelected(model)) {
        if (mode != "one") {
          this.__selection.remove(model);
        }
      } else if (mode == "multi" || mode == "additive") {
        this.__selection.push(model);
      } else {
        this.__selection.replace([model]);
      }
    },

    /**
     * Selects the rows (or with `selectionStyle` "cell" the rectangle of cells) between two positions;
     * the models come from the data source, so they are not checked one by one like in `setSelection`
     *
     * @param {qxl.datagrid.source.Position} from
     * @param {qxl.datagrid.source.Position} to
     * @param {Boolean} add whether the range is added to the current selection instead of replacing it
     * @return {Boolean} false if the data source has not loaded the range, the selection is unchanged then
     */
    __selectRange(from, to, add) {
      let range = new qxl.datagrid.source.Range(from, to);
      if (this.getSelectionStyle() == "row") {
        range = new qxl.datagrid.source.Range(new qxl.datagrid.source.Position(from.getRow(), 0), new qxl.datagrid.source.Position(to.getRow(), 0));
      }
      let cells = this.__cellsFromRange(range);
      if (!cells) {
        return false;
      }
      let models = new Set(add ? this.__selection.toArray() : []);
      cells.forEach(model => models.add(model));
      this.__selectionRange = null;
      this.__selection.replace([...models]);
      return true;
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
      if (!pos) {
        return model;
      }
      if (pos.getColumn() != 0) {
        model = dataSource.getModelForPosition(new qxl.datagrid.source.Position(pos.getRow(), 0));
      }
      return model;
    }
  }
});
