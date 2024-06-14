qx.Class.define("qxl.datagrid.ui.clipped.Container", {
  extend: qx.ui.container.Composite,

  construct(content) {
    super(new qx.ui.layout.Canvas());
    this.add(content, { left: 0, top: 0, right: 0, bottom: 0 });
    this._content = content;
  },

  properties: {
    sizeCalculator: {
      check: "qxl.datagrid.ui.GridSizeCalculator",
      nullable: true,
      init: null
    }
  },

  members: {
    /**
     * @type {qx.ui.core.LayoutItem}
     */
    _content: null,

    /**
     * "scrolls" the pane to the given x position
     * @param {Integer} x
     */
    scrollToX(x) {
      let widthLimit = this.getSizeCalculator().getPaneBounds().width;
      let scrollPaneWidth = this.getBounds()?.width ?? 0;
      let maxX = Math.max(0, widthLimit - scrollPaneWidth);
      this.setMaxX(maxX);
      this._content.setLayoutProperties({ left: -Math.min(x, maxX) });
      this.fireDataEvent("scrollX", x);
    },

    /**
     * "scrolls" the pane by the given amount in the x direction
     * @param {Integer} dx
     */
    scrollByX(dx) {
      let left = this._content.getLayoutProperties().left ?? 0;
      this.scrollToX(-left + dx);
    },

    /**
     * "scrolls" the pane to the given y position
     * @param {Integer} y
     */
    scrollToY(y) {
      let heightLimit = this.getSizeCalculator().getPaneBounds().height;
      let scrollPaneHeight = this.getBounds()?.height ?? 0;
      let maxY = Math.max(0, heightLimit - scrollPaneHeight);
      this.setMaxY(maxY);
      this._content.setLayoutProperties({ top: -Math.min(y, maxY) });
      this.fireDataEvent("scrollY", y);
    },

    /**
     * "scrolls" the pane by the given amount in the y direction
     * @param {Integer} dy
     */
    scrollByY(dy) {
      let top = this._content.getLayoutProperties().top ?? 0;
      this.scrollToY(-top + dy);
    }
  }
});
