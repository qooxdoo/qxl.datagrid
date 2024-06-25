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
    this.addListener("tap", this.__onTap, this, true);
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
    }
  },

  events: {
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

    /**
     * Invalidates all widgets, meaning that they will be recalculated next time `updateWidget` is called
     */
    invalidateAll() {
      this.__invalidateAll = true;
    },

    /**
     * Called to update the widgets and synchronise the sizes, creating widgets via the factory
     *
     * @return {Promise?}
     */
    updateWidgets() {
      if (!this.__widgetFactory.getColumns()) {
        return;
      }
      let columns = this.__widgetFactory.getColumns();
      let dataSource = this.getDataSource();
      let styling = this.__sizeCalculator.getStyling();
      let sizesData = this.__sizeCalculator.getSizes();
      if (!sizesData) {
        return;
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

      let children = this.__children;
      qx.lang.Array.clone(this._getChildren()).forEach(child => {
        let cellData = child.getUserData("qxl.datagrid.cellData");
        let id = cellData.row + ":" + cellData.column;
        // prettier-ignore
        if (invalidateAll || cellData.row < minDataRowIndex || cellData.row > maxRowIndex || cellData.column < minColumnIndex || cellData.column > maxColumnIndex) {
          this.__fullDiscardWidget(child, id); 
        } else {
          children[id] = child;
        }
      });

      let horizontalSpacing = styling.getHorizontalSpacing();
      let verticalSpacing = styling.getVerticalSpacing();
      let top = 0;

      const gridStyleColSpanFn = styling.getColSpan();

      let currentRelativePosition = new qxl.datagrid.source.Position();
      let currentAbsolutePosition = new qxl.datagrid.source.Position();
      for (let relativeRowIndex = 0; relativeRowIndex < sizesData.rows.length; relativeRowIndex++) {
        let left = 0;
        let rowSizeData = sizesData.rows[relativeRowIndex];
        // Negative rowIndex means its a header row
        if (rowSizeData.rowIndex < 0) {
          continue;
        }

        let fillFromColumnIndex = null;
        // exclusive endIndex
        let lastColSpanEndIndex = -Infinity;

        for (let relativeColumnIndex = 0; relativeColumnIndex < sizesData.columns.length; relativeColumnIndex++) {
          let columnSizeData = sizesData.columns[relativeColumnIndex];
          let id = rowSizeData.rowIndex + ":" + columnSizeData.columnIndex;
          let filledWidth = columnSizeData.width;

          let child = children[id];

          if (relativeColumnIndex < lastColSpanEndIndex || fillFromColumnIndex !== null) {
            this.__fullDiscardWidget(child, id);
            continue;
          }

          let model = dataSource.getModelForPosition(new qxl.datagrid.source.Position(rowSizeData.rowIndex, columnSizeData.columnIndex));
          if (!child || invalidateAll) {
            child = this.__widgetFactory.getWidgetFor(rowSizeData.rowIndex, columnSizeData.columnIndex);
            children[id] = child;
            child.setUserData("qxl.datagrid.cellData", {
              row: rowSizeData.rowIndex,
              column: columnSizeData.columnIndex,
              colSpan: 1
            });
            this._add(child);
            qx.ui.core.queue.Layout.add(child);
            this.__widgetFactory.bindWidget(child, model);
          }

          const callbackArguments = [model, child, currentRelativePosition, currentAbsolutePosition];
          // if no idx found...
          if (fillFromColumnIndex === null) {
            currentRelativePosition.set({ row: relativeRowIndex, column: relativeColumnIndex });
            currentAbsolutePosition.set({ row: rowSizeData.rowIndex, column: columnSizeData.columnIndex });
            //  check if this col should fill
            const shouldFillFn = columns.getColumn(columnSizeData.columnIndex).getShouldFillWidth();
            let shouldFill = shouldFillFn ? shouldFillFn(...callbackArguments) : false;
            if (shouldFill) {
              // assign and fill width
              fillFromColumnIndex = columnSizeData.columnIndex;
              for (let i = relativeColumnIndex + 1; i < sizesData.columns.length; i++) {
                filledWidth += sizesData.columns[i].width + horizontalSpacing;
              }
            } else {
              const columnColSpanFn = columns.getColumn(columnSizeData.columnIndex).getColSpan();
              let colSpan = 1;
              if (columnColSpanFn) {
                colSpan = columnColSpanFn(() => gridStyleColSpanFn?.(...callbackArguments), ...callbackArguments);
              } else if (gridStyleColSpanFn) {
                colSpan = gridStyleColSpanFn(...callbackArguments);
              }
              colSpan = Math.max(1, Math.floor(colSpan ?? 1));
              child.setUserData("qxl.datagrid.cellData", {
                ...child.getUserData("qxl.datagrid.cellData"),
                colSpan
              });
              lastColSpanEndIndex = relativeColumnIndex + colSpan;
              for (let i = relativeColumnIndex + 1; i < lastColSpanEndIndex; i++) {
                filledWidth += sizesData.columns[i].width + horizontalSpacing;
              }
            }
          }

          let isSelected = false;
          let isFocused = false;
          if (this.__selectionManager.getSelectionStyle() == "cell" || this.__selectionManager.getSelectionStyle() == "area") {
            isSelected = this.__selectionManager.isSelected(model);
            isFocused = this.__selectionManager.getFocused() === model;
          } else {
            let rowModel = this.getDataSource().getModelForPosition(new qxl.datagrid.source.Position(rowSizeData.rowIndex, 0));
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

          child.setLayoutProperties({
            left: left,
            width: filledWidth,
            top: top,
            height: rowSizeData.height
          });
          child.getSizeHint(true);
          left += filledWidth + horizontalSpacing;
        }
        top += rowSizeData.height + verticalSpacing;
      }
      qx.ui.core.queue.Layout.add(this);
    },

    __fullDiscardWidget(child, id) {
      if (child) {
        this.__widgetFactory.unbindWidget(child);
        child.setUserData("qxl.datagrid.cellData", null);
        this._remove(child);
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

    /**
     * Event handler for tap events
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
        const widgetPosition = this.getDataSource().getPositionOfModel(model);
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
  }
});
