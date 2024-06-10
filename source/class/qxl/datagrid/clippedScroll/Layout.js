qx.Class.define("qxl.datagrid.clippedScroll.Layout", {
  extend: qx.ui.layout.Abstract,

  construct(cbGetBounds) {
    super();

    this.__cbGetBounds = cbGetBounds;
  },

  members: {
    renderLayout() {
      let child = this._getLayoutChildren()?.[0];
      if (!child) {
        return;
      }
      let props = child.getLayoutProperties();
      let size = this.__cbGetBounds();
      child.renderLayout(props.left ?? 0, props.top ?? 0, size?.width ?? 0, size?.height ?? 0);
    },

    _computeSizeHint() {
      let child = this._getLayoutChildren()[0];
      return {
        width: child.getSizeHint().width,
        height: child.getSizeHint().height
      };
    }
  }
});
