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
  include: [qx.ui.core.scroll.MScrollBarFactory],

  /**
   * Constructor
   *
   * @param {qxl.datagrid.column.IColumns?} columns
   * @param {qxl.datagrid.ui.GridStyling?} styling
   */
  construct(columns, styling) {
    super();
    this.__debounceUpdateWidgets = new qxl.datagrid.util.Debounce(() => this.updateWidgets(), 50);
    this.__selectionManager = new qxl.datagrid.ui.SelectionManager();
    this.__selectionManager.addListener("changeSelection", evt => {
      this.scheduleUpdateWidgets();
      this.fireDataEvent("changeSelection", evt.getData(), evt.getOldData());
    });

    columns = columns || null;
    styling = styling || new qxl.datagrid.ui.GridStyling();
    this.__sizeCalculator = new qxl.datagrid.ui.GridSizeCalculator(columns, styling, this);
    if (columns) {
      this.setColumns(columns);
    }

    this.getQxObject("widgetPane").addListener("modelDoubleTap", evt => this.fireDataEvent("modelDoubleTap", evt.getData()));

    if (qx.core.Environment.get("os.scrollBarOverlayed")) {
      // use a plain canvas to overlay the scroll bars
      this._setLayout(new qx.ui.layout.Canvas());
      this._add(this.getQxObject("dataPane"), { edge: 0 });

      let scroll = this.getChildControl("scrollbar-x");
      scroll.setMinHeight(qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH);
      this._add(scroll, { bottom: 0, right: 0, left: 0 });

      scroll = this.getChildControl("scrollbar-y");
      scroll.setMinWidth(qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH);
      this._add(scroll, { right: 0, bottom: 0, top: 0 });
    } else {
      // Create 'fixed' grid layout
      var grid = new qx.ui.layout.Grid();
      grid.setColumnFlex(0, 1);
      grid.setRowFlex(0, 1);
      this._setLayout(grid);

      this._add(this.getQxObject("dataPane"), { row: 0, column: 0 });
      this._add(this.getChildControl("scrollbar-x"), { row: 1, column: 0 });
      this._add(this.getChildControl("scrollbar-y"), { row: 0, column: 1 });
      this._add(this.getChildControl("corner"), { row: 1, column: 1 });
    }

    // since the scroll container disregards the min size of the scrollbars
    // we have to set the min size of the scroll area to ensure that the
    // scrollbars always have an usable size.
    var size = qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH * 2 + 14;
    this.set({ minHeight: size, minWidth: size });

    // Roll listener for scrolling
    this._addRollHandling();
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

    /** Which is the first row on display */
    startRowIndex: {
      init: 0,
      check: "Integer",
      apply: "_applyStartRowIndex",
      event: "changeStartRowIndex"
    },

    /** Which is the first column on display */
    startColumnIndex: {
      init: 0,
      check: "Integer",
      apply: "_applyStartColumnIndex",
      event: "changeStartColumnIndex"
    },

    /** @override */
    appearance: {
      init: "qxl-datagrid",
      refine: true
    },

    /**
     * The policy, when the horizontal scrollbar should be shown.
     * <ul>
     *   <li><b>auto</b>: Show scrollbar on demand</li>
     *   <li><b>on</b>: Always show the scrollbar</li>
     *   <li><b>off</b>: Never show the scrollbar</li>
     * </ul>
     */
    scrollbarX: {
      check: ["auto", "on", "off"],
      init: "auto",
      themeable: true,
      apply: "_computeScrollbars"
    },

    /**
     * The policy, when the horizontal scrollbar should be shown.
     * <ul>
     *   <li><b>auto</b>: Show scrollbar on demand</li>
     *   <li><b>on</b>: Always show the scrollbar</li>
     *   <li><b>off</b>: Never show the scrollbar</li>
     * </ul>
     */
    scrollbarY: {
      check: ["auto", "on", "off"],
      init: "auto",
      themeable: true,
      apply: "_computeScrollbars"
    },

    /**
     * Group property, to set the overflow of both scroll bars.
     */
    scrollbar: {
      group: ["scrollbarX", "scrollbarY"]
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
      return new qxl.datagrid.ui.WidgetPane(this.__sizeCalculator, this.getQxObject("paneWidgetFactory"), this.getDataSource(), this.__selectionManager);
    },

    headerWidgetFactory() {
      return new qxl.datagrid.ui.factory.HeaderWidgetFactory(this.getColumns());
    },

    header() {
      return new qxl.datagrid.ui.HeaderRows(this.__sizeCalculator, this.getQxObject("headerWidgetFactory"));
    }
  },

  events: {
    /** Fired when the `selection` pseudo property changes */
    changeSelection: "qx.event.type.Data",

    /** Fired when the user double clicks on a model item */
    modelDoubleTap: "qx.event.type.Data"
  },

  members: {
    /** @type {Boolean} True if _applyStartRowIndex is being called */
    __inApplyStartRowIndex: false,

    /** @type {Boolean} True if _applyStartColumnIndex is being called */
    __inApplyStartColumnIndex: false,

    /** @type {Boolean} True if _applyStartColumnIndex is being called */
    __inComputeScrollbars: false,

    /** @type {qxl.datagrid.ui.GridSizeCalculator} */
    __sizeCalculator: null,

    /** @type {Promise} if the widgets is being updated but pending a promise completion */
    __updatingPromise: null,

    /** @type {qxl.datagrid.util.Debounce} debounced call to updateWidgets */
    __debounceUpdateWidgets: null,

    /** @type {qxl.datagrid.ui.SelectionManager} the selection manager */
    __selectionManager: null,

    /** @type {String} unique pointer ID, only set if rolling */
    __cancelRoll: null,

    /**
     * Apply for `columns`
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
     */
    _applyDataSource(value, oldValue) {
      if (oldValue) {
        oldValue.removeListener("changeSize", this.__onDataSourceChangeSize, this);
      }
      this.__selectionManager.resetSelection();
      ["headerWidgetFactory", "paneWidgetFactory", "widgetPane", "oddEvenRows"].forEach(id => this.getQxObject(id).setDataSource(value));
      this.__selectionManager.setDataSource(value);
      this.updateWidgets();
      if (value) {
        value.addListener("changeSize", this.__onDataSourceChangeSize, this);
      }
    },

    /**
     * Apply for `startRowIndex`
     */
    _applyStartRowIndex(value, oldValue) {
      this.__inApplyStartRowIndex = true;
      this.updateWidgets();
      this.__inApplyStartRowIndex = false;
    },

    /**
     * Apply for `startColumnIndex`
     */
    _applyStartColumnIndex(value, oldValue) {
      this.__inApplyStartColumnIndex = true;
      this.updateWidgets();
      this.__inApplyStartColumnIndex = false;
    },

    /**
     * Event handler for changes in the data source's size
     */
    __onDataSourceChangeSize() {
      this.getQxObject("widgetPane").invalidateAll();
      this.__sizeCalculator.invalidate();
      this.updateWidgets();
    },

    /**
     * Responsible for adding the event listener needed for scroll handling.
     */
    _addRollHandling() {
      this.addListener("roll", this._onRoll, this);
      this.addListener("pointerdown", this._onPointerDownForRoll, this);
    },

    /**
     * Responsible for removing the event listener needed for scroll handling.
     */
    _removeRollHandling() {
      this.removeListener("roll", this._onRoll, this);
      this.removeListener("pointerdown", this._onPointerDownForRoll, this);
    },

    /**
     * Handler for the pointerdown event which simply stops the momentum scrolling.
     *
     * @param e {qx.event.type.Pointer} pointerdown event
     */
    _onPointerDownForRoll(e) {
      this.__cancelRoll = e.getPointerId();
    },

    /**
     * Event handler for rolling
     *
     * @param {qx.event.type.Roll} e
     * @returns
     */
    _onRoll(e) {
      const SCROLLING_SPEED = 0.06;
      // only wheel and touch
      if (e.getPointerType() == "mouse") {
        e.stop();
        return;
      }

      if (this.__cancelRoll && e.getMomentum()) {
        e.stopMomentum();
        this.__cancelRoll = null;
        e.stop();
        return;
      }

      let rowCount = this.getDataSourceSize().getRow();
      let currentStartRowIndex = this.getStartRowIndex();
      const minValue = e.getDelta().y > 0 ? currentStartRowIndex : 0;
      const maxValue = e.getDelta().y < 0 ? currentStartRowIndex : rowCount - 1;
      let newStartRowIndex = qxl.datagrid.util.Math.clamp(minValue, maxValue, currentStartRowIndex + Math.floor(e.getDelta().y * SCROLLING_SPEED));

      const isAtScrollLimit = newStartRowIndex == this.getStartRowIndex();
      if (!isAtScrollLimit) {
        e.stop();
      }
      this.setStartRowIndex(newStartRowIndex);
    },

    /**
     * @returns The number of maximum rows that the data grid can display in view.
     */
    getMaxRows() {
      const styling = this.__sizeCalculator.getStyling();
      const oddEvenBounds = this.getQxObject("oddEvenRows").getBounds();
      if (oddEvenBounds && "height" in oddEvenBounds) {
        return Math.floor(oddEvenBounds.height / (styling.getMaxRowHeight() ?? styling.getMinRowHeight())) - 4;
      }
      if (qx.core.Environment.get("qx.debug")) {
        this.warn(`${this.classname}.getMaxRows called too early, assuming maximum of zero rows`);
      }
      return 0;
    },

    /**
     * Scrolls the tree such that the selected item is in view.
     * If selection is already in view, nothing happens.
     * Otherwise, the selection is scrolled to the center of the view.
     * If it's not possible to center the item (i.e. we would have to scroll past the top), it is shown as close to the center as possible.
     */
    scrollToSelection() {
      let selectedModel = this.getSelection().getLength() ? this.getSelection().getItem(0) : null;
      if (!selectedModel) {
        return;
      }

      let selectionIndex = this.getDataSource().getPositionOfModel(selectedModel).getRow();
      let maxRowCount = this.getMaxRows();
      let startRowIndex = this.getStartRowIndex();
      let endRowIndex = startRowIndex + maxRowCount - 1;
      if (selectionIndex >= startRowIndex && selectionIndex <= endRowIndex) {
        return;
      }
      this.setStartRowIndex(Math.max(0, selectionIndex - Math.floor(maxRowCount / 2)));
    },

    /**
     * Handles changes to the visibility of either scrollbar
     *
     * @param {String} side either "x" or "y"
     */
    __onScrollbarVisibility(side) {
      let showX = this._isChildControlVisible("scrollbar-x");
      let showY = this._isChildControlVisible("scrollbar-y");

      if (side == "x") {
        if (!showX) {
          this.scrollToX(0);
        }
      } else {
        if (!showY) {
          this.scrollToY(0);
        }
      }

      showX && showY ? this._showChildControl("corner") : this._excludeChildControl("corner");
    },

    /**
     * Called to set the position of the horizontal scroll bar
     *
     * @param {Integer} pos
     */
    scrollToX(pos) {
      this.getChildControl("scrollbar-x").scrollTo(pos);
    },

    /**
     * Called to set the position of the vertical scroll bar
     *
     * @param {Integer} pos
     */
    scrollToY(pos) {
      this.getChildControl("scrollbar-y").scrollTo(pos);
    },

    /**
     * Computes the visibility state for scrollbars.
     *
     */
    _computeScrollbars() {
      if (this.__inComputeScrollbars) {
        return;
      }
      this.__inComputeScrollbars = true;
      let sizeData = this.__sizeCalculator.getSizes();
      if (!sizeData) {
        this.__inComputeScrollbars = false;
        return;
      }

      const calculateScrollbar = (show, scrollbar, currentCount, totalCount, startIndex, percentCalc) => {
        if (show === "off" || (show == "auto" && currentCount >= totalCount)) {
          scrollbar.setVisibility("excluded");
        } else {
          scrollbar.setVisibility("visible");
          let percent;
          if (startIndex == -1 || currentCount > totalCount - startIndex) {
            percent = 100;
          } else if (startIndex == 0) {
            percent = 0;
          } else {
            percent = qxl.datagrid.util.Math.clamp(0, 100, percentCalc());
          }
          scrollbar.set({ position: percent });
        }
      };

      let size = this.getDataSource().getSize();
      let columns = this.getColumns();

      let scrollbarX = this.getChildControl("scrollbar-x");
      let showX = this.getScrollbarX();
      let totalColumns = columns.getLength();
      let startColumnIndex = this.getStartColumnIndex();
      calculateScrollbar(showX, scrollbarX, sizeData.columns.length, totalColumns, startColumnIndex, () => Math.floor((startColumnIndex / (totalColumns + 1)) * 100));

      let scrollbarY = this.getChildControl("scrollbar-y");
      let showY = this.getScrollbarY();
      let totalRows = size.getRow() + this.getStyling().getNumHeaderRows();
      let startRowIndex = this.getStartRowIndex();
      calculateScrollbar(showY, scrollbarY, sizeData.rows.length, totalRows, startRowIndex, () => {
        let maxIndex = size.getRow() - 1; // SUB(1): getRow() is 1-based, maxIndex is 0-based
        let currentIndex = this.getStartRowIndex();
        let interpolation = qxl.datagrid.util.Math.interpolate(0, maxIndex, 0, 100, currentIndex);
        return Math.floor(interpolation);
      });

      this.__inComputeScrollbars = false;
    },

    /**
     * @override
     */
    _createChildControlImpl(id) {
      switch (id) {
        case "scrollbar-x":
          var control = this._createScrollBar("horizontal").set({
            minWidth: 0,
            maximum: 100
          });

          control.exclude();
          control.addListener("scroll", e => {
            if (this.__inApplyStartRowIndex || this.__inComputeScrollbars) {
              return;
            }
            let position = e.getData();
            let size = this.getDataSource().getSize();
            if (position == 100) {
              this.setStartColumnIndex(-1);
            } else {
              let start = Math.round(size.getColumn() * (position / 100));
              this.setStartColumnIndex(start);
            }
          });
          control.addListener("changeVisibility", () => this.__onScrollbarVisibility("x"));
          return control;

        case "scrollbar-y":
          var control = this._createScrollBar("vertical").set({
            minHeight: 0,
            maximum: 100
          });

          control.exclude();
          control.addListener("scroll", e => {
            if (this.__inApplyStartRowIndex || this.__inComputeScrollbars) {
              return;
            }
            let position = e.getData();
            let rowCount = this.getDataSource().getSize().getRow();
            const startRowIndex = Math.floor(qxl.datagrid.util.Math.interpolate(0, 100, 0, Math.max(0, rowCount - this.getMaxRows()), position));
            this.setStartRowIndex(startRowIndex);
          });
          control.addListener("changeVisibility", () => this.__onScrollbarVisibility("y"));
          return control;

        case "corner":
          var control = new qx.ui.core.Widget();
          control.setWidth(0);
          control.setHeight(0);
          control.exclude();
          return control;
      }

      return super._createChildControlImpl(id);
    },

    /**
     * Updates the display after changes to data or columns etc
     */
    updateWidgets() {
      if (this.__updatingPromise) {
        return;
      }
      this.getQxObject("header").updateWidgets();
      this.getQxObject("oddEvenRows").updateWidgets();
      const onPaneUpdated = () => {
        this._computeScrollbars();
        this.scheduleLayoutUpdate();
        this.__updatingPromise = null;
      };
      let promise = this.getQxObject("widgetPane").updateWidgets();
      if (promise) {
        this.__updatingPromise = promise.then(onPaneUpdated);
      } else {
        onPaneUpdated();
      }
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

      let width = null;
      let height = null;

      let widget = this.getQxObject("widgetPane").getChildAtPosition(rowIndex, columnIndex);
      if (rowIndex < 0) {
        height = styling.getHeaderRowHeight();
      } else {
        let dynamicSizing = this.getDynamicSizing();
        if (dynamicSizing === "rows" || dynamicSizing === "both") {
          height = widget?.getSizeHint()?.height;
        }
        if (dynamicSizing === "columns" || dynamicSizing === "both") {
          width = widget?.getSizeHint()?.width;
        }
      }

      const size = { minWidth, width, maxWidth, minHeight, height, maxHeight };
      widget?.setUserData("qxl.datagrid.lastSize", size);
      return size;
    },

    /**
     * @Override
     */
    renderLayout(left, top, width, height) {
      const initialOffsetLeft = this.getQxObject("widgetPane").getPaddingLeft();
      const initialOffsetTop = this.getQxObject("widgetPane").getPaddingTop();
      let changed = this.__sizeCalculator.setAvailableSize(
        width - this.getChildControl("scrollbar-y").getSizeHint().width - initialOffsetLeft - this.getQxObject("widgetPane").getPaddingRight(),
        height,
        this.getStartRowIndex(),
        this.getStartColumnIndex(),
        initialOffsetLeft,
        initialOffsetTop
      );
      const dynamicSizing = this.getDynamicSizing();
      const dsRows = dynamicSizing === "rows" || dynamicSizing === "both";
      const dsCols = dynamicSizing === "columns" || dynamicSizing === "both";
      if (!changed && (dsRows || dsCols)) {
        for (const widget of this.getQxObject("widgetPane").getLayoutChildren()) {
          const target = widget.getSizeHint();
          const current = widget.getUserData("qxl.datagrid.lastSize");
          if (!target) {
            continue;
          }
          if (dsRows) {
            const tooBig = (current?.height ?? Infinity) > (target.maxHeight ?? Infinity);
            const tooSmall = (current?.height ?? -Infinity) < (target.minHeight ?? 0);
            if (tooBig || tooSmall) {
              changed = true;
              this.__sizeCalculator.invalidate();
              break;
            }
          }
          if (dsCols) {
            const tooBig = (current?.width ?? Infinity) > (target.maxWidth ?? Infinity);
            const tooSmall = (current?.width ?? -Infinity) < (target.minWidth ?? 0);
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
  }
});
