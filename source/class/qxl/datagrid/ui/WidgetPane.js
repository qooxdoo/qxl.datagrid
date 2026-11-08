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
 * Manages the widgets for each of the cells, ie not including the header
 */
qx.Class.define("qxl.datagrid.ui.WidgetPane", {
  extend: qx.ui.core.Widget,

  construct(sizeCalculator, widgetFactory, dataSource, selectionManager) {
    super();
    this.__sizeCalculator = sizeCalculator;
    this.__widgetFactory = widgetFactory;
    this.__selectionManager = selectionManager;
    this.__children = {};
    selectionManager.addListener("changeSelectionStyle", () => this.updateWidgets());
    selectionManager.addListener("changeSelection", () => {
      if (selectionManager.getSelectionStyle() == "cell") {
        this.updateWidgets();
      }
    });
    selectionManager.addListener("changeFocusedPosition", evt => this.__updateFocusState(evt.getData(), evt.getOldData()));
    if (dataSource) {
      this.setDataSource(dataSource);
    }
    this._setLayout(new qxl.datagrid.ui.layout.Fixed());
    // scrolling shifts the content with a transform, so the rows may lie outside of the pane's own box;
    // the parent clips them
    this.getContentElement().setStyles({ overflowX: "visible", overflowY: "visible" });
    this.addListener("tap", this.__onTap, this);
    this.addListener("dbltap", this.__onDoubleTap, this);
  },

  properties: {
    /** The data source */
    dataSource: {
      init: null,
      check: "qxl.datagrid.source.IDataSource",
      event: "changeDataSource"
    },

    appearance: {
      init: "qxl-datagrid-widgetpane",
      refine: true
    },

    shouldDiscardWidgets: {
      check: "Boolean",
      init: true,
      event: "changeShouldDiscardWidgets"
    },

    /**
     * The context menu to be used for widgets on the pane which do not have their own context menu
     */
    widgetsContextMenu: {
      check: "qx.ui.menu.Menu",
      init: null,
      nullable: true,
      event: "changeWidgetsContextMenu",
      apply: "_applyWidgetsContextMenu"
    }
  },

  events: {
    /** Fired when the user clicks on a model item */
    modelTap: "qx.event.type.Data",

    /** Fired when the user double clicks on a model item */
    modelDoubleTap: "qx.event.type.Data",

    /** Fired when the user clicks on a cell, after the focus has moved there; data is `{row, column, model}` */
    cellTap: "qx.event.type.Data",

    /** Fired when the user double clicks on a cell; data is `{row, column, model}` */
    cellDoubleTap: "qx.event.type.Data"
  },

  members: {
    /** @type{qxl.datagrid.ui.GridSizeCalculator} */
    __sizeCalculator: null,

    /** @type{qxl.datagrid.ui.factory.IWidgetFactory} */
    __widgetFactory: null,

    /** @type{qxl.datagrid.selection.SelectionManager} */
    __selectionManager: null,

    /** @type{Boolean} */
    __invalidateAll: false,

    /**@type {Record<string, qx.ui.core.Widget>}*/
    __children: null,

    /** @type {Record<Integer, Integer>?} top of each data row on display, in the coordinates of the pane */
    __rowTops: null,

    /** @type {Integer} top of the first data row on display, ie how far the content is shifted up */
    __firstTop: 0,

    /** @type {Object?} the editor over the cell being edited, `{widget, row, column, coveredCell}` */
    __editor: null,

    /** @type {Map<String, String>?} error messages by `cellErrorKey`, owned by the grid */
    __cellErrors: null,

    /** @type {Function?} `(model, column, columnEditable) => Boolean`, for `aria-readonly` of the cells */
    __cellEditableFn: null,

    /** @type {Function?} `(model, column) => String[]?`, the grid's `cellStates` */
    __statesFn: null,

    /**
     * Sets the function which tells whether a cell may be edited, for `aria-readonly`
     *
     * @param {Function?} fn `(model, column, columnEditable) => Boolean`
     */
    setCellEditableFunction(fn) {
      this.__cellEditableFn = fn;
    },

    /**
     * Sets the function which returns the states of a cell widget from its model (`cellStates`)
     *
     * @param {Function?} fn `(model, column) => String[]?`
     */
    setStatesFunction(fn) {
      this.__statesFn = fn;
    },

    _applyWidgetsContextMenu(value, old) {
      for (let child of Object.values(this.__children)) {
        let ctxMenu = child.getContextMenu();
        if (!ctxMenu || ctxMenu === old) {
          child.setContextMenu(value);
        }
      }
    },

    /**
     * Invalidates all widgets, meaning that they will be recalculated next time `updateWidget` is called
     */
    invalidateAll() {
      this.__invalidateAll = true;
    },

    /**
     * Called to update the widgets and synchronise the sizes, creating widgets via the factory
     *
     * Scrolling only binds, unbinds and positions the cells entering and leaving the display: rows
     * staying on display keep their top and the content is shifted instead, and widgets of leaving
     * cells are reused for entering cells of the same column (if `shouldDiscardWidgets`).
     *
     * Widgets staying on display keep their bound model, so a data source which replaces the model at
     * a position must fire `changeSize`; the grid then rebinds all widgets via `invalidateAll`.
     *
     * @return {Promise?} a promise if the data has to be made available first
     */
    updateWidgets() {
      if (!this.__widgetFactory.getColumns()) {
        return null;
      }
      let columns = this.__widgetFactory.getColumns();
      let dataSource = this.getDataSource();
      let styling = this.__sizeCalculator.getStyling();
      let sizesData = this.__sizeCalculator.getSizes();
      if (!sizesData) {
        return null;
      }
      let minColumnIndex = sizesData.columns[0]?.columnIndex ?? 0;
      let maxColumnIndex = sizesData.columns[sizesData.columns.length - 1]?.columnIndex ?? 0;

      let minRowIndex = null;
      let maxRowIndex = null;
      let minDataRowIndex = null;
      sizesData.rows.forEach(row => {
        if (row.rowIndex >= styling.getNumFixedRows() && (minDataRowIndex === null || minDataRowIndex > row.rowIndex)) {
          minDataRowIndex = row.rowIndex;
        }
        if (minRowIndex === null || minRowIndex > row.rowIndex) {
          minRowIndex = row.rowIndex;
        }
        if (maxRowIndex === null || maxRowIndex < row.rowIndex) {
          maxRowIndex = row.rowIndex;
        }
      });

      let range = new qxl.datagrid.source.Range([minDataRowIndex, minColumnIndex], [maxRowIndex, maxColumnIndex]);
      let start = range.getStart();
      while (start.getRow() < 0) {
        start.increment(1, 0);
      }
      if (!dataSource.isAvailable(range)) {
        let promise = dataSource.makeAvailable(range).then(() => this.updateWidgets());
        return promise;
      }

      let invalidateAll = this.__invalidateAll;
      this.__invalidateAll = false;

      // Widgets of cells leaving the display are handed over to cells entering it, per column
      let reuseWidgets = this.getShouldDiscardWidgets();
      /** @type {Record<Integer, qx.ui.core.Widget[]>} unbound widgets by column index */
      let spareWidgets = {};

      for (let child of qx.lang.Array.clone(this._getChildren())) {
        if (child === this.__editor?.widget) {
          continue;
        }
        let cellData = child.getUserData("qxl.datagrid.cellData");
        let id = cellData.row + ":" + cellData.column;
        if (invalidateAll || cellData.row < minDataRowIndex || cellData.row > maxRowIndex || cellData.column < minColumnIndex || cellData.column > maxColumnIndex) {
          if (reuseWidgets) {
            this.__widgetFactory.unbindWidget(child);
            delete this.__children[id];
            if (!spareWidgets[cellData.column]) {
              spareWidgets[cellData.column] = [];
            }
            spareWidgets[cellData.column].push(child);
          } else {
            this.__fullDiscardWidget(child, id);
          }
        } else {
          this.__children[id] = child;
        }
      }

      // Entering cells take the spare widgets in row order, so that after a jump each widget keeps its slot
      for (let widgets of Object.values(spareWidgets)) {
        widgets.sort((a, b) => b.getUserData("qxl.datagrid.cellData").row - a.getUserData("qxl.datagrid.cellData").row);
      }

      let horizontalSpacing = styling.getHorizontalSpacing();
      let verticalSpacing = styling.getVerticalSpacing();

      // Rows staying on display keep their top and the content is shifted instead (see `__applyFirstTop`);
      // without any such row the shift stays as it is, so that reused widgets keep their position
      let firstTop = invalidateAll ? null : this.__findFirstTop(sizesData.rows, verticalSpacing);
      if (firstTop === null) {
        firstTop = this.__firstTop;
      }
      if (Math.abs(firstTop) > qxl.datagrid.ui.WidgetPane.MAX_FIRST_TOP) {
        firstTop = 0;
      }
      let rowTops = {};
      this.__rowTops = rowTops;
      let top = firstTop;

      let gridStyleColSpanFn = styling.getColSpan();
      let selectionStyle = this.__selectionManager.getSelectionStyle();
      let cellSelection = selectionStyle == "cell" || selectionStyle == "area";
      let focusedPosition = this.__selectionManager.getFocusedPosition();
      let focusedRow = focusedPosition?.getRow() ?? -1;
      let focusedColumn = focusedPosition?.getColumn() ?? -1;
      let cellErrors = this.__cellErrors;
      let cellEditableFn = this.__cellEditableFn;
      let statesFn = this.__statesFn;
      // `column.isEditable()` once per column, not per cell
      let editableColumns = [];

      let currentRelativePosition = new qxl.datagrid.source.Position();
      let currentAbsolutePosition = new qxl.datagrid.source.Position();
      for (let relativeRowIndex = 0; relativeRowIndex < sizesData.rows.length; relativeRowIndex++) {
        let left = 0;
        let rowSizeData = sizesData.rows[relativeRowIndex];
        // Negative rowIndex means its a header row
        if (rowSizeData.rowIndex < 0) {
          continue;
        }
        rowTops[rowSizeData.rowIndex] = top;
        let rowModel;

        let fillFromColumnIndex = null;
        // exclusive endIndex
        let lastColSpanEndIndex = -Infinity;

        for (let relativeColumnIndex = 0; relativeColumnIndex < sizesData.columns.length; relativeColumnIndex++) {
          let columnSizeData = sizesData.columns[relativeColumnIndex];
          let id = rowSizeData.rowIndex + ":" + columnSizeData.columnIndex;
          let filledWidth = columnSizeData.width;

          let child = this.__children[id];

          if (relativeColumnIndex < lastColSpanEndIndex || fillFromColumnIndex !== null) {
            this.__fullDiscardWidget(child, id);
            continue;
          }

          let model;
          if (!child || invalidateAll) {
            model = dataSource.getModelForPosition(new qxl.datagrid.source.Position(rowSizeData.rowIndex, columnSizeData.columnIndex));
            child = this.__takeSpareWidget(spareWidgets, rowSizeData.rowIndex, columnSizeData.columnIndex);
            if (!child) {
              child = this.__widgetFactory.getWidgetFor(rowSizeData.rowIndex, columnSizeData.columnIndex);
              this._add(child);
              qx.ui.core.queue.Layout.add(child);
              if (!child.getContextMenu()) {
                child.setContextMenu(this.getWidgetsContextMenu());
              }
              // a widget stays in its column, so role and column index are written once
              child.getContentElement().setAttribute("role", "gridcell");
              child.getContentElement().setAttribute("aria-colindex", columnSizeData.columnIndex + 1);
            }
            this.__children[id] = child;
            child.setUserData("qxl.datagrid.cellData", {
              row: rowSizeData.rowIndex,
              column: columnSizeData.columnIndex,
              colSpan: 1
            });
            this.__widgetFactory.bindWidget(child, model);
            this.__setCellId(child, rowSizeData.rowIndex, columnSizeData.columnIndex);
          } else {
            model = this.__widgetFactory.getModelForWidget(child);
            this.__widgetFactory.updateState(child, model);
          }

          let callbackArguments = [model, child, currentRelativePosition, currentAbsolutePosition];
          // if no idx found...
          if (fillFromColumnIndex === null) {
            let column = columns.getColumn(columnSizeData.columnIndex);
            let shouldFillFn = column.getShouldFillWidth();
            let columnColSpanFn = column.getColSpan();
            // setting a Position fires events, so only when there is a callback to receive it
            if (shouldFillFn || columnColSpanFn || gridStyleColSpanFn) {
              currentRelativePosition.set({ row: relativeRowIndex, column: relativeColumnIndex });
              currentAbsolutePosition.set({ row: rowSizeData.rowIndex, column: columnSizeData.columnIndex });
            }
            //  check if this col should fill
            let shouldFill = shouldFillFn ? shouldFillFn(...callbackArguments) : false;
            if (shouldFill) {
              // assign and fill width
              fillFromColumnIndex = columnSizeData.columnIndex;
              for (let i = relativeColumnIndex + 1; i < sizesData.columns.length; i++) {
                filledWidth += sizesData.columns[i].width + horizontalSpacing;
              }
            } else {
              let colSpan = 1;
              if (columnColSpanFn) {
                colSpan = columnColSpanFn(() => gridStyleColSpanFn?.(...callbackArguments), ...callbackArguments);
              } else if (gridStyleColSpanFn) {
                colSpan = gridStyleColSpanFn(...callbackArguments);
              }
              colSpan = Math.max(1, Math.floor(colSpan ?? 1));
              let cellData = child.getUserData("qxl.datagrid.cellData");
              if (cellData.colSpan !== colSpan) {
                child.setUserData("qxl.datagrid.cellData", { ...cellData, colSpan });
              }
              lastColSpanEndIndex = relativeColumnIndex + colSpan;
              for (let i = relativeColumnIndex + 1; i < lastColSpanEndIndex; i++) {
                filledWidth += sizesData.columns[i].width + horizontalSpacing;
              }
            }
          }

          let isSelected = false;
          let isFocused = rowSizeData.rowIndex === focusedRow && columnSizeData.columnIndex === focusedColumn;
          if (cellSelection) {
            isSelected = this.__selectionManager.isSelected(model);
          } else {
            if (rowModel === undefined) {
              rowModel = dataSource.getModelForPosition(new qxl.datagrid.source.Position(rowSizeData.rowIndex, 0));
            }
            isSelected = this.__selectionManager.isSelected(rowModel);
          }
          if (isSelected) {
            child.addState("selected");
          } else {
            child.removeState("selected");
          }
          // with row selection, the row carries aria-selected
          child.getContentElement().setAttribute("aria-selected", cellSelection ? String(isSelected) : null);
          if (isFocused) {
            child.addState("focused");
          } else {
            child.removeState("focused");
          }
          // states also without a function, to remove the states of a function set before
          let hasStates = statesFn || child.getUserData("qxl.datagrid.states");
          if (cellEditableFn || hasStates) {
            let columnIndex = columnSizeData.columnIndex;
            let column = columns.getColumn(columnIndex);
            if (cellEditableFn) {
              editableColumns[columnIndex] ??= column.isEditable();
              let editable = cellEditableFn(model, column, editableColumns[columnIndex]);
              child.getContentElement().setAttribute("aria-readonly", editable ? null : "true");
            }
            if (hasStates) {
              qxl.datagrid.ui.WidgetPane.applyStates(child, statesFn && model ? statesFn(model, column) : null, qxl.datagrid.ui.WidgetPane.RESERVED_CELL_STATES);
            }
          }
          if (cellErrors?.size || child.hasState("invalid")) {
            this.__applyCellError(child, model, columnSizeData.columnIndex);
          }

          // every change of layout properties invalidates the layout of the pane, so only for real changes
          let props = child.getLayoutProperties();
          if (props.left !== left || props.top !== top || props.width !== filledWidth || props.height !== rowSizeData.height) {
            child.setLayoutProperties({
              left: left,
              width: filledWidth,
              top: top,
              height: rowSizeData.height
            });
          }
          left += filledWidth + horizontalSpacing;
        }
        top += rowSizeData.height + verticalSpacing;
      }

      for (let widgets of Object.values(spareWidgets)) {
        widgets.forEach(widget => this.__discardSpareWidget(widget));
      }
      this.__applyFirstTop(firstTop);
      this.__positionEditor();
      return null;
    },

    /**
     * Finds the top of the first data row from the previous update: it is calculated back from the
     * first row which was already on display, so that this row and all rows after it keep their top
     *
     * @param {Object[]} rows the rows on display now (`RowData` of `qxl.datagrid.ui.GridSizeCalculator`)
     * @param {Integer} verticalSpacing
     * @return {Integer?} the top of the first data row, null if no row was on display before
     */
    __findFirstTop(rows, verticalSpacing) {
      let rowTops = this.__rowTops;
      if (!rowTops) {
        return null;
      }
      let offset = 0;
      for (let row of rows) {
        if (row.rowIndex < 0) {
          continue;
        }
        let top = rowTops[row.rowIndex];
        if (top !== undefined) {
          return top - offset;
        }
        offset += row.height + verticalSpacing;
      }
      return null;
    },

    /**
     * Shifts the content so that the first data row is at the top of the pane; this is a single
     * style change instead of moving every widget. Because the box of the pane moves with it, the
     * pane must not have a background or decorator of its own.
     *
     * @param {Integer} firstTop top of the first data row, in the coordinates of the pane
     */
    __applyFirstTop(firstTop) {
      if (this.__firstTop !== firstTop) {
        this.__firstTop = firstTop;
        this.getContentElement().setStyle("transform", firstTop ? "translateY(" + -firstTop + "px)" : null);
      }
    },

    /**
     * Takes an unbound widget of the same column for a cell entering the display
     *
     * @param {Record<Integer, qx.ui.core.Widget[]>} spareWidgets unbound widgets by column index
     * @param {Integer} rowIndex
     * @param {Integer} columnIndex
     * @return {qx.ui.core.Widget?} the widget, already a child of this pane, or null
     */
    __takeSpareWidget(spareWidgets, rowIndex, columnIndex) {
      let widgets = spareWidgets[columnIndex];
      while (widgets?.length) {
        let widget = widgets.pop();
        if (this.__widgetFactory.reuseWidget(widget, rowIndex, columnIndex)) {
          return widget;
        }
        this.__discardSpareWidget(widget);
      }
      return null;
    },

    /**
     * Removes and disposes an unbound widget which was not reused
     *
     * @param {qx.ui.core.Widget} widget
     */
    __discardSpareWidget(widget) {
      widget.setUserData("qxl.datagrid.cellData", null);
      this._remove(widget);
      this.__widgetFactory.disposeWidget(widget);
    },

    __fullDiscardWidget(child, id) {
      if (child) {
        this.__widgetFactory.unbindWidget(child);
        child.setUserData("qxl.datagrid.cellData", null);
        if (child.getLayoutParent() === this) {
          this._remove(child);
        }
        if (this.getShouldDiscardWidgets()) {
          this.__widgetFactory.disposeWidget(child);
        }
      }
      if (this.getShouldDiscardWidgets() && id in this.__children) {
        delete this.__children[id];
      }
    },

    getChildAtPosition(row, column) {
      return this.__children[`${row}:${column}`] ?? null;
    },

    getPositionOfChild(child) {
      let cellData = child.getUserData("qxl.datagrid.cellData");
      return cellData ? new qxl.datagrid.source.Position(cellData.row, cellData.column) : null;
    },

    /**
     * Event handler for tap events
     * @param evt
     */
    __onTap(evt) {
      let cell = this.__getCellForEvent(evt);
      let model = cell?.model;
      if (!model) {
        return;
      }
      let position = new qxl.datagrid.source.Position(cell.row, cell.column);
      this.__selectionManager.setFocusedPosition(position);
      this.__selectionManager.selectAt(position, "tap", { shift: evt.isShiftPressed(), ctrl: evt.isCtrlOrCommandPressed() });
      this.fireDataEvent("modelTap", model);
      this.fireDataEvent("cellTap", cell);
    },

    /**
     * Event handler for double taps
     *
     * @param {qx.event.type.Pointer} evt
     */
    __onDoubleTap(evt) {
      let cell = this.__getCellForEvent(evt);
      if (!cell?.model) {
        return;
      }
      this.fireDataEvent("modelDoubleTap", cell.model);
      this.fireDataEvent("cellDoubleTap", cell);
    },

    /**
     * Finds the cell of the widget the pointer event happened on
     *
     * @param {qx.event.type.Pointer} evt
     * @return {Object?} the cell as `{row, column, model}`, null if not on a cell
     */
    __getCellForEvent(evt) {
      let widget = qx.ui.core.Widget.getWidgetByElement(evt.getOriginalTarget());
      while (widget && widget.getLayoutParent() !== this) {
        widget = widget.getLayoutParent();
      }
      let cellData = widget?.getUserData("qxl.datagrid.cellData");
      if (!cellData) {
        return null;
      }
      return { row: cellData.row, column: cellData.column, model: this.__widgetFactory.getModelForWidget(widget) };
    },

    /**
     * Moves the state `focused` from the previous to the new focused cell, without updating all cells
     *
     * @param {qxl.datagrid.source.Position?} value the focused cell
     * @param {qxl.datagrid.source.Position?} oldValue the previously focused cell
     */
    __updateFocusState(value, oldValue) {
      if (oldValue) {
        this.getChildAtPosition(oldValue.getRow(), oldValue.getColumn())?.removeState("focused");
      }
      if (value) {
        this.getChildAtPosition(value.getRow(), value.getColumn())?.addState("focused");
      }
    },

    /**
     * Shows an editor over a cell; the editor is a child of the pane but not a cell, it follows the
     * cell while scrolling and is hidden while the cell is not on display
     *
     * @param {qx.ui.core.Widget} widget the editor
     * @param {Integer} row row in the data source
     * @param {Integer} column column in the data source
     */
    showEditor(widget, row, column) {
      this.__editor = { widget, row, column };
      this._add(widget);
      this.__positionEditor();
    },

    /**
     * Moves the editor to another row, eg after rows have been inserted above it
     *
     * @param {Integer} row row in the data source
     */
    moveEditor(row) {
      if (this.__editor) {
        this.__editor.row = row;
        this.__positionEditor();
      }
    },

    /**
     * Removes the editor from the pane; disposing it is up to the caller
     */
    removeEditor() {
      if (this.__editor) {
        this.__setCoveredCell(null);
        this._remove(this.__editor.widget);
        this.__editor = null;
      }
    },

    /**
     * Hides the cell widget under the editor, because editors may have a transparent background;
     * the widget hidden before is shown again, since cell widgets are reused for other cells
     *
     * @param {qx.ui.core.Widget?} cell the cell widget under the editor, null if there is none
     */
    __setCoveredCell(cell) {
      let editor = this.__editor;
      if (editor.coveredCell === cell) {
        return;
      }
      if (editor.coveredCell && !editor.coveredCell.isDisposed()) {
        editor.coveredCell.setOpacity(null);
      }
      editor.coveredCell = cell;
      cell?.setOpacity(0);
    },

    /**
     * Whether the editor is shown, ie its cell is on display
     *
     * @return {Boolean}
     */
    isEditorOnDisplay() {
      return !!this.__editor && this.__editor.widget.getVisibility() === "visible";
    },

    /**
     * Gives the editor the bounds of its cell, or hides it while the cell is not on display
     */
    __positionEditor() {
      let editor = this.__editor;
      if (!editor) {
        return;
      }
      let cell = this.getChildAtPosition(editor.row, editor.column);
      this.__setCoveredCell(cell);
      if (!cell) {
        editor.widget.exclude();
        return;
      }
      let props = cell.getLayoutProperties();
      let current = editor.widget.getLayoutProperties();
      if (current.left !== props.left || current.top !== props.top || current.width !== props.width || current.height !== props.height) {
        editor.widget.setLayoutProperties({ left: props.left, top: props.top, width: props.width, height: props.height });
      }
      editor.widget.show();
    },

    /**
     * Sets the map of error messages per cell, which the grid owns and changes
     *
     * @param {Map<String, String>} cellErrors messages by `cellErrorKey`
     */
    setCellErrors(cellErrors) {
      this.__cellErrors = cellErrors;
    },

    /**
     * Shows the current error of one cell, if the cell is on display
     *
     * @param {Integer} row row in the data source
     * @param {Integer} column column in the data source
     */
    updateCellError(row, column) {
      let child = this.getChildAtPosition(row, column);
      if (child) {
        this.__applyCellError(child, this.__widgetFactory.getModelForWidget(child), column);
      }
    },

    /**
     * Shows the current errors of all cells on display
     */
    updateCellErrors() {
      for (let child of Object.values(this.__children)) {
        let cellData = child.getUserData("qxl.datagrid.cellData");
        if (cellData) {
          this.__applyCellError(child, this.__widgetFactory.getModelForWidget(child), cellData.column);
        }
      }
    },

    /**
     * Gives a cell widget the state `invalid` and the message as tool tip, or removes both
     *
     * @param {qx.ui.core.Widget} child the cell widget
     * @param {qx.core.Object?} model the model bound to it
     * @param {Integer} column column in the data source
     */
    __applyCellError(child, model, column) {
      let key = model ? qxl.datagrid.ui.WidgetPane.cellErrorKey(model, column) : null;
      let message = key && this.__cellErrors?.get(key);
      let element = child.getContentElement();
      if (message) {
        child.addState("invalid");
        child.setToolTipText(message);
        element.setAttribute("aria-invalid", "true");
        element.setAttribute("aria-describedby", this.__getErrorTextId(key));
      } else if (child.hasState("invalid")) {
        child.removeState("invalid");
        child.resetToolTipText();
        element.setAttribute("aria-invalid", null);
        element.setAttribute("aria-describedby", null);
      }
    },

    /** @type {qx.html.Element?} hidden container of the error messages, which `aria-describedby` refers to */
    __errorTexts: null,

    /** @type {Map<String, qx.html.Element>} element with the message by `cellErrorKey` */
    __errorTextElements: null,

    /**
     * Returns the id of the element with the error message of a cell
     *
     * @param {String} key `cellErrorKey` of the cell
     * @return {String}
     */
    __getErrorTextId(key) {
      return "qxl-datagrid-" + this.toHashCode() + "-error-" + key.replace(":", "-");
    },

    /**
     * Keeps the error message of a cell as text for screen readers (`aria-describedby`), also while
     * the cell is not on display; the container is hidden, which `aria-describedby` still reads
     *
     * @param {String} key `cellErrorKey` of the cell
     * @param {String?} message the error, null to remove it
     */
    setErrorText(key, message) {
      let element = this.__errorTextElements?.get(key);
      if (!message) {
        if (element) {
          this.__errorTexts.remove(element);
          this.__errorTextElements.delete(key);
          element.dispose();
        }
        return;
      }
      if (!this.__errorTexts) {
        this.__errorTexts = new qx.html.Element("div", { display: "none" });
        this.__errorTextElements = new Map();
        this.getContentElement().add(this.__errorTexts);
      }
      if (!element) {
        element = new qx.html.Element("span", null, { id: this.__getErrorTextId(key) });
        this.__errorTextElements.set(key, element);
        this.__errorTexts.add(element);
      }
      element.setText(message);
    },

    /**
     * Returns the DOM id of a cell, for ARIA attributes like `aria-activedescendant` and `aria-owns`;
     * the element only exists while the cell is on display
     *
     * @param {Integer} row row in the data source
     * @param {Integer} column column in the data source
     * @return {String} the id
     */
    getCellId(row, column) {
      return "qxl-datagrid-" + this.toHashCode() + "-" + row + "-" + column;
    },

    /**
     * Sets the id of a cell widget which has been created or reused for a cell, for `aria-owns` of
     * its row and `aria-activedescendant`; role and column index are set when the widget is created,
     * the row index is on the row
     *
     * @param {qx.ui.core.Widget} widget
     * @param {Integer} row row in the data source
     * @param {Integer} column column in the data source
     */
    __setCellId(widget, row, column) {
      widget.getContentElement().setAttribute("id", this.getCellId(row, column));
    }
  },

  statics: {
    /** @type {Integer} beyond this shift of the content in pixels, all rows are positioned from 0 again */
    MAX_FIRST_TOP: 1000000,

    /** @type {String[]} states the grid sets on cell widgets itself, not available to `cellStates` */
    RESERVED_CELL_STATES: ["selected", "focused", "invalid"],

    /** @type {String[]} states the grid sets on row widgets itself, not available to `rowStates` */
    RESERVED_ROW_STATES: ["selected", "focused", "even", "odd"],

    /**
     * Gives a widget the states an application function returned for its model and removes the ones
     * it returned last time but not now; reused widgets thus lose the states of their former row
     *
     * @param {qx.ui.core.Widget} widget a cell or row widget
     * @param {String[]?} states the states to set
     * @param {String[]} reserved states the grid sets itself, which are ignored
     */
    applyStates(widget, states, reserved) {
      let previous = widget.getUserData("qxl.datagrid.states");
      if (!previous && !states?.length) {
        return;
      }
      if (qx.core.Environment.get("qx.debug")) {
        states?.forEach(state => {
          if (reserved.includes(state)) {
            qx.log.Logger.warn(qxl.datagrid.ui.WidgetPane, `State "${state}" is set by the grid itself and ignored`);
          }
        });
      }
      let next = (states ?? []).filter(state => !reserved.includes(state));
      previous?.forEach(state => {
        if (!next.includes(state)) {
          widget.removeState(state);
        }
      });
      next.forEach(state => widget.addState(state));
      widget.setUserData("qxl.datagrid.states", next.length ? next : null);
    },

    /**
     * Returns the key of a cell in the map of error messages; a cell is identified by model and
     * column, since all cells of a row can share one model
     *
     * @param {qx.core.Object} model the model of the cell
     * @param {Integer} column column in the data source
     * @return {String} the key
     */
    cellErrorKey(model, column) {
      return model.toHashCode() + ":" + column;
    }
  }
});
