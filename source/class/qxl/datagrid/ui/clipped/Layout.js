/**
 * Specialised layout for `qxl.datagrid.ui.clipped.Container`
 */
qx.Class.define("qxl.datagrid.ui.clipped.Layout", {
  extend: qx.ui.layout.Abstract,

  members: {
    /**
     * @override
     */
    renderLayout(availWidth, availHeight, padding) {
      let child = this._getLayoutChildren()?.[0];
      if (!child) {
        return;
      }
      let props = child.getLayoutProperties();
      child.renderLayout(props.left ?? 0, props.top ?? 0, availWidth, availHeight);
    },

    /**
     * @override
     */
    _computeSizeHint() {
      let child = this._getLayoutChildren()[0];
      if (!child) {
        return {
          width: 0,
          height: 0
        };
      }
      return {
        width: child.getSizeHint().width,
        height: child.getSizeHint().height
      };
    }
  }
});
