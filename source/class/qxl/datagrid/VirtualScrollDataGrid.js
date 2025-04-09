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
 *      * Will Johnson (@WillsterJohnsonAtZenesis)
 *
 * *********************************************************************** */

/**
 * Virtual Scroll DataGrid works well with on-demand data sets and tree-like data sources.
 *
 * Virtual Scroll has a complex scrolling mechanism to support on-demand data sets,
 * older and/or less powerful devices may experience performance issues.
 */
qx.Class.define("qxl.datagrid.VirtualScrollDataGrid", {
  extend: qxl.datagrid.DataGrid,
  include: [qx.ui.core.scroll.MScrollBarFactory],

  construct(...args) {
    super(...args);

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

  members: {
    /** @type {Boolean} True if _applyStartRowIndex is being called */
    __inApplyStartRowIndex: false,

    /** @type {Boolean} True if _applyStartColumnIndex is being called */
    __inApplyStartColumnIndex: false,

    /** @type {Boolean} True if _applyStartColumnIndex is being called */
    __inComputeScrollbars: false,

    /** @type {String} unique pointer ID, only set if rolling */
    __cancelRoll: null,

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
     * @override
     */
    _onDataSourceChangeSize() {
      super._onDataSourceChangeSize();
      this._constrainScrollPosition();
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

      let rollDelta = e.getDelta();

      let sizeData = this.getSizeCalculator().getSizes();
      let totalColumns = this.getColumns().getLength();
      let totalRows = this.getDataSource().getSize().getRow() + this.getStyling().getNumHeaderRows();

      if (rollDelta.y !== 0 && sizeData.rows.length < totalRows) {
        let oldStartRowIndex = this.getStartRowIndex();
        this.__updateScrollXStartIndex(rollDelta.y);
        let newStartRowIndex = this.getStartRowIndex();
        if (newStartRowIndex !== oldStartRowIndex) {
          e.stop();
        }
      }
      if (rollDelta.x !== 0 && sizeData.columns.length < totalColumns) {
        let oldStartColumnIndex = this.getStartColumnIndex();
        this.__updateScrollYStartIndex(rollDelta.x);
        let newStartColumnIndex = this.getStartColumnIndex();
        if (newStartColumnIndex !== oldStartColumnIndex) {
          e.stop();
        }
      }
    },

    __updateScrollXStartIndex(deltaY) {
      let dataSourceSize = this.getDataSource()?.getSize();

      let rowCount = dataSourceSize?.getRow();
      if (rowCount) {
        let currentStartRowIndex = this.getStartRowIndex();
        let minValue = deltaY > 0 ? currentStartRowIndex : 0;
        let maxValue = deltaY < 0 ? currentStartRowIndex : rowCount - 1;
        let newStartRowIndex = qxl.datagrid.util.Math.clamp(minValue, maxValue, currentStartRowIndex + Math.floor(deltaY * qxl.datagrid.VirtualScrollDataGrid.SCROLLING_SPEED));
        this.setStartRowIndex(newStartRowIndex);
      }
    },

    __updateScrollYStartIndex(deltaX) {
      let dataSourceSize = this.getDataSource()?.getSize();

      let colCount = dataSourceSize?.getColumn();
      if (colCount) {
        let currentStartColIndex = this.getStartColumnIndex();
        let minValue = deltaX > 0 ? currentStartColIndex : 0;
        let maxValue = deltaX < 0 ? currentStartColIndex : colCount - 1;
        let newStartColIndex = qxl.datagrid.util.Math.clamp(minValue, maxValue, currentStartColIndex + Math.floor(deltaX * qxl.datagrid.VirtualScrollDataGrid.SCROLLING_SPEED));
        this.setStartColumnIndex(newStartColIndex);
      }
    },

    /**
     * @returns The number of maximum rows that the data grid can display in view.
     */
    getMaxRows() {
      let styling = this.getSizeCalculator().getStyling();
      let oddEvenBounds = this.getQxObject("oddEvenRows").getBounds();
      if (oddEvenBounds && "height" in oddEvenBounds) {
        return Math.floor(oddEvenBounds.height / (styling.getMaxRowHeight() ?? styling.getMinRowHeight()));
      }
      if (qx.core.Environment.get("qx.debug")) {
        this.warn(`${this.classname}.getMaxRows called too early, assuming maximum of zero rows`);
      }
      return 0;
    },

    _constrainScrollPosition() {
      let maxRows = this.getMaxRows();
      let size = this.getDataSource().getSize();
      let rowCount = size.getRow();
      let maxStartRowIndex = Math.max(0, rowCount - maxRows);
      let startRowIndex = this.getStartRowIndex();
      if (startRowIndex > maxStartRowIndex) {
        this.setStartRowIndex(maxStartRowIndex);
      }
    },

    /**
     * Scrolls the grid such that the selected item is in view.
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
     * @param {Integer} x
     */
    scrollToX(x) {
      this.getChildControl("scrollbar-x").scrollTo(x);
    },

    /**
     * Called to offset the position of the horizontal scroll bar
     *
     * @param {Integer} dx
     */
    scrollByX(dx) {
      this.getChildControl("scrollbar-x").scrollBy(dx);
    },

    /**
     * Called to set the position of the vertical scroll bar
     *
     * @param {Integer} y
     */
    scrollToY(y) {
      this.getChildControl("scrollbar-y").scrollTo(y);
    },

    /**
     * Called to offset the position of the vertical scroll bar
     *
     * @param {Integer} dy
     */
    scrollByY(dy) {
      this.getChildControl("scrollbar-y").scrollBy(dy);
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
      let sizeData = this.getSizeCalculator().getSizes();
      if (!sizeData) {
        this.__inComputeScrollbars = false;
        return;
      }

      const calculateScrollbar = (show, scrollbar, currentCount, totalCount, startIndex, percentCalc) => {
        if (show === "off" || (show === "auto" && currentCount >= totalCount)) {
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
            let startRowIndex = Math.floor(qxl.datagrid.util.Math.interpolate(0, 100, 0, Math.max(0, rowCount - this.getMaxRows()), position));
            this.setStartRowIndex(startRowIndex);
            this._constrainScrollPosition();
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
     * @override
     */
    updateWidgets() {
      if (this._updatingPromise) {
        return;
      }
      if (!this.__inApplyStartRowIndex && !this.__inApplyStartColumnIndex) {
        this.__updateScrollXStartIndex(0);
        this.__updateScrollYStartIndex(0);
      }
      return super.updateWidgets();
    },

    onPaneUpdated() {
      this._computeScrollbars();
      super.onPaneUpdated();
    },

    _setAvailableSize(width, height) {
      let initialOffsetLeft = this.getQxObject("widgetPane").getPaddingLeft();
      let initialOffsetTop = this.getQxObject("widgetPane").getPaddingTop();
      let scrollbarWidth = this.getChildControl("scrollbar-y").getVisibility() === "visible" ? this.getChildControl("scrollbar-y").getSizeHint().width : 0;
      let scrollbarHeight = this.getChildControl("scrollbar-x").getVisibility() === "visible" ? this.getChildControl("scrollbar-x").getSizeHint().height : 0;
      return this.getSizeCalculator().setAvailableSize(
        width - initialOffsetLeft - this.getQxObject("widgetPane").getPaddingRight() - scrollbarWidth,
        height - initialOffsetTop - this.getQxObject("widgetPane").getPaddingBottom() - scrollbarHeight,
        this.getStartRowIndex(),
        this.getStartColumnIndex(),
        initialOffsetLeft,
        initialOffsetTop
      );
    }
  },

  statics: {
    SCROLLING_SPEED: 0.06
  }
});
