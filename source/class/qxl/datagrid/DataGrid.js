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
  include: [qx.ui.core.scroll.MScrollBarFactory, qx.ui.core.scroll.MRoll],

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
      apply: "updateWidgets",
      event: "changeStartRowIndex"
    },

    /** Which is the first column on display */
    startColumnIndex: {
      init: 0,
      check: "Integer",
      apply: "updateWidgets",
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
    }
  },

  events: {
    /** Fired when the `selection` pseudo property changes */
    changeSelection: "qx.event.type.Data",

    /** Fired when the user double clicks on a model item */
    modelDoubleTap: "qx.event.type.Data"
  },

  members: {
    /** @type{qxl.datagrid.ui.GridSizeCalculator} */
    __sizeCalculator: null,

    /** @type{Promise} if the widgets is being updated but pending a promise completion */
    __updatingPromise: null,

    /** @type{qxl.datagrid.util.Debounce} debounced call to updateWidgets */
    __debounceUpdateWidgets: null,

    /** @type{qxl.datagrid.selection.SelectionManager} the selection manager */
    __selectionManager: null,

    /**
     * Apply for `columns`
     */
    _applyColumns(value, oldValue) {
      if (oldValue) {
        oldValue.removeListener("change", this.scheduleLayoutUpdate, this);
      }
      if (value) {
        value.addListener("change", this.scheduleLayoutUpdate, this);
      }
      this.__sizeCalculator.setColumns(value);
      this.getQxObject("headerWidgetFactory").setColumns(value);
      this.getQxObject("paneWidgetFactory").setColumns(value);
      this.updateWidgets();
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
     * Event handler for changes in the data source's size
     */
    __onDataSourceChangeSize() {
      this.getQxObject("widgetPane").invalidateAll();
      this.__sizeCalculator.invalidate();
      this.updateWidgets();
    },

    /**
     * @override
     */
    getWidgetSize(rowIndex, column) {
      let styling = this.__sizeCalculator.getStyling();
      let minHeight = styling.getMinRowHeight();
      let maxHeight = styling.getMaxRowHeight();
      let minWidth = styling.getMinColumnWidth();
      let maxWidth = styling.getMaxColumnWidth();

      return {
        minWidth: minWidth,
        width: null,
        maxWidth: maxWidth,

        minHeight: minHeight,
        height: null,
        maxHeight: maxHeight
      };
    },

    /**
     * @override
     */
    getDataSourceSize() {
      return this.getDataSource().getSize();
    },

    /**
     * Handles changes to the visibility of eiher scrollbar
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
      // TODO
    },

    /**
     * Called to set the position of the vertical scroll bar
     *
     * @param {Integer} pos
     */
    scrollToY(pos) {
      //TODO
    },

    /**
     * Computes the visibility state for scrollbars.
     *
     */
    _computeScrollbars() {
      let sizeData = this.__sizeCalculator.getSizes();
      if (!sizeData) {
        return;
      }

      let size = this.getDataSource().getSize();

      let scrollbarX = this.getChildControl("scrollbar-x");
      let columns = this.getColumns();
      let showX = this.getScrollbarX();
      if (showX === "off" || (showX == "auto" && sizeData.columns.length == columns.getLength())) {
        scrollbarX.setVisibility("excluded");
      } else {
        scrollbarX.setVisibility("visible");
        let percent;
        if (this.getStartColumnIndex() == -1 || sizeData.columns.length == columns.getLength() - this.getStartColumnIndex()) {
          percent = 100;
        } else if (this.getStartColumnIndex() == 0) {
          percent = 0;
        } else {
          percent = Math.floor((this.getStartColumnIndex() / columns.getLength()) * 100);
        }
        scrollbarX.set({
          position: percent
        });
      }

      let scrollbarY = this.getChildControl("scrollbar-y");
      let showY = this.getScrollbarY();
      if (showY == "off" || (showY == "auto" && sizeData.rows.length == size.getColumn())) {
        scrollbarY.setVisibility("excluded");
      } else {
        scrollbarY.setVisibility("visible");
        let percent;
        if (this.getStartRowIndex() == 0) {
          percent = 0;
        } else if (this.getStartRowIndex() == -1 || sizeData.rows.length == size.getRow() - this.getStartRowIndex()) {
          percent = 100;
        } else {
          percent = Math.floor((this.getStartRowIndex() / size.getRow()) * 100);
        }
        scrollbarY.set({
          position: percent
        });
      }
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
            let position = e.getData();
            let size = this.getDataSource().getSize();
            if (position == 100) {
              this.setStartRowIndex(-1);
            } else {
              let start = Math.round(size.getRow() * (position / 100));
              this.setStartRowIndex(start);
            }
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
     * @Override
     */
    _createQxObjectImpl(id) {
      switch (id) {
        case "dataPane":
          var comp = new qx.ui.container.Composite(new qx.ui.layout.VBox());
          comp.add(this.getQxObject("header"));
          var comp2 = new qx.ui.container.Composite(new qxl.datagrid.ui.layout.Layered());
          comp2.add(this.getQxObject("widgetPane"), { layer: 0 });
          comp2.add(this.getQxObject("oddEvenRows"), { layer: 1 });
          comp.add(comp2, { flex: 1 });
          return comp;

        case "headerWidgetFactory":
          return new qxl.datagrid.ui.factory.HeaderWidgetFactory(this.getColumns(), "qxl-datagrid-header-cell");

        case "header":
          return new qxl.datagrid.ui.HeaderRows(this.__sizeCalculator, this.getQxObject("headerWidgetFactory"), this.getDataSource());

        case "oddEvenRows":
          return new qxl.datagrid.ui.OddEvenRowBackgrounds(this.__sizeCalculator, this.getDataSource(), this.__selectionManager);

        case "paneWidgetFactory":
          return new qxl.datagrid.ui.factory.SimpleWidgetFactory(this.getColumns(), "qxl-datagrid-cell");

        case "widgetPane":
          return new qxl.datagrid.ui.WidgetPane(this.__sizeCalculator, this.getQxObject("paneWidgetFactory"), this.getDataSource(), this.__selectionManager);
      }
      return super._createQxObjectImpl(id);
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
     * @Override
     */
    renderLayout(left, top, width, height) {
      let changed = this.__sizeCalculator.setAvailableSize(width, height, this.getStartRowIndex(), this.getStartColumnIndex());
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
     * @return {*[]} List of items.
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
    }
  }
});
