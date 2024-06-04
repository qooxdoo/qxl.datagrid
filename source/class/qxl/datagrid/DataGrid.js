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
    },

    fixedColumns() {
      this.warn("Fixed Columns are not yet implemented!");
      return new qx.ui.core.Widget();
    }
  },

  events: {
    /** Fired when the `selection` pseudo property changes */
    changeSelection: "qx.event.type.Data",

    /** Fired when the user double clicks on a model item */
    modelDoubleTap: "qx.event.type.Data"
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
     * Event handler for changes in the data source's size
     */
    __onDataSourceChangeSize() {
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

    onPaneUpdated() {
      this.scheduleLayoutUpdate();
      this._updatingPromise = null;
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

    _setAvailableSize(width, height) {
      const initialOffsetLeft = this.getQxObject("widgetPane").getPaddingLeft();
      const initialOffsetTop = this.getQxObject("widgetPane").getPaddingTop();
      return this.__sizeCalculator.setAvailableSize(width, height, 0, 0, initialOffsetLeft, initialOffsetTop);
    },

    /**
     * @Override
     */
    renderLayout(left, top, width, height) {
      let changed = this._setAvailableSize(width, height);
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
