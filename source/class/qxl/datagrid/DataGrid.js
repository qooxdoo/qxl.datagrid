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
    // `editable` starts as false, its apply is not called for the init value
    this.getContentElement().setAttribute("aria-readonly", "true");
    this.getQxObject("oddEvenRows").setCellIdFunction((row, column) => this.getQxObject("widgetPane").getCellId(row, column));
    this.getQxObject("widgetPane").addListener("changeHoveredRow", evt => this.getQxObject("oddEvenRows").setHoveredRow(evt.getData()));
    this.__selectionManager.addListener("changeFocusedPosition", () => {
      // a click into the data or setFocusedPosition leaves the header
      if (this.getFocusedPosition() && this.__headerColumn !== null) {
        this.__setHeaderColumn(null);
      }
      this.__updateActiveDescendant();
    });
    this.addListener("keypress", this._onKeyPress, this);
    // browsers fire no keypress for Ctrl with a letter
    this.addListener("keydown", this.__onKeyDown, this);
    this.addListener("focus", this.__onFocus, this);
    // qooxdoo has no clipboard events; the browser sends them to the focused grid element
    // a right click on the header opens the column menu at the pointer
    this.getQxObject("header").addListener("contextmenu", evt => {
      if (this.__openColumnMenu(null, evt)) {
        evt.stop();
      }
    });
    this.__onClipboard = evt => this.__handleClipboard(evt);
    qx.bom.Event.addNativeListener(document, "copy", this.__onClipboard);
    qx.bom.Event.addNativeListener(document, "paste", this.__onClipboard);

    this.__editingController = new qxl.datagrid.ui.EditingController(this);
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

    /**
     * Decides per cell whether it may be edited, on top of `editable` and the column:
     * `(model, column) => Boolean`; only `false` locks the cell. It applies to the editor, to switching
     * booleans and to `aria-readonly`. When the answer changes with the model, call
     * `scheduleUpdateWidgets()` (or `updateWidgets()` at once) so that the cells on display follow.
     * A locked cell looks like any other; to show it, return a state from `cellStates`.
     */
    cellEditable: {
      init: null,
      nullable: true,
      check: "Function",
      event: "changeCellEditable",
      apply: "_applyCellEditable"
    },

    /**
     * States for the row widgets, eg "changed" or "deleted", for the theme: `(model) => String[]?`
     * with the model of the row. States the function no longer returns are removed, also from row
     * widgets reused while scrolling. After changes call `scheduleUpdateWidgets()` (or
     * `updateWidgets()`), which renders again without binding the cells anew. The grid sets "selected",
     * "focused", "even" and "odd" itself.
     */
    rowStates: {
      init: null,
      nullable: true,
      check: "Function",
      event: "changeRowStates",
      apply: "_applyRowStates"
    },

    /**
     * States for the cell widgets, eg "changed", for the theme: `(model, column) => String[]?`; like
     * `rowStates`. The grid sets "selected", "focused" and "invalid" itself; an invalid cell is reported
     * with `setCellError`, which also tells screen readers.
     */
    cellStates: {
      init: null,
      nullable: true,
      check: "Function",
      event: "changeCellStates",
      apply: "_applyCellStates"
    },

    /**
     * Whether a button at the right end of the header opens the column menu, where the user shows and
     * hides columns (`Column.visible`, except columns with `hideable: false`), like in `qx.ui.table`.
     * The same menu opens with a right click on the header and with the menu key in the header.
     */
    columnVisibilityButtonVisible: {
      init: false,
      check: "Boolean",
      event: "changeColumnVisibilityButtonVisible",
      apply: "_applyColumnVisibilityButtonVisible"
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
      comp.add(this.getQxObject("headerArea"));
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

    /** The header with the column button over its right end, in one place for all grids */
    headerArea() {
      let area = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
      area.add(this.getQxObject("header"), { edge: 0 });
      area.add(this.getQxObject("columnButton"), { right: 0, top: 0, bottom: 0 });
      return area;
    },

    /** Opens the column menu; shown with `columnVisibilityButtonVisible` */
    columnButton() {
      let button = new qx.ui.form.Button().set({ appearance: "qxl-datagrid-column-button", visibility: "excluded", width: 16 });
      button.setAriaLabel(qx.locale.Manager.tr("Columns"));
      button.addListener("execute", () => this.__openColumnMenu(button));
      return button;
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
    cellValueChanged: "qx.event.type.Data",

    /**
     * Fired before the user sorts by a click or a key on the header; data is
     * `{column, sortOrder, add}` with the new sort order of the column and whether it is added to the
     * other sorted columns (Shift). `preventDefault()` cancels the sorting. Setting `sortOrder` in code
     * does not fire it.
     */
    beforeSort: "qx.event.type.Data"
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

    /** @type {qxl.datagrid.ui.EditingController} edits the cells */
    __editingController: null,

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
     * Event handler for changes in the columns array and of the widths of columns: the sizes are
     * calculated again; a new width is shown at once, so that dragging a header edge follows smoothly
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
      this.__sizeCalculator.invalidate();
      if (data.type == "size") {
        this.__moveFocusOffHiddenColumns();
        this.updateWidgets();
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
      this.__editingController?.onDataSourceChangeSize();
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
      this.__editingController?.onPaneUpdated();
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
      element.setAttribute("aria-colcount", columns.getVisibleIndexes().length);
      element.setAttribute("aria-multiselectable", ["multi", "additive"].includes(this.__selectionManager.getSelectionMode()));
    },

    /**
     * Points `aria-activedescendant` to the focused cell, if it is on display
     */
    __updateActiveDescendant() {
      if (this.__headerColumn !== null) {
        this.getContentElement().setAttribute("aria-activedescendant", this.getQxObject("header").getCellId(this.__headerColumn));
        return;
      }
      let position = this.__selectionManager.getFocusedPosition();
      let pane = this.getQxObject("widgetPane");
      let cellOnDisplay = position && pane.getChildAtPosition(position.getRow(), position.getColumn());
      this.getContentElement().setAttribute("aria-activedescendant", cellOnDisplay ? pane.getCellId(position.getRow(), position.getColumn()) : null);
    },

    /** @type {Integer?} the column whose header cell has the keyboard focus, null in the data */
    __headerColumn: null,

    /**
     * Moves the keyboard focus into the header (a column) or out of it (null); while in the header
     * no data cell is focused
     *
     * @param {Integer?} column column index
     */
    __setHeaderColumn(column) {
      this.__headerColumn = column;
      this.getQxObject("header").setFocusedColumn(column);
      if (column !== null) {
        this.__selectionManager.setFocusedPosition(null);
        let firstRow = this.__sizeCalculator.getSizes()?.rows.find(rowData => rowData.rowIndex >= 0)?.rowIndex ?? 0;
        this.scrollToPosition(firstRow, column);
      }
      this.__updateActiveDescendant();
    },

    /**
     * Keys while a header cell has the focus: Left/Right/Home/End move along the header, Down goes
     * back to the first row, Enter/Space sort (with Shift as additional criterion), Shift+Left/Right
     * change the width by 10 pixels; Tab leaves the grid
     *
     * @param {qx.event.type.KeySequence} evt
     */
    __onHeaderKey(evt) {
      let key = evt.getKeyIdentifier();
      let columns = this.getColumns();
      let column = this.__headerColumn;
      let shift = evt.isShiftPressed();
      if ((key == "Left" || key == "Right") && shift) {
        let width = this.__sizeCalculator.getSizes()?.columns.find(columnData => columnData.columnIndex == column)?.width;
        columns.getColumn(column).resize((width ?? columns.getColumn(column).getWidth() ?? 0) + (key == "Right" ? 10 : -10));
      } else if (key == "Left" || key == "Right" || key == "Home" || key == "End") {
        // the same moves as in the data, over hidden columns
        let target = qxl.datagrid.DataGrid.computeFocusMove(key, {}, { row: 0, column }, 1, columns.getVisibleIndexes(), 1);
        this.__setHeaderColumn(target.column);
      } else if (key == "Apps" || (key == "F10" && shift)) {
        this.__openColumnMenu(this.getQxObject("header").getCell(column));
      } else if (key == "Down") {
        this.__setHeaderColumn(null);
        this._moveFocusTo(0, column);
      } else if (key == "Enter" || key == "Space") {
        this.toggleSort(columns.getColumn(column), shift);
      } else {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
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
      if (this.getFocusedPosition() || this.__headerColumn !== null || !sizes || !dataSource || dataSource.getSize().getRow() == 0) {
        return;
      }
      let row = sizes.rows.find(rowData => rowData.rowIndex >= 0)?.rowIndex ?? 0;
      let column = sizes.columns[0]?.columnIndex ?? 0;
      this.__selectionManager.setFocusedPosition(new qxl.datagrid.source.Position(row, column));
    },

    /**
     * Event handler for `keypress`: moves the focus between the cells and changes the selection
     * (space bar); Tab without an open editor leaves the grid like in `qx.ui.table`
     *
     * @param {qx.event.type.KeySequence} evt
     */
    _onKeyPress(evt) {
      let dataSource = this.getDataSource();
      let columns = this.getColumns();
      if (!dataSource || !columns || dataSource.getSize().getRow() == 0) {
        return;
      }
      if (this.__headerColumn !== null) {
        this.__onHeaderKey(evt);
        return;
      }
      let wasEditing = this.isEditing();
      if (this.__editingController.handleKey(evt)) {
        return;
      }
      let key = evt.getKeyIdentifier();
      if (key == "Tab" && !wasEditing) {
        return;
      }
      if (key == "Space") {
        let position = this.getFocusedPosition();
        if (position) {
          this.__selectionManager.selectAt(position, "space", { shift: evt.isShiftPressed(), ctrl: evt.isCtrlOrCommandPressed() });
          evt.preventDefault();
          evt.stopPropagation();
        }
        return;
      }
      let handled = false;
      if (key == "Escape") {
        handled = evt.getModifiers() == 0 && this.__clearSelectionByKey();
      } else if (key == "Apps" || (key == "F10" && evt.isShiftPressed())) {
        handled = this.__openContextMenu();
      } else {
        handled = evt.getModifiers() == 0 && this.__handleTreeKey(key);
      }
      if (handled) {
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }
      this._moveFocusByKey(evt);
    },

    /**
     * Escape clears the selection in the modes "multi" and "additive", like qooxdoo lists; otherwise
     * the key goes on, eg to close a dialog
     *
     * @return {Boolean} true if a selection has been cleared
     */
    __clearSelectionByKey() {
      let manager = this.__selectionManager;
      if (!["multi", "additive"].includes(manager.getSelectionMode()) || manager.isSelectionEmpty()) {
        return false;
      }
      manager.resetSelection();
      return true;
    },

    /**
     * Opens the context menu of the focused cell next to it (menu key, Shift+F10); pointers open it
     * with the `contextmenu` event as usual
     *
     * @return {Boolean} true if a menu has been opened
     */
    __openContextMenu() {
      let position = this.getFocusedPosition();
      let cell = position && this.getQxObject("widgetPane").getChildAtPosition(position.getRow(), position.getColumn());
      return this.__openMenuAt(cell, cell?.getContextMenu());
    },

    /**
     * Opens a menu next to a widget, for the keyboard
     *
     * @param {qx.ui.core.Widget?} widget
     * @param {qx.ui.menu.Menu?} menu
     * @return {Boolean} true if a menu has been opened
     */
    __openMenuAt(widget, menu) {
      if (!widget || !menu) {
        return false;
      }
      // a menu shared by several widgets keeps the opener it was given last
      menu.setOpener(widget);
      menu.placeToWidget(widget, true);
      menu.show();
      return true;
    },

    /** @type {qx.ui.menu.Menu?} the column menu, made on first use */
    __columnMenu: null,

    /**
     * Fills the column menu with a check box for each column the user may hide; the last shown
     * column cannot be hidden. It is filled anew each time, so added and removed columns need no care.
     *
     * @return {qx.ui.menu.Menu?} null if no column may be hidden
     */
    __buildColumnMenu() {
      let columns = this.getColumns().toArray().filter(column => column.getHideable());
      if (!columns.length) {
        return null;
      }
      let menu = (this.__columnMenu ??= new qx.ui.menu.Menu());
      menu.removeAll().forEach(item => item.destroy());
      let lastShown = this.getColumns().getVisibleIndexes().length == 1;
      for (let column of columns) {
        let item = new qx.ui.menu.CheckBox(column.getCaption() || column.getPath() || "").set({
          value: column.getVisible(),
          enabled: !(lastShown && column.getVisible())
        });
        item.addListener("changeValue", evt => column.setVisible(evt.getData()));
        menu.add(item);
      }
      return menu;
    },

    /**
     * Opens the column menu next to a widget (button, header cell) or at the pointer
     *
     * @param {qx.ui.core.Widget?} widget where to open it
     * @param {qx.event.type.Pointer?} pointerEvent a right click, to open it at the pointer instead
     * @return {Boolean} true if the menu has been opened
     */
    __openColumnMenu(widget, pointerEvent) {
      let menu = this.__buildColumnMenu();
      if (menu && pointerEvent) {
        menu.openAtPointer(pointerEvent);
        return true;
      }
      return this.__openMenuAt(widget, menu);
    },

    /**
     * Apply for `columnVisibilityButtonVisible`
     *
     * @param {Boolean} value
     */
    _applyColumnVisibilityButtonVisible(value) {
      this.getQxObject("columnButton").setVisibility(value ? "visible" : "excluded");
    },

    /**
     * Moves the keyboard focus off a column which has been hidden, to the next shown column; an open
     * editor in it takes its value, or discards it if it is rejected
     */
    __moveFocusOffHiddenColumns() {
      let visibleIndexes = this.getColumns().getVisibleIndexes();
      const nextShown = column => visibleIndexes.find(index => index > column) ?? visibleIndexes[visibleIndexes.length - 1] ?? null;
      if (this.__headerColumn !== null && !visibleIndexes.includes(this.__headerColumn)) {
        this.__setHeaderColumn(nextShown(this.__headerColumn));
      }
      let position = this.getFocusedPosition();
      if (position && !visibleIndexes.includes(position.getColumn())) {
        if (!this.__editingController.commitEditing(false)) {
          this.__editingController.cancelEditing();
        }
        let column = nextShown(position.getColumn());
        if (column !== null) {
          this.__selectionManager.setFocusedPosition(new qxl.datagrid.source.Position(position.getRow(), column));
        }
      }
    },

    /**
     * Keys of a tree in its expansion column, like `qx.ui.tree.Tree`: Right opens a closed node, Left
     * closes an open one or moves to the parent node, Enter opens or closes a node whose cell cannot be
     * edited (otherwise Enter opens the editor). Left on a closed node moves to the parent even if the
     * expansion column is not the first one.
     *
     * @param {String} key key identifier
     * @return {Boolean} true if the key has been dealt with
     */
    __handleTreeKey(key) {
      let dataSource = this.getDataSource();
      let position = this.getFocusedPosition();
      if (!["Left", "Right", "Enter"].includes(key) || !position || typeof dataSource.getNodeStateFor != "function") {
        return false;
      }
      let column = this.getColumns().getColumn(position.getColumn());
      let model = dataSource.getModelForPosition(position);
      let state = model && column instanceof qxl.datagrid.column.tree.ExpansionColumn ? dataSource.getNodeStateFor(model)?.state : null;
      if (!state) {
        return false;
      }
      const logError = ex => this.error("Cannot open or close the node", ex);
      if (state == "closed" && (key == "Right" || key == "Enter")) {
        dataSource.expandNode(model).catch(logError);
      } else if (state == "open" && (key == "Left" || key == "Enter")) {
        dataSource.collapseNode(model).catch(logError);
      } else if (key == "Left") {
        let parent = dataSource.getParentOf(model);
        let parentRow = parent ? dataSource.getPositionOfModel(parent)?.getRow() : -1;
        if (parentRow === undefined || parentRow < 0) {
          return false;
        }
        this._moveFocusTo(parentRow, position.getColumn());
      } else {
        return false;
      }
      return true;
    },

    /** @type {Function} `__handleClipboard` bound to the grid, the native listener for `copy` and `paste` */
    __onClipboard: null,

    /**
     * Native handler for `copy` and `paste` of the document: while the grid itself has the keyboard
     * focus (not an editor), Ctrl+C copies the text of the focused cell and Ctrl+V writes the text
     * into it (see `Column.formatForClipboard` and `Column.parseFromClipboard`)
     *
     * @param {ClipboardEvent} evt
     */
    __handleClipboard(evt) {
      let element = this.getContentElement().getDomElement();
      if (!element || evt.target !== element || !evt.clipboardData) {
        return;
      }
      if (evt.type == "copy") {
        let text = this.__editingController.getFocusedCellText();
        if (text !== null) {
          evt.clipboardData.setData("text/plain", text);
          evt.preventDefault();
        }
      } else if (this.__editingController.pasteIntoFocusedCell(evt.clipboardData.getData("text/plain"))) {
        evt.preventDefault();
      }
    },

    /**
     * Empties the focused cell like Delete does, if it may be edited
     *
     * @return {Boolean} true if the cell could be emptied
     */
    clearFocusedCell() {
      return this.__editingController.clearFocusedCell();
    },

    /**
     * Event handler for `keydown`: Ctrl+A selects everything, if the selection mode allows it; in an
     * open editor it is left to the editor. After a click, qooxdoo sends the keys to the clicked cell
     * widget, so the target is not checked.
     *
     * @param {qx.event.type.KeySequence} evt
     */
    __onKeyDown(evt) {
      if (!this.isEditing() && evt.isCtrlOrCommandPressed() && evt.getKeyIdentifier() == "A" && this.selectAll()) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    },

    /**
     * Selects all rows (or cells), if `selectionMode` allows more than one and the data source has
     * loaded all cells (see `IDataSource.isAvailable`)
     *
     * @return {Boolean} true if everything has been selected
     */
    selectAll() {
      return this.__selectionManager.selectAll();
    },

    /**
     * Sorts like a click on the header of a column (see `Columns.toggleSort`): an open editor takes
     * its value first, then `beforeSort` may cancel
     *
     * @param {qxl.datagrid.column.Column} column
     * @param {Boolean?} add whether the column is added to the other sorted columns (Shift)
     * @return {Boolean} true if the sorting has changed
     */
    toggleSort(column, add) {
      let columns = this.getColumns();
      if (!column.getSortable() || !this.__editingController.commitEditing()) {
        return false;
      }
      let sortOrder = columns.nextSortOrder(column, add);
      if (!this.fireDataEvent("beforeSort", { column, sortOrder, add: !!add }, null, true)) {
        return false;
      }
      columns.toggleSort(column, add);
      return true;
    },

    /**
     * Moves the focus for a navigation key, scrolls along and lets the selection follow (see
     * `SelectionManager.selectAt`); Shift+Tab does not select a range and Ctrl+Home/End select like
     * moves without Ctrl
     *
     * @param {qx.event.type.KeySequence} evt
     */
    _moveFocusByKey(evt) {
      let dataSource = this.getDataSource();
      let columns = this.getColumns();
      let position = this.getFocusedPosition();
      let key = evt.getKeyIdentifier();
      let modifiers = { shift: evt.isShiftPressed(), ctrl: evt.isCtrlOrCommandPressed() };
      // Up in the first row goes into the header, like in a WAI-ARIA grid
      if (key == "Up" && position?.getRow() == 0 && evt.getModifiers() == 0 && this.getStyling().getNumHeaderRows() > 0) {
        evt.preventDefault();
        evt.stopPropagation();
        this.__setHeaderColumn(position.getColumn());
        return;
      }
      let target = qxl.datagrid.DataGrid.computeFocusMove(
        key,
        modifiers,
        position ? { row: position.getRow(), column: position.getColumn() } : null,
        dataSource.getSize().getRow(),
        columns.getVisibleIndexes(),
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
      this._moveFocusTo(target.row, target.column, {
        shift: modifiers.shift && key != "Tab",
        ctrl: modifiers.ctrl && key != "Home" && key != "End"
      });
    },

    /**
     * Moves the focus to a cell, scrolls it into view and lets the selection follow like for a key
     * which moved the focus
     *
     * @param {Integer} row row in the data source
     * @param {Integer} column column in the data source
     * @param {Object?} modifiers modifier keys for the selection, `{shift, ctrl}`
     */
    _moveFocusTo(row, column, modifiers) {
      this.setFocusedPosition(row, column);
      this.__selectionManager.selectAt(this.getFocusedPosition(), "move", modifiers);
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
     * Returns the controller which edits the cells
     *
     * @return {qxl.datagrid.ui.EditingController}
     */
    getEditingController() {
      return this.__editingController;
    },

    /**
     * Whether an editor is open, possibly scrolled out of view
     *
     * @return {Boolean}
     */
    isEditing() {
      return this.__editingController.isEditing();
    },

    /**
     * Opens the editor of the focused cell, see `qxl.datagrid.ui.EditingController#startEditing`
     *
     * @param {String?} initialText text which replaces the value in a text editor
     * @return {Boolean} true if an editor is open or the value has been switched
     */
    startEditing(initialText) {
      return this.__editingController.startEditing(initialText);
    },

    /**
     * Takes the value of the editor, see `qxl.datagrid.ui.EditingController#commitEditing`
     *
     * @param {Boolean?} refocus whether the grid takes back the keyboard focus, default true
     * @return {Boolean} true if no editor is open any more
     */
    commitEditing(refocus = true) {
      return this.__editingController.commitEditing(refocus);
    },

    /**
     * Closes the editor without taking its value
     */
    cancelEditing() {
      this.__editingController.cancelEditing();
    },

    /**
     * Switches the value of the focused cell, for columns without editor
     *
     * @return {Boolean} true if the column can be switched, even if the value was rejected
     */
    toggleFocusedCell() {
      return this.__editingController.toggleFocusedCell();
    },

    /**
     * Sets or removes the error message of a cell, see `qxl.datagrid.ui.EditingController#setCellError`
     *
     * @param {qx.core.Object} model the model of the cell
     * @param {qxl.datagrid.column.Column} column the column of the cell
     * @param {String?} message the error, null to remove it
     */
    setCellError(model, column, message) {
      this.__editingController.setCellError(model, column, message);
    },

    /**
     * Returns the error message of a cell
     *
     * @param {qx.core.Object} model the model of the cell
     * @param {qxl.datagrid.column.Column} column the column of the cell
     * @return {String?} the error, null if there is none
     */
    getCellError(model, column) {
      return this.__editingController.getCellError(model, column);
    },

    /**
     * Removes the error messages of all cells
     */
    resetCellErrors() {
      this.__editingController.resetCellErrors();
    },

    /**
     * Apply for `editable`
     *
     * @param {Boolean} value
     */
    _applyEditable(value) {
      if (!value) {
        this.__editingController?.cancelEditing();
      }
      this.getContentElement().setAttribute("aria-readonly", value ? null : "true");
      this.scheduleUpdateWidgets();
    },

    /**
     * Apply for `cellEditable`
     */
    _applyCellEditable() {
      this.scheduleUpdateWidgets();
    },

    /**
     * Apply for `rowStates`
     *
     * @param {Function?} value
     */
    _applyRowStates(value) {
      this.getQxObject("oddEvenRows").setStatesFunction(value);
      this.scheduleUpdateWidgets();
    },

    /**
     * Apply for `cellStates`
     *
     * @param {Function?} value
     */
    _applyCellStates(value) {
      this.getQxObject("widgetPane").setStatesFunction(value);
      this.scheduleUpdateWidgets();
    },

    /**
     * Whether a cell may be edited: `editable`, the column and `cellEditable` allow it
     *
     * @param {qx.core.Object} model the model of the cell
     * @param {qxl.datagrid.column.Column} column the column of the cell
     * @return {Boolean}
     */
    isCellEditable(model, column) {
      return this.__editingController.isCellEditable(model, column);
    },

    /**
     * Schedules the `updateWidgets` call to happen in the near future, debounced
     * @async
     */
    scheduleUpdateWidgets() {
      // the selection manager still reports changes of the data source after the grid is disposed
      return this.__debounceUpdateWidgets?.run();
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

  destruct() {
    qx.bom.Event.removeNativeListener(document, "copy", this.__onClipboard);
    qx.bom.Event.removeNativeListener(document, "paste", this.__onClipboard);
    // the data source often outlives the grid
    this.getDataSource()?.removeListener("changeSize", this._onDataSourceChangeSize, this);
    this._disposeObjects("__debounceUpdateWidgets", "__editingController", "__columnMenu");
  },

  statics: {
    /**
     * Computes where a key moves the focus to
     *
     * @param {String} key key identifier, eg "Down", "Tab", "PageUp"
     * @param {{shift: Boolean, ctrl: Boolean}} modifiers pressed modifier keys
     * @param {{row: Integer, column: Integer}?} position the focused cell, null if there is none
     * @param {Integer} rowCount number of rows in the data source
     * @param {Integer[]} columns indexes of the columns shown, in order (`Columns.getVisibleIndexes`);
     *  hidden columns are skipped, a hidden focused column counts as the next shown one
     * @param {Integer} pageRows how many rows Page Up and Page Down move
     * @return {{row: Integer, column: Integer}|null|undefined} the cell to focus; null if the focus
     *  leaves the grid (Tab on the last or Shift+Tab on the first cell); undefined if the key does not
     *  move the focus
     */
    computeFocusMove(key, modifiers, position, rowCount, columns, pageRows) {
      const clamp = (value, max) => Math.max(0, Math.min(max - 1, value));
      let first = columns[0] ?? 0;
      let last = columns[columns.length - 1] ?? 0;
      if (!position) {
        return ["Up", "Down", "Left", "Right", "Home", "End", "PageUp", "PageDown"].includes(key) ? { row: 0, column: first } : undefined;
      }
      let row = position.row;
      // the place among the shown columns
      let index = columns.findIndex(column => column >= position.column);
      if (index < 0) {
        index = columns.length - 1;
      }
      let onHidden = columns[index] !== position.column;
      let column = columns[index] ?? first;
      const columnAt = i => columns[clamp(i, columns.length)];
      switch (key) {
        case "Up":
          return { row: clamp(row - 1, rowCount), column };
        case "Down":
          return { row: clamp(row + 1, rowCount), column };
        case "Left":
          return { row, column: columnAt(index - 1) };
        case "Right":
          return { row, column: onHidden ? column : columnAt(index + 1) };
        case "PageUp":
          return { row: clamp(row - pageRows, rowCount), column };
        case "PageDown":
          return { row: clamp(row + pageRows, rowCount), column };
        case "Home":
          return modifiers.ctrl ? { row: 0, column: first } : { row, column: first };
        case "End":
          return modifiers.ctrl ? { row: rowCount - 1, column: last } : { row, column: last };
        case "Tab": {
          if (modifiers.shift) {
            if (index > 0) {
              return { row, column: columns[index - 1] };
            }
            return row > 0 ? { row: row - 1, column: last } : null;
          }
          let next = onHidden ? index : index + 1;
          if (next < columns.length) {
            return { row, column: columns[next] };
          }
          return row < rowCount - 1 ? { row: row + 1, column: first } : null;
        }
        default:
          return undefined;
      }
    }
  }
});
