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
 *      * Will Johnson (@WillsterJohnsonAtZenesis)
 *
 * *********************************************************************** */

/**
 * Clipped Scroll DataGrid works best with pre-loaded data sets in array-like data sources.
 *
 * Clipped Scroll has a greatly simplified scrolling mechanism, providing better performance
 * on older and/or less powerful devices.
 */
qx.Class.define("qxl.datagrid.ClippedScrollDataGrid", {
  extend: qxl.datagrid.DataGrid,
  include: [qx.ui.core.scroll.MScrollBarFactory],

  construct(...args) {
    super(...args);

    this.getQxObject("widgetPane").setShouldDiscardWidgets(false);
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

    var size = qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH * 2 + 14;
    this.set({ minHeight: size, minWidth: size });

    // Roll listener for scrolling
    this._addRollHandling();

    this.getSizeCalculator().addListener("change", this._updateSizes, this);
    this.addListener("appear", this._updateSizes, this);
  },

  properties: {
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
      apply: "_updateScrollbarVisibility"
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
      apply: "_updateScrollbarVisibility"
    },

    /**
     * Group property, to set the overflow of both scroll bars.
     */
    scrollbar: {
      group: ["scrollbarX", "scrollbarY"]
    }
  },

  objects: {
    /**
     * @this {qxl.datagrid.ClippedScrollDataGrid}
     * @returns {qx.ui.container.Composite}
     */
    dataPane() {
      let comp = new qx.ui.container.Composite(new qx.ui.layout.Canvas());

      let paneLayers = this.getQxObject("paneLayers");
      comp.add(paneLayers);

      let header = this.getQxObject("header");
      comp.add(header);
      header.setZIndex(100);

      let fixedColumns = this.getQxObject("fixedColumns");
      comp.add(fixedColumns);
      fixedColumns.setZIndex(200);

      return comp;
    },

    /**
     * @this {qxl.datagrid.ClippedScrollDataGrid}
     * @returns {qx.ui.container.Composite}
     */
    paneLayers() {
      let layers = new qx.ui.container.Composite(new qxl.datagrid.ui.layout.Layered());
      layers.add(this.getQxObject("widgetPane"), { layer: 0 });
      layers.add(this.getQxObject("oddEvenRows"), { layer: 1 });
      return layers;
    }
  },

  members: {
    _setAvailableSize(width, height) {
      const initialOffsetLeft = this.getQxObject("widgetPane").getPaddingLeft();
      const initialOffsetTop = this.getQxObject("widgetPane").getPaddingTop();
      let scrollbarWidth = this.getChildControl("scrollbar-y").getVisibility() === "visible" ? this.getChildControl("scrollbar-y").getSizeHint().width : 0;
      let scrollbarHeight = this.getChildControl("scrollbar-x").getVisibility() === "visible" ? this.getChildControl("scrollbar-x").getSizeHint().height : 0;
      return this.getSizeCalculator().setAvailableSize(
        width - initialOffsetLeft - this.getQxObject("widgetPane").getPaddingRight() - scrollbarWidth,
        height - initialOffsetTop - this.getQxObject("widgetPane").getPaddingBottom() - scrollbarHeight,
        0,
        0,
        initialOffsetLeft,
        initialOffsetTop,
        true
      );
    },

    /**
     * @override
     */
    updateWidgets() {
      if (this._updatingPromise) {
        return;
      }
      this._updateScrollbarVisibility();
      return super.updateWidgets();
    },

    onPaneUpdated() {
      this._updateScrollbarVisibility();
      super.onPaneUpdated();
    },

    _createChildControlImpl(id) {
      const controls = {
        /**
         * @this {qxl.datagrid.ClippedScrollDataGrid}
         * @returns {qx.ui.core.scroll.IScrollBar}
         */
        "scrollbar-x"() {
          let scrollbar = this._createScrollBar("horizontal");
          scrollbar.addListener("scroll", this._updateScrollPositions, this);
          return scrollbar;
        },

        /**
         * @this {qxl.datagrid.ClippedScrollDataGrid}
         * @returns {qx.ui.core.scroll.IScrollBar}
         */
        "scrollbar-y"() {
          let scrollbar = this._createScrollBar("vertical");
          scrollbar.addListener("scroll", this._updateScrollPositions, this);
          return scrollbar;
        },

        /**
         * @this {qxl.datagrid.ClippedScrollDataGrid}
         * @returns {qx.ui.core.Widget}
         */
        corner() {
          let corner = new qx.ui.core.Widget();
          corner.setWidth(0);
          corner.setHeight(0);
          corner.exclude();
          return corner;
        }
      };
      return controls[id]?.call(this) ?? super._createChildControlImpl(id);
    },

    /**
     * Called to offset the horizontal position of the pane
     *
     * @param {Integer} x
     */
    scrollToX(x) {
      let scrollX = this.getChildControl("scrollbar-x");
      scrollX.setPosition(qxl.datagrid.util.Math.clamp(0, scrollX.getMaximum(), x));
    },

    /**
     * Called to offset the horizontal position of the pane
     *
     * @param {Integer} dx
     */
    scrollByX(dx) {
      let scrollX = this.getChildControl("scrollbar-x");
      scrollX.setPosition(qxl.datagrid.util.Math.clamp(0, scrollX.getMaximum(), scrollX.getPosition() + dx));
    },

    /**
     * Called to offset the vertical position of the pane
     *
     * @param {Integer} y
     */
    scrollToY(y) {
      let scrollY = this.getChildControl("scrollbar-y");
      scrollY.setPosition(qxl.datagrid.util.Math.clamp(0, scrollY.getMaximum(), y));
    },

    /**
     * Called to offset the vertical position of the pane
     *
     * @param {Integer} dy
     */
    scrollByY(dy) {
      let scrollY = this.getChildControl("scrollbar-y");
      scrollY.setPosition(qxl.datagrid.util.Math.clamp(0, scrollY.getMaximum(), scrollY.getPosition() + dy));
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

      let positionForModel = this.getDataSource().getPositionOfModel(selectedModel);
      let rowIdx = positionForModel.getRow();
      let colIdx = positionForModel.getColumn();

      let styling = this.getStyling();
      if (rowIdx < styling.getNumFixedRows() || colIdx < styling.getNumFixedColumns()) {
        return;
      }

      let selectedWidget = this.getQxObject("widgetPane").getChildAtPosition(rowIdx, colIdx);
      let selectedBounds = selectedWidget.getBounds();

      this.scrollToX(selectedBounds.left - this.getQxObject("fixedColumns").getSizeHint().width);
      this.scrollToY(selectedBounds.top);
    },

    _updateScrollbarVisibility() {
      let scrollX = this.getScrollbarX();
      let scrollbarX = this.getChildControl("scrollbar-x");
      if (scrollX === "off") {
        scrollbarX.exclude();
      } else if (scrollX === "on") {
        scrollbarX.show();
      } /* === "auto" */ else {
        this.scrollByX(0);

        /*
         * NOTE: Scrollbar auto does not work, it can create a race condition where it toggles on and off
         */
        //if (scrollbarX.getMaximum() > 0) {
        scrollbarX.show();
        //} else {
        //  scrollbarX.exclude();
        // }
      }

      let scrollY = this.getScrollbarY();
      let scrollbarY = this.getChildControl("scrollbar-y");
      if (scrollY === "off") {
        scrollbarY.exclude();
      } else if (scrollY === "on") {
        scrollbarY.show();
      } /* === "auto" */ else {
        this.scrollByY(0);
        /*
         * NOTE: Scrollbar auto does not work, it can create a race condition where it toggles on and off
         */
        //if (scrollbarY.getMaximum() > 0) {
        scrollbarY.show();
        //} else {
        //  scrollbarY.exclude();
        //}
      }
    },

    _updateScrollPositions() {
      let scrollX = this.getChildControl("scrollbar-x").getPosition();
      let scrollY = this.getChildControl("scrollbar-y").getPosition();

      let header = this.getQxObject("header");
      let fixedColumns = this.getQxObject("fixedColumns");
      let paneLayers = this.getQxObject("paneLayers");

      header.setLayoutProperties({ top: 0, left: -scrollX });
      fixedColumns.setLayoutProperties({ top: -scrollY, left: 0 });
      paneLayers.setLayoutProperties({
        top: -scrollY + header.getSizeHint().height,
        left: -scrollX + fixedColumns.getSizeHint().width
      });
      this._updateScrollbarVisibility();
    },

    _updateSizes() {
      let sizeCalculator = this.getSizeCalculator();
      let thisSize = this.getBounds();
      if (!thisSize) {
        return;
      }

      let fixedColumns = this.getQxObject("fixedColumns");
      let fixedColumnsSize = this.getSizeCalculator().getRowHeaderBounds();
      fixedColumns.setWidth(fixedColumnsSize.width);
      fixedColumns.setHeight(fixedColumnsSize.height);

      let header = this.getQxObject("header");
      let headerSize = sizeCalculator.getColHeaderBounds();
      header.setWidth(headerSize.width);
      header.setHeight(headerSize.height);

      let paneLayers = this.getQxObject("paneLayers");
      let paneLayersSize = sizeCalculator.getPaneBounds();
      paneLayers.setWidth(paneLayersSize.width);
      paneLayers.setHeight(paneLayersSize.height);

      let scrollbarX = this.getChildControl("scrollbar-x");
      scrollbarX.setMaximum(Math.max(0, paneLayersSize.width + fixedColumnsSize.width - thisSize.width));

      let scrollbarY = this.getChildControl("scrollbar-y");
      scrollbarY.setMaximum(Math.max(0, paneLayersSize.height + headerSize.height - thisSize.height));

      this._updateScrollPositions();
    },

    _cancelRoll: null,

    /**
     * Roll event handler
     *
     * @param e {qx.event.type.Roll} Roll event
     */
    _onRoll(e) {
      this._updateScrollbarVisibility();
      // only wheel and touch
      if (e.getPointerType() == "mouse") {
        return;
      }

      if (this._cancelRoll && e.getMomentum()) {
        e.stopMomentum();
        this._cancelRoll = null;
        return;
      }
      this._cancelRoll = null;

      var showX = this._isChildControlVisible("scrollbar-x");
      var showY = this._isChildControlVisible("scrollbar-y");

      var scrollbarY = showY ? this.getChildControl("scrollbar-y", true) : null;
      var scrollbarX = showX ? this.getChildControl("scrollbar-x", true) : null;

      var deltaY = e.getDelta().y;
      var deltaX = e.getDelta().x;

      var endY = !showY;
      var endX = !showX;

      // y case
      if (scrollbarY) {
        if (deltaY !== 0) {
          scrollbarY.scrollBy(parseInt(deltaY, 10));
        }

        var position = scrollbarY.getPosition();
        var max = scrollbarY.getMaximum();

        // pass the event to the parent if the scrollbar is at an edge
        if ((deltaY < 0 && position <= 0) || (deltaY > 0 && position >= max)) {
          endY = true;
        }
      }

      // x case
      if (scrollbarX) {
        if (deltaX !== 0) {
          scrollbarX.scrollBy(parseInt(deltaX, 10));
        }

        var position = scrollbarX.getPosition();
        var max = scrollbarX.getMaximum();
        // pass the event to the parent if the scrollbar is at an edge
        if ((deltaX < 0 && position <= 0) || (deltaX > 0 && position >= max)) {
          endX = true;
        }
      }

      if (endX && endY) {
        e.stopMomentum();
      }

      // pass the event to the parent if both scrollbars are at the end
      if ((!endY && deltaX === 0) || (!endX && deltaY === 0) || ((!endX || !endY) && deltaX !== 0 && deltaY !== 0)) {
        // Stop bubbling and native event only if a scrollbar is visible
        e.stop();
      }
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
      this._cancelRoll = e.getPointerId();
    }
  }
});
