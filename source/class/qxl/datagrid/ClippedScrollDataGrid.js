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
      let comp = new qx.ui.container.Composite(new qx.ui.layout.VBox());
      let colHeaderScroll = this.getQxObject("colHeaderScroll");
      comp.add(colHeaderScroll, { flex: 0 });
      let paneScroll = this.getQxObject("paneScroll");
      comp.add(paneScroll, { flex: 1 });
      paneScroll.addListener("scrollX", evt => colHeaderScroll.scrollToX(evt.getData()));
      return comp;
    },

    /**
     * @this {qxl.datagrid.ClippedScrollDataGrid}
     * @returns {qxl.datagrid.ui.clipped.Container}
     */

    colHeaderScroll() {
      let scroll = new qxl.datagrid.ui.clipped.Container(this.getQxObject("header"));
      scroll.setSizeCalculator(this.getSizeCalculator());
      return scroll;
    },

    /**
     * @this {qxl.datagrid.ClippedScrollDataGrid}
     * @returns {qxl.datagrid.ui.clipped.Container}
     */
    rowHeaderScroll() {
      let scroll = new qxl.datagrid.ui.clipped.Container(this.getQxObject("fixedColumns"));
      scroll.setSizeCalculator(this.getSizeCalculator());
      return scroll;
    },

    /**
     * @this {qxl.datagrid.ClippedScrollDataGrid}
     * @returns {qxl.datagrid.ui.clipped.Container}
     */
    paneScroll() {
      let scroll = new qxl.datagrid.ui.clipped.Container(this.getQxObject("paneLayers"));
      scroll.setSizeCalculator(this.getSizeCalculator());
      return scroll;
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
    /**
     * @Override
     */
    _setAvailableSize(width, height) {
      let initialOffsetLeft = this.getQxObject("widgetPane").getPaddingLeft();
      let initialOffsetTop = this.getQxObject("widgetPane").getPaddingTop();
      let scrollbarWidth = this.getChildControl("scrollbar-y").getVisibility() === "visible" ? this.getChildControl("scrollbar-y").getSizeHint().width : 0;
      let scrollbarHeight = this.getChildControl("scrollbar-x").getVisibility() === "visible" ? this.getChildControl("scrollbar-x").getSizeHint().height : 0;
      let sc = this.getSizeCalculator();
      l;
      let redrawNeeded = sc.setAvailableSize(width - scrollbarWidth, height - scrollbarHeight, 0, 0, initialOffsetLeft, initialOffsetTop, true);

      return redrawNeeded;
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
          let paneScroll = this.getQxObject("paneScroll");
          paneScroll.bind("maxX", scrollbar, "maximum", { converter: value => value ?? 0 });
          scrollbar.addListener("scroll", evt => paneScroll.scrollToX(evt.getData()));
          return scrollbar;
        },

        /**
         * @this {qxl.datagrid.ClippedScrollDataGrid}
         * @returns {qx.ui.core.scroll.IScrollBar}
         */
        "scrollbar-y"() {
          let scrollbar = this._createScrollBar("vertical");
          let paneScroll = this.getQxObject("paneScroll");
          paneScroll.bind("maxY", scrollbar, "maximum", { converter: value => value ?? 0 });
          scrollbar.addListener("scroll", evt => paneScroll.scrollToY(evt.getData()));
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
      this.getQxObject("paneScroll").scrollToX(x);
      this.getQxObject("rowHeaderScroll").scrollToX(x);
    },

    /**
     * Called to offset the horizontal position of the pane
     *
     * @param {Integer} dx
     */
    scrollByX(dx) {
      this.getQxObject("paneScroll").scrollByX(dx);
      this.getQxObject("rowHeaderScroll").scrollByX(dx);
    },

    /**
     * Called to offset the vertical position of the pane
     *
     * @param {Integer} y
     */
    scrollToY(y) {
      this.getQxObject("paneScroll").scrollToY(y);
      this.getQxObject("colHeaderScroll").scrollToY(y);
    },

    /**
     * Called to offset the vertical position of the pane
     *
     * @param {Integer} dy
     */
    scrollByY(dy) {
      this.getQxObject("paneScroll").scrollByY(dy);
      this.getQxObject("colHeaderScroll").scrollByY(dy);
    },

    _updateScrollbarVisibility() {
      let paneScroll = this.getQxObject("paneScroll");

      let scrollX = this.getScrollbarX();
      let scrollbarX = this.getChildControl("scrollbar-x");
      if (scrollX === "off") {
        scrollbarX.exclude();
      } else if (scrollX === "on") {
        scrollbarX.show();
      } /* === "auto" */ else {
        paneScroll.scrollByX(0);
        if (paneScroll.getMaxX() > 0) {
          scrollbarX.show();
        } else {
          scrollbarX.exclude();
        }
      }

      let scrollY = this.getScrollbarY();
      let scrollbarY = this.getChildControl("scrollbar-y");
      if (scrollY === "off") {
        scrollbarY.exclude();
      } else if (scrollY === "on") {
        scrollbarY.show();
      } /* === "auto" */ else {
        paneScroll.scrollByY(0);
        if (paneScroll.getMaxY() > 0) {
          scrollbarY.show();
        } else {
          scrollbarY.exclude();
        }
      }
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
