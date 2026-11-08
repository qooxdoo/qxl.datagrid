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
 * The DataGrid control
 */
qx.Class.define("qxl.datagrid.DataGrid", {
  extend: qx.ui.core.Widget,
  implement: [qxl.datagrid.ui.IWidgetSizeSource],

  /**
   * Constructor
   *
   * @param {qxl.datagrid.column.IColumns?} columns
   * @param {qxl.datagrid.ui.GridStyling?} styling
   */
  construct(columns, styling) {
    super();
    if (!columns) {
      throw new Error("Columns must be provided!");
    }
    this.__debounceUpdateWidgets = new qxl.datagrid.util.Debounce(() => this.updateWidgets(), 50);
    this.__selectionManager = new qxl.datagrid.ui.SelectionManager();
    this.__selectionManager.addListener("changeSelection", evt => {
      this.scheduleUpdateWidgets();
      this.fireDataEvent("changeSelection", evt.getData(), evt.getOldData());
    });

    styling = styling || new qxl.datagrid.ui.GridStyling();
    this.__sizeCalculator = new qxl.datagrid.ui.GridSizeCalculator(columns, styling, this);
    this.setColumns(columns);

    this.getQxObject("widgetPane").addListener("modelDoubleTap", evt => this.fireDataEvent("modelDoubleTap", evt.getData()));
    this.getQxObject("widgetPane").addListener("modelTap", evt => this.fireDataEvent("modelTap", evt.getData()));

    // the DOM focus stays on the grid, screen readers follow the focused cell via aria-activedescendant
    this.getContentElement().setAttribute("role", "grid");
    this.getQxObject("oddEvenRows").setCellIdFunction((row, column) => this.getQxObject("widgetPane").getCellId(row, column));
    this.__selectionManager.addListener("changeFocusedPosition", () => this.__updateActiveDescendant());
    this.addListener("keypress", this._onKeyPress, this);
    // editors like the select box stop Enter and Tab themselves, so these are taken before them
    this.addListener("keypress", this.__onEditorKeyPress, this, true);
    this.addListener("keyinput", this._onKeyInput, this);
    this.addListener("focus", this.__onFocus, this);

    this.__cellErrors = new Map();
    this.getQxObject("widgetPane").setCellErrors(this.__cellErrors);
    this.getQxObject("widgetPane").addListener("cellTap", evt => this.__onCellTap(evt.getData()));
    this.getQxObject("widgetPane").addListener("cellDoubleTap", evt => this.__onCellDoubleTap(evt.getData()));
  },

  properties: {
    /** The columns on display in this widget */
    columns: {
      init: null,
      nullable: true,
      check: "qxl.datagrid.column.IColumns",
      apply: "_applyColumns",
      event: "changeColumns"
    },

    /** The data source */
    dataSource: {
      init: null,
      check: "qxl.datagrid.source.IDataSource",
      apply: "_applyDataSource",
      event: "changeDataSource"
    },
    /** @override */
    appearance: {
      init: "qxl-datagrid",
      refine: true
    },

    /** @override the grid takes the keyboard focus and moves it between its cells */
    focusable: {
      init: true,
      refine: true
    },

    /**
     * Whether the grid is read only (even if the data grid does not yet support editing, this is
     * still relevant because it is available to the columns and )
     */
    readOnly: {
      init: false,
      check: "Boolean",
      event: "changeReadOnly"
    },

    dynamicSizing: {
      init: "none",
      check: ["rows", "columns", "both", "none"],
      event: "changeDynamicSizing"
    },

    /**
     * Whether the user may change values: F2, Enter, a typed character or a double click open the
     * editor of the focused cell, Space and a click switch a boolean. `readOnly`/`enabled` of the
     * columns still apply. Off by default, so that a grid only shows data unless editing is wanted.
     */
    editable: {
      init: false,
      check: "Boolean",
      event: "changeEditable",
      apply: "_applyEditable"
    },

    /**
     * Checks a value before it is written into the model: `(model, column, value, oldValue) => String?`
     * returns an error message to reject the value (the editor stays open and the cell shows the
     * message), or null to accept it
     */
    cellValidator: {
      init: null,
      nullable: true,
      check: "Function",
      event: "changeCellValidator"
    },

    widgetsContextMenu: {
      check: "qx.ui.menu.Menu",
      init: null,
      nullable: true,
      event: "changeWidgetsContextMenu"
    }
  },

  objects: {
    dataPane() {
      var comp = new qx.ui.container.Composite(new qx.ui.layout.VBox());
      comp.add(this.getQxObject("header"));
      var comp2 = new qx.ui.container.Composite(new qxl.datagrid.ui.layout.Layered());
      comp2.add(this.getQxObject("widgetPane"), { layer: 0 });
      comp2.add(this.getQxObject("oddEvenRows"), { layer: 1 });
      comp.add(comp2, { flex: 1 });
      return comp;
    },

    oddEvenRows() {
      return new qxl.datagrid.ui.OddEvenRowBackgrounds(this.__sizeCalculator, this.getDataSource(), this.__selectionManager);
    },

    paneWidgetFactory() {
      return new qxl.datagrid.ui.factory.SimpleWidgetFactory(this.getColumns());
    },

    widgetPane() {
      let widgetPane = new qxl.datagrid.ui.WidgetPane(this.__sizeCalculator, this.getQxObject("paneWidgetFactory"), this.getDataSource(), this.__selectionManager);
      this.bind("widgetsContextMenu", widgetPane, "widgetsContextMenu");
      return widgetPane;
    },

    headerWidgetFactory() {
      return new qxl.datagrid.ui.factory.HeaderWidgetFactory(this.getColumns());
    },

    header() {
      return new qxl.datagrid.ui.HeaderRows(this.__sizeCalculator, this.getQxObject("headerWidgetFactory"));
    },

    fixedColumns() {
      this.warn("Fixed Columns are not yet implemented!");
      return new qx.ui.core.Widget();
    }
  },

  events: {
    /** Fired when the `selection` pseudo property changes */
    changeSelection: "qx.event.type.Data",

    /** Fired when the user clicks on a model item, the data is the model */
    modelTap: "qx.event.type.Data",

    /** Fired when the user double clicks on a model item, the data is the model */
    modelDoubleTap: "qx.event.type.Data",

    /**
     * Fired after the user has changed a value and it has been written into the model; data is
     * `{model, column, row, columnIndex, value, oldValue}`, eg to keep a list of changes with the
     * original values
     */
    cellValueChanged: "qx.event.type.Data"
  },

  members: {
    /** @type {qxl.datagrid.ui.GridSizeCalculator} */
    __sizeCalculator: null,

    /** @type {Promise} if the widgets is being updated but pending a promise completion */
    _updatingPromise: null,

    /** @type {qxl.datagrid.util.Debounce} debounced call to updateWidgets */
    __debounceUpdateWidgets: null,

    /** @type {qxl.datagrid.ui.SelectionManager} the selection manager */
    __selectionManager: null,

    /** @type {Map<String, String>} error messages by `WidgetPane.cellErrorKey` */
    __cellErrors: null,

    /**
     * @type {{model: qx.core.Object, column: qxl.datagrid.column.Column, columnIndex: Integer, row: Integer, editor: qx.ui.core.Widget, listenerIds: Array}?}
     * the cell being edited; it is bound to model and column, not to a cell widget, since cell widgets
     * are reused for other rows while scrolling
     */
    __editing: null,

    /**
     * Apply for `columns`
     * @param value
     * @param oldValue
     */
    _applyColumns(value, oldValue) {
      if (oldValue) {
        oldValue.removeListener("change", this.__onColumnsChange, this);
        for (let column of oldValue) {
          column.setDataGrid(null);
        }
      }
      if (value) {
        for (let column of value) {
          column.setDataGrid(this);
        }
        value.addListener("change", this.__onColumnsChange, this);
      }
      this.__sizeCalculator.setColumns(value);
      this.getQxObject("headerWidgetFactory").setColumns(value);
      this.getQxObject("paneWidgetFactory").setColumns(value);
      this.updateWidgets();
    },

    /**
     * Event handler for changes in the columns array
     *
     * @param {qx.event.type.Data} evt
     */
    __onColumnsChange(evt) {
      let data = evt.getData();
      if (data.type == "remove") {
        data.column.setDataGrid(null);
      }
      if (data.type == "add") {
        data.column.setDataGrid(this);
      }
      this.scheduleLayoutUpdate();
    },

    /**
     * Apply for `dataSource`
     * @param value
     * @param oldValue
     */
    _applyDataSource(value, oldValue) {
      if (oldValue) {
        oldValue.removeListener("changeSize", this._onDataSourceChangeSize, this);
      }
      this.__selectionManager.resetSelection();
      ["headerWidgetFactory", "paneWidgetFactory", "widgetPane", "oddEvenRows"].forEach(id => this.getQxObject(id).setDataSource(value));
      this.__selectionManager.setDataSource(value);
      this.updateWidgets();
      if (value) {
        value.addListener("changeSize", this._onDataSourceChangeSize, this);
      }
    },

    /**
     * Event handler for changes in the data source's size
     */
    _onDataSourceChangeSize() {
      this.__followEditedModel();
      this.forceUpdate();
    },

    /**
     * Forces the grid to fully update it's display. Use sparingly.
     */
    forceUpdate() {
      this.getQxObject("widgetPane").invalidateAll();
      this.__sizeCalculator.invalidate();
      this.updateWidgets();
    },

    /**
     * Updates the display after changes to data or columns etc
     */
    updateWidgets() {
      if (this._updatingPromise) {
        return;
      }
      this.getQxObject("header").updateWidgets();
      this.getQxObject("oddEvenRows").updateWidgets();
      let promise = this.getQxObject("widgetPane").updateWidgets();
      if (promise) {
        this._updatingPromise = promise.then(this.onPaneUpdated.bind(this));
      } else {
        this.onPaneUpdated();
      }
    },

    /**
     * Called after the widget pane has been updated
     */
    onPaneUpdated() {
      this.scheduleLayoutUpdate();
      this._updatingPromise = null;
      this.__updateGridAria();
      this.__updateActiveDescendant();
      this.__keepFocusWhileEditorHidden();
    },

    /**
     * Sets the number of rows and columns of the whole data source for screen readers, including the
     * rows which are not on display
     */
    __updateGridAria() {
      let dataSource = this.getDataSource();
      let columns = this.getColumns();
      if (!dataSource || !columns) {
        return;
      }
      let element = this.getContentElement();
      element.setAttribute("aria-rowcount", dataSource.getSize().getRow() + this.getStyling().getNumHeaderRows());
      element.setAttribute("aria-colcount", columns.getLength());
      element.setAttribute("aria-multiselectable", ["multi", "additive"].includes(this.__selectionManager.getSelectionMode()));
    },

    /**
     * Points `aria-activedescendant` to the focused cell, if it is on display
     */
    __updateActiveDescendant() {
      let position = this.__selectionManager.getFocusedPosition();
      let pane = this.getQxObject("widgetPane");
      let cellOnDisplay = position && pane.getChildAtPosition(position.getRow(), position.getColumn());
      this.getContentElement().setAttribute("aria-activedescendant", cellOnDisplay ? pane.getCellId(position.getRow(), position.getColumn()) : null);
    },

    /**
     * Returns the focused cell
     *
     * @return {qxl.datagrid.source.Position?} row and column in the data source
     */
    getFocusedPosition() {
      return this.__selectionManager.getFocusedPosition();
    },

    /**
     * Moves the keyboard focus to a cell and scrolls it into view
     *
     * @param {Integer} row row in the data source
     * @param {Integer} column column in the data source
     */
    setFocusedPosition(row, column) {
      this.__selectionManager.setFocusedPosition(new qxl.datagrid.source.Position(row, column));
      this.scrollToPosition(row, column);
    },

    /**
     * Scrolls the grid so that the cell is on display; implemented by the scrolling grids
     *
     * @param {Integer} row row in the data source
     * @param {Integer} column column in the data source
     */
    scrollToPosition(row, column) {},

    /**
     * Event handler for `focus`: without a focused cell, the first cell on display gets the focus
     */
    __onFocus() {
      let sizes = this.__sizeCalculator.getSizes();
      let dataSource = this.getDataSource();
      if (this.getFocusedPosition() || !sizes || !dataSource || dataSource.getSize().getRow() == 0) {
        return;
      }
      let row = sizes.rows.find(rowData => rowData.rowIndex >= 0)?.rowIndex ?? 0;
      let column = sizes.columns[0]?.columnIndex ?? 0;
      this.__selectionManager.setFocusedPosition(new qxl.datagrid.source.Position(row, column));
    },

    /**
     * Event handler for `keypress`: moves the focus between the cells
     *
     * @param {qx.event.type.KeySequence} evt
     */
    _onKeyPress(evt) {
      let dataSource = this.getDataSource();
      let columns = this.getColumns();
      if (!dataSource || !columns || dataSource.getSize().getRow() == 0) {
        return;
      }
      if (this.__handleEditingKey(evt)) {
        return;
      }
      this.__moveFocusByKey(evt);
    },

    /**
     * Moves the focus for a navigation key and scrolls along
     *
     * @param {qx.event.type.KeySequence} evt
     */
    __moveFocusByKey(evt) {
      let dataSource = this.getDataSource();
      let columns = this.getColumns();
      let position = this.getFocusedPosition();
      let modifiers = { shift: evt.isShiftPressed(), ctrl: evt.isCtrlOrCommandPressed() };
      let target = qxl.datagrid.DataGrid.computeFocusMove(
        evt.getKeyIdentifier(),
        modifiers,
        position ? { row: position.getRow(), column: position.getColumn() } : null,
        dataSource.getSize().getRow(),
        columns.getLength(),
        this._getPageRowCount()
      );
      if (target === undefined) {
        return;
      }
      if (target === null) {
        // Tab on the first or last cell leaves the grid, the focus handler moves on
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      this.setFocusedPosition(target.row, target.column);
    },

    /**
     * Returns how many rows Page Up and Page Down move, ie the rows fully on display
     *
     * @return {Integer} number of rows, at least 1
     */
    _getPageRowCount() {
      let sizes = this.__sizeCalculator.getSizes();
      let dataRows = sizes ? sizes.rows.filter(rowData => rowData.rowIndex >= 0).length : 1;
      return Math.max(1, dataRows - 1);
    },

    /**
     * Handles the keys for editing; called before the keys move the focus
     *
     * @param {qx.event.type.KeySequence} evt
     * @return {Boolean} true if the key has been dealt with and must not move the focus
     */
    __handleEditingKey(evt) {
      const stop = () => {
        evt.preventDefault();
        evt.stopPropagation();
      };
      let key = evt.getKeyIdentifier();
      if (!this.__editing) {
        if (!this.getEditable()) {
          return false;
        }
        if (key == "F2" || key == "Enter") {
          this.startEditing();
          stop();
          return true;
        }
        if (key == "Space" && this.toggleFocusedCell()) {
          stop();
          return true;
        }
        return false;
      }
      switch (key) {
        case "Escape":
          this.cancelEditing();
          stop();
          return true;

        case "Enter":
          if (this.__isEditorPopupOpen()) {
            // the select box takes the item first
            return true;
          }
          this.commitEditing();
          stop();
          return true;

        case "Tab":
          if (!this.commitEditing()) {
            stop();
            return true;
          }
          return false;

        case "F2":
          this.startEditing();
          stop();
          return true;

        default:
          if (evt.getTarget() !== this) {
            // all other keys belong to the editor
            return true;
          }
          // the grid has the focus while the editor is open (eg scrolled out of view): moving commits
          if (qxl.datagrid.DataGrid.computeFocusMove(key, {}, { row: 0, column: 0 }, 1, 1, 1) === undefined) {
            return true;
          }
          if (!this.commitEditing()) {
            stop();
            return true;
          }
          return false;
      }
    },

    /**
     * Capturing event handler for `keypress` in the editor: Enter takes the value (unless a drop down
     * list of the editor is open, then it picks the item), Tab takes the value and moves on
     *
     * @param {qx.event.type.KeySequence} evt
     */
    __onEditorKeyPress(evt) {
      if (!this.__editing || evt.getTarget() === this) {
        return;
      }
      let key = evt.getKeyIdentifier();
      if (key == "Enter" && !this.__isEditorPopupOpen()) {
        evt.preventDefault();
        evt.stopPropagation();
        this.commitEditing();
      } else if (key == "Tab") {
        evt.preventDefault();
        evt.stopPropagation();
        if (this.commitEditing()) {
          this.__moveFocusByKey(evt);
        }
      }
    },

    /**
     * Event handler for `keyinput`: a typed character opens the editor with this character
     *
     * @param {qx.event.type.KeyInput} evt
     */
    _onKeyInput(evt) {
      if (evt.getTarget() !== this || !this.getEditable()) {
        return;
      }
      if (this.__editing) {
        // the editor is out of view; bring it back, the character is not added
        this.startEditing();
        return;
      }
      if (this.startEditing(evt.getChar())) {
        evt.preventDefault();
      }
    },

    /**
     * Whether the editor shows a drop down list which is open, eg of a select box
     *
     * @return {Boolean}
     */
    __isEditorPopupOpen() {
      let editor = this.__editing?.editor;
      return editor instanceof qx.ui.form.AbstractSelectBox && editor.getChildControl("popup").isVisible();
    },

    /**
     * Returns the focused cell with its column and model
     *
     * @return {{row: Integer, columnIndex: Integer, column: qxl.datagrid.column.Column, model: qx.core.Object}?}
     */
    __getFocusedCell() {
      let position = this.getFocusedPosition();
      let dataSource = this.getDataSource();
      if (!position || !dataSource) {
        return null;
      }
      let column = this.getColumns().getColumn(position.getColumn());
      let model = dataSource.getModelForPosition(position);
      if (!column || !model) {
        return null;
      }
      return { row: position.getRow(), columnIndex: position.getColumn(), column, model };
    },

    /**
     * Whether an editor is open, possibly scrolled out of view
     *
     * @return {Boolean}
     */
    isEditing() {
      return !!this.__editing;
    },

    /**
     * Opens the editor of the focused cell; a column without editor (eg a boolean) switches its
     * value instead. If an editor is already open, it is brought into view and focused.
     *
     * @param {String?} initialText text which replaces the value in a text editor, eg a typed
     *  character; a column without editor ignores the call then
     * @return {Boolean} true if an editor is open or the value has been switched
     */
    startEditing(initialText) {
      let pane = this.getQxObject("widgetPane");
      let editing = this.__editing;
      if (editing) {
        this.__selectionManager.setFocusedPosition(new qxl.datagrid.source.Position(editing.row, editing.columnIndex));
        this.scrollToPosition(editing.row, editing.columnIndex);
        editing.editor.focus();
        return true;
      }
      let cell = this.__getFocusedCell();
      if (!cell || !this.getEditable() || !cell.column.isEditable()) {
        return false;
      }
      let editor = cell.column.createWidgetForEdit();
      if (!editor) {
        return initialText === undefined && this.toggleFocusedCell();
      }
      cell.column.setEditorValue(editor, cell.column.getModelValue(cell.model));
      let textEditor = editor instanceof qx.ui.form.AbstractField;
      if (textEditor && initialText !== undefined) {
        editor.setValue(initialText);
      }
      editing = this.__editing = { ...cell, editor, listeners: [] };
      editing.listeners.push(
        [editor, editor.addListener("blur", () => this.__onEditorBlur(editing))],
        [cell.column, cell.column.addListener("changeEffectivelyReadOnly", () => this.__cancelIfNotEditable())],
        [cell.column, cell.column.addListener("changeEffectivelyEnabled", () => this.__cancelIfNotEditable())]
      );
      editor.addListenerOnce("appear", () => {
        editor.focus();
        if (textEditor) {
          if (initialText === undefined) {
            editor.selectAllText();
          } else {
            editor.setTextSelection(initialText.length, initialText.length);
          }
        }
      });
      this.scrollToPosition(cell.row, cell.columnIndex);
      pane.showEditor(editor, cell.row, cell.columnIndex);
      return true;
    },

    /**
     * Takes the value of the editor: it is checked by the column and `cellValidator`, written into
     * the model and `cellValueChanged` is fired. A rejected value keeps the editor open and shows the
     * message.
     *
     * @param {Boolean?} refocus whether the grid takes back the keyboard focus, default true
     * @return {Boolean} true if no editor is open any more
     */
    commitEditing(refocus = true) {
      let editing = this.__editing;
      if (!editing) {
        return true;
      }
      let error;
      try {
        let value = editing.column.getEditorValue(editing.editor);
        error = this.__writeValue(editing, value);
      } catch (ex) {
        error = ex.message;
      }
      if (error) {
        this.setCellError(editing.model, editing.column, error);
        editing.rejected = true;
        if (typeof editing.editor.setValid == "function") {
          editing.editor.setInvalidMessage(error);
          editing.editor.setValid(false);
        }
        if (refocus && this.getQxObject("widgetPane").isEditorOnDisplay()) {
          editing.editor.focus();
        }
        return false;
      }
      this.__closeEditor(refocus);
      return true;
    },

    /**
     * Closes the editor without taking its value
     */
    cancelEditing() {
      let editing = this.__editing;
      if (editing) {
        if (editing.rejected) {
          this.setCellError(editing.model, editing.column, null);
        }
        this.__closeEditor(true);
      }
    },

    /**
     * Switches the value of the focused cell, for columns without editor (see
     * `Column.getToggledValue`); a value rejected by `cellValidator` is shown as error of the cell
     *
     * @return {Boolean} true if the column can be switched, even if the value was rejected
     */
    toggleFocusedCell() {
      let cell = this.__getFocusedCell();
      if (!cell || !this.getEditable() || !cell.column.isEditable()) {
        return false;
      }
      let value = cell.column.getToggledValue(cell.column.getModelValue(cell.model));
      if (value === undefined) {
        return false;
      }
      let error = this.__writeValue(cell, value);
      if (error) {
        this.setCellError(cell.model, cell.column, error);
      }
      return true;
    },

    /**
     * Checks a value with `cellValidator`, writes it into the model and fires `cellValueChanged`;
     * a value accepted for the cell removes its error
     *
     * @param {Object} cell `{row, columnIndex, column, model}`
     * @param {*} value the new value
     * @return {String?} the error message if the value has been rejected
     */
    __writeValue(cell, value) {
      let oldValue = cell.column.getModelValue(cell.model);
      let validator = this.getCellValidator();
      let message = validator ? validator(cell.model, cell.column, value, oldValue) : null;
      if (message) {
        return message;
      }
      if (this.getCellError(cell.model, cell.column)) {
        this.setCellError(cell.model, cell.column, null);
      }
      if (value !== oldValue) {
        cell.column.setModelValue(cell.model, value);
        this.fireDataEvent("cellValueChanged", { model: cell.model, column: cell.column, row: cell.row, columnIndex: cell.columnIndex, value, oldValue });
      }
      return null;
    },

    /**
     * Removes and disposes the editor
     *
     * @param {Boolean} refocus whether the grid takes back the keyboard focus
     */
    __closeEditor(refocus) {
      let editing = this.__editing;
      this.__editing = null;
      editing.listeners.forEach(([target, id]) => target.removeListenerById(id));
      this.getQxObject("widgetPane").removeEditor();
      editing.editor.dispose();
      if (refocus) {
        this.focus();
      }
    },

    /**
     * Takes the value when the keyboard focus leaves the grid from the editor; hiding the editor
     * while scrolling moves the focus to the grid and takes nothing
     *
     * @param {Object} editing the editing state the editor belongs to
     */
    __onEditorBlur(editing) {
      qx.event.Timer.once(
        () => {
          if (this.__editing !== editing || !this.getQxObject("widgetPane").isEditorOnDisplay()) {
            return;
          }
          let focused = qx.ui.core.FocusHandler.getInstance().getFocusedWidget();
          if (focused && qx.ui.core.Widget.contains(this, focused)) {
            return;
          }
          this.commitEditing(false);
        },
        this,
        0
      );
    },

    /**
     * Moves the keyboard focus from the editor to the grid when the editor has been hidden, before
     * the browser drops the focus of the hidden element
     */
    __keepFocusWhileEditorHidden() {
      let editing = this.__editing;
      if (editing && !this.getQxObject("widgetPane").isEditorOnDisplay() && qx.ui.core.FocusHandler.getInstance().isFocused(editing.editor)) {
        this.focus();
      }
    },

    /**
     * Keeps the editor on its model after rows were added or removed; without the model the editor
     * is closed
     */
    __followEditedModel() {
      let editing = this.__editing;
      if (!editing) {
        return;
      }
      let dataSource = this.getDataSource();
      if (typeof dataSource.isModelValid == "function" && !dataSource.isModelValid(editing.model)) {
        this.cancelEditing();
        return;
      }
      let row = dataSource.getPositionOfModel(editing.model)?.getRow();
      if (row !== undefined && row >= 0 && row !== editing.row) {
        editing.row = row;
        this.getQxObject("widgetPane").moveEditor(row);
      }
    },

    /**
     * Closes the editor without taking its value when its column cannot be edited any more
     */
    __cancelIfNotEditable() {
      if (this.__editing && !this.__editing.column.isEditable()) {
        this.cancelEditing();
      }
    },

    /**
     * Apply for `editable`
     *
     * @param {Boolean} value
     */
    _applyEditable(value) {
      if (!value) {
        this.cancelEditing();
      }
    },

    /**
     * Event handler for a click on a cell: takes the value of an open editor of another cell and
     * switches a boolean cell
     *
     * @param {Object} cell `{row, column, model}` as fired by the widget pane
     */
    __onCellTap(cell) {
      let editing = this.__editing;
      if (editing && (cell.row !== editing.row || cell.column !== editing.columnIndex)) {
        if (!this.commitEditing()) {
          this.__selectionManager.setFocusedPosition(new qxl.datagrid.source.Position(editing.row, editing.columnIndex));
          return;
        }
      }
      if (!this.__editing && this.getEditable()) {
        let column = this.getColumns().getColumn(cell.column);
        if (column && column.getToggledValue(column.getModelValue(cell.model)) !== undefined) {
          this.toggleFocusedCell();
        }
      }
    },

    /**
     * Event handler for a double click on a cell: opens the editor
     *
     * @param {Object} cell `{row, column, model}` as fired by the widget pane
     */
    __onCellDoubleTap(cell) {
      let column = this.getColumns().getColumn(cell.column);
      if (!this.getEditable() || !column || column.getToggledValue(column.getModelValue(cell.model)) !== undefined) {
        return;
      }
      this.startEditing();
    },

    /**
     * Sets or removes the error message of a cell, eg from a check on the server; the cell shows the
     * state `invalid` and the message as tool tip while it is on display. Accepting a new value for
     * the cell removes its error.
     *
     * @param {qx.core.Object} model the model of the cell
     * @param {qxl.datagrid.column.Column} column the column of the cell
     * @param {String?} message the error, null to remove it
     */
    setCellError(model, column, message) {
      let columnIndex = this.getColumns().indexOf(column);
      let key = qxl.datagrid.ui.WidgetPane.cellErrorKey(model, columnIndex);
      if (message) {
        this.__cellErrors.set(key, message);
      } else {
        this.__cellErrors.delete(key);
      }
      let row = this.getDataSource()?.getPositionOfModel(model)?.getRow();
      if (row !== undefined && row >= 0) {
        this.getQxObject("widgetPane").updateCellError(row, columnIndex);
      }
    },

    /**
     * Returns the error message of a cell
     *
     * @param {qx.core.Object} model the model of the cell
     * @param {qxl.datagrid.column.Column} column the column of the cell
     * @return {String?} the error, null if there is none
     */
    getCellError(model, column) {
      return this.__cellErrors.get(qxl.datagrid.ui.WidgetPane.cellErrorKey(model, this.getColumns().indexOf(column))) ?? null;
    },

    /**
     * Removes the error messages of all cells
     */
    resetCellErrors() {
      this.__cellErrors.clear();
      this.getQxObject("widgetPane").updateCellErrors();
    },

    /**
     * Schedules the `updateWidgets` call to happen in the near future, debounced
     * @async
     */
    scheduleUpdateWidgets() {
      return this.__debounceUpdateWidgets.run();
    },

    /**
     * @override
     */
    getWidgetSize(rowIndex, columnIndex) {
      let styling = this.__sizeCalculator.getStyling();
      let minHeight = styling.getMinRowHeight();
      let maxHeight = styling.getMaxRowHeight();
      let minWidth = styling.getMinColumnWidth();
      let maxWidth = styling.getMaxColumnWidth();

      let size = { minWidth, width: null, maxWidth, minHeight, height: null, maxHeight };
      if (rowIndex < 0) {
        size.height = styling.getHeaderRowHeight();
        return size;
      }
      let dynamicSizing = this.getDynamicSizing();
      if (dynamicSizing === "none") {
        return size;
      }
      // the last size is only needed by `renderLayout` to detect changes for dynamic sizing
      let widget = this.getQxObject("widgetPane").getChildAtPosition(rowIndex, columnIndex);
      if (dynamicSizing === "rows" || dynamicSizing === "both") {
        size.height = widget?.getSizeHint(true).height;
      }
      if (dynamicSizing === "columns" || dynamicSizing === "both") {
        size.width = widget?.getSizeHint(true).width;
      }
      widget?.setUserData("qxl.datagrid.lastSize", size);
      return size;
    },

    /**
     * Sets the grid size calculator's available size based on the requested width and height.
     * @param {Integer} width
     * @param {Integer} height
     * @returns {boolean}
     */
    _setAvailableSize(width, height) {
      let initialOffsetLeft = this.getQxObject("widgetPane").getPaddingLeft();
      let initialOffsetTop = this.getQxObject("widgetPane").getPaddingTop();
      return this.__sizeCalculator.setAvailableSize(width, height, 0, 0, initialOffsetLeft, initialOffsetTop);
    },

    /**
     * @Override
     */
    renderLayout(left, top, width, height) {
      let changed = this._setAvailableSize(width, height);
      let dynamicSizing = this.getDynamicSizing();
      let dsRows = dynamicSizing === "rows" || dynamicSizing === "both";
      let dsCols = dynamicSizing === "columns" || dynamicSizing === "both";
      if (!changed && (dsRows || dsCols)) {
        for (let widget of this.getQxObject("widgetPane").getLayoutChildren()) {
          let target = widget.getSizeHint();
          let current = widget.getUserData("qxl.datagrid.lastSize");
          if (!target) {
            continue;
          }
          if (dsRows) {
            let tooBig = (current?.height ?? Infinity) > (target.maxHeight ?? Infinity);
            let tooSmall = (current?.height ?? -Infinity) < (target.minHeight ?? 0);
            if (tooBig || tooSmall) {
              changed = true;
              this.__sizeCalculator.invalidate();
              break;
            }
          }
          if (dsCols) {
            let tooBig = (current?.width ?? Infinity) > (target.maxWidth ?? Infinity);
            let tooSmall = (current?.width ?? -Infinity) < (target.minWidth ?? 0);
            if (tooBig || tooSmall) {
              changed = true;
              this.__sizeCalculator.invalidate();
              break;
            }
          }
        }
      }
      super.renderLayout(left, top, width, height);
      if (changed) {
        this.updateWidgets();
      }
    },

    /**
     * @Override
     */
    _computeSizeHint() {
      var minWidth = this.getMinWidth() || 0;
      var minHeight = this.getMinHeight() || 0;

      var width = this.getWidth() || minWidth;
      var height = this.getHeight() || minHeight;

      var maxWidth = this.getMaxWidth() || Infinity;
      var maxHeight = this.getMaxHeight() || Infinity;

      return {
        minWidth: minWidth,
        width: width,
        maxWidth: maxWidth,
        minHeight: minHeight,
        height: height,
        maxHeight: maxHeight
      };
    },

    /**
     * Returns an array of currently selected model items
     *
     * @return {qx.data.Array} List of items.
     */
    getSelection() {
      return this.__selectionManager.getSelection();
    },

    /**
     * Replaces current model selection with the given items.
     *
     * @param items {*[]} Items to select.
     */
    setSelection(items) {
      this.__selectionManager.setSelection(items);
    },

    /**
     * Clears the whole selection at once.
     */
    resetSelection() {
      this.__selectionManager.resetSelection();
    },

    /**
     * Returns the selection manager
     *
     * @returns {qxl.datagrid.ui.SelectionManager}
     */
    getSelectionManager() {
      return this.__selectionManager;
    },

    /**
     * @returns {qxl.datagrid.ui.GridSizeCalculator} size calculator
     */
    getSizeCalculator() {
      return this.__sizeCalculator;
    },

    /**
     * @returns {qxl.datagrid.ui.GridStyling} styling
     */
    getStyling() {
      return this.__sizeCalculator.getStyling();
    },

    /**
     * @override
     */
    getDataSourceSize() {
      return this.getDataSource().getSize();
    }
  },

  statics: {
    /**
     * Computes where a key moves the focus to
     *
     * @param {String} key key identifier, eg "Down", "Tab", "PageUp"
     * @param {{shift: Boolean, ctrl: Boolean}} modifiers pressed modifier keys
     * @param {{row: Integer, column: Integer}?} position the focused cell, null if there is none
     * @param {Integer} rowCount number of rows in the data source
     * @param {Integer} columnCount number of columns
     * @param {Integer} pageRows how many rows Page Up and Page Down move
     * @return {{row: Integer, column: Integer}|null|undefined} the cell to focus; null if the focus
     *  leaves the grid (Tab on the last or Shift+Tab on the first cell); undefined if the key does not
     *  move the focus
     */
    computeFocusMove(key, modifiers, position, rowCount, columnCount, pageRows) {
      const clamp = (value, max) => Math.max(0, Math.min(max - 1, value));
      if (!position) {
        return ["Up", "Down", "Left", "Right", "Home", "End", "PageUp", "PageDown"].includes(key) ? { row: 0, column: 0 } : undefined;
      }
      let { row, column } = position;
      switch (key) {
        case "Up":
          return { row: clamp(row - 1, rowCount), column };
        case "Down":
          return { row: clamp(row + 1, rowCount), column };
        case "Left":
          return { row, column: clamp(column - 1, columnCount) };
        case "Right":
          return { row, column: clamp(column + 1, columnCount) };
        case "PageUp":
          return { row: clamp(row - pageRows, rowCount), column };
        case "PageDown":
          return { row: clamp(row + pageRows, rowCount), column };
        case "Home":
          return modifiers.ctrl ? { row: 0, column: 0 } : { row, column: 0 };
        case "End":
          return modifiers.ctrl ? { row: rowCount - 1, column: columnCount - 1 } : { row, column: columnCount - 1 };
        case "Tab":
          if (modifiers.shift) {
            if (column > 0) {
              return { row, column: column - 1 };
            }
            return row > 0 ? { row: row - 1, column: columnCount - 1 } : null;
          }
          if (column < columnCount - 1) {
            return { row, column: column + 1 };
          }
          return row < rowCount - 1 ? { row: row + 1, column: 0 } : null;
        default:
          return undefined;
      }
    }
  }
});
