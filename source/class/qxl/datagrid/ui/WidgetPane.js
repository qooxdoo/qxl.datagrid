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
    selectionManager.addListener("changeFocused", () => {
      if (selectionManager.getSelectionStyle() == "cell") {
        this.updateWidgets();
      }
    });
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
    modelDoubleTap: "qx.event.type.Data"
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
      let focusedModel = this.__selectionManager.getFocused();

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
            }
            this.__children[id] = child;
            child.setUserData("qxl.datagrid.cellData", {
              row: rowSizeData.rowIndex,
              column: columnSizeData.columnIndex,
              colSpan: 1
            });
            this.__widgetFactory.bindWidget(child, model);
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
          let isFocused = false;
          if (cellSelection) {
            isSelected = this.__selectionManager.isSelected(model);
            isFocused = focusedModel === model;
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
          if (isFocused) {
            child.addState("focused");
          } else {
            child.removeState("focused");
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
      let widget = qx.ui.core.Widget.getWidgetByElement(evt.getOriginalTarget());
      let model = null;
      while (widget && widget != this && !model) {
        model = this.__widgetFactory.getModelForWidget(widget);
        if (model) {
          break;
        }
        widget = widget.getLayoutParent();
      }
      if (!model) {
        return;
      }
      let manager = this.__selectionManager;
      let style = manager.getSelectionStyle();
      let mode = manager.getSelectionMode();

      /**@type {Array<any>|qxl.datagrid.source.Range}*/
      let selection;
      if (style === "area") {
        let widgetPosition = this.getDataSource().getPositionOfModel(model);
        if (evt.getNativeEvent().shiftKey) {
          let lastSelection = manager.getSelectionRange();
          if (!(lastSelection instanceof qxl.datagrid.source.Range)) {
            lastSelection = new qxl.datagrid.source.Range(widgetPosition, widgetPosition);
          }
          selection = new qxl.datagrid.source.Range(lastSelection.getStart(), widgetPosition);
        } else {
          selection = new qxl.datagrid.source.Range(widgetPosition, widgetPosition);
        }
      } else {
        selection = qx.lang.Array.clone(manager.getSelection().toArray());
        if (mode == "single") {
          selection = model ? [model] : [];
        } else if (mode == "one") {
          if (model) {
            selection = model ? [model] : [];
          }
        } else if (mode == "multi") {
          if (model) {
            if ((evt.getModifiers() & qx.event.type.Dom.CTRL_MASK) != 0) {
              if (selection.indexOf(model) < 0) {
                selection.push(model);
              } else {
                qx.lang.Array.remove(selection, model);
              }
            } else {
              selection = model ? [model] : [];
            }
          }
        } else if (mode == "additive") {
          if (model) {
            if (selection.indexOf(model) < 0) {
              selection.push(model);
            } else {
              qx.lang.Array.remove(selection, model);
            }
          }
        }
        this.__selectionManager.setFocused(model);
      }
      this.__selectionManager.setSelection(selection);
      this.fireDataEvent("modelTap", model);
    },

    /**
     * Event handler for double taps (starts editing)
     *
     * @param {*} evt
     */
    __onDoubleTap(evt) {
      let widget = qx.ui.core.Widget.getWidgetByElement(evt.getOriginalTarget());
      while (widget && widget.isAnonymous()) {
        widget = widget.getLayoutParent();
      }
      if (!widget) {
        return;
      }
      let model = this.__widgetFactory.getModelForWidget(widget);
      if (!model) {
        return;
      }
      this.fireDataEvent("modelDoubleTap", model);
    }
  },

  statics: {
    /** @type {Integer} beyond this shift of the content in pixels, all rows are positioned from 0 again */
    MAX_FIRST_TOP: 1000000
  }
});
