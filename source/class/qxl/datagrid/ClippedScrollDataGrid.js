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
     * @returns {qxl.datagrid.clippedScroll.Container}
     */

    colHeaderScroll() {
      let scroll = new qxl.datagrid.clippedScroll.Container(this.getQxObject("header"), () => this.getSizeCalculator()?.getColHeaderBounds());
      scroll.setSizeCalculator(this.getSizeCalculator());
      return scroll;
    },

    /**
     * @this {qxl.datagrid.ClippedScrollDataGrid}
     * @returns {qxl.datagrid.clippedScroll.Container}
     */
    rowHeaderScroll() {
      let scroll = new qxl.datagrid.clippedScroll.Container(this.getQxObject("fixedColumns"), () => this.getSizeCalculator()?.getRowHeaderBounds());
      scroll.setSizeCalculator(this.getSizeCalculator());
      return scroll;
    },

    /**
     * @this {qxl.datagrid.ClippedScrollDataGrid}
     * @returns {qxl.datagrid.clippedScroll.Container}
     */
    paneScroll() {
      let scroll = new qxl.datagrid.clippedScroll.Container(this.getQxObject("paneLayers"), () => this.getSizeCalculator()?.getPaneBounds());
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
    _setAvailableSize() {
      const initialOffsetLeft = this.getQxObject("widgetPane").getPaddingLeft();
      const initialOffsetTop = this.getQxObject("widgetPane").getPaddingTop();
      return this.getSizeCalculator().setAvailableSize(Infinity, Infinity, 0, 0, initialOffsetLeft, initialOffsetTop);
    },

    /**
     * @override
     */
    updateWidgets() {
      if (this._updatingPromise) {
        return;
      }
      this.getQxObject("colHeaderScroll").getLayout().renderLayout();
      this.getQxObject("rowHeaderScroll").getLayout().renderLayout();
      this.getQxObject("paneScroll").getLayout().renderLayout();
      return super.updateWidgets();
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
    },

    /**
     * Called to offset the horizontal position of the pane
     *
     * @param {Integer} dx
     */
    scrollByX(dx) {
      this.getQxObject("paneScroll").scrollByX(dx);
    },

    /**
     * Called to offset the vertical position of the pane
     *
     * @param {Integer} y
     */
    scrollToY(y) {
      this.getQxObject("paneScroll").scrollToY(y);
    },

    /**
     * Called to offset the vertical position of the pane
     *
     * @param {Integer} dy
     */
    scrollByY(dy) {
      this.getQxObject("paneScroll").scrollByY(dy);
    }
  }
});
