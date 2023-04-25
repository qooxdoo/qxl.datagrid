/**
 * Custom layout for the `qxl.datagrid.column.tree.ExpansionWidget`
 */
qx.Class.define("qxl.datagrid.column.tree.ExpansionLayout", {
  extend: qx.ui.layout.Abstract,

  properties: {
    /** How far apart to space the expand and label */
    spacing: {
      init: 3,
      check: "Integer"
    }
  },

  members: {
    /**
     * @Override
     */
    renderLayout(availWidth, availHeight, padding) {
      let widget = this._getWidget();
      let expander = widget.getChildControl("expander");
      let label = widget.getChildControl("label");
      label.getSizeHint();

      let left = widget.getIndentationLevel() * widget.getSpacePerIndentation();
      let spacing = this.getSpacing();
      let expanderWidth = widget.getExpanderWidth();
      if (expanderWidth === null) {
        if (expander.isVisible()) {
          let hint = expander.getSizeHint();
          let width = hint.width;
          if (width < hint.minWidth) {
            width = hint.minWidth;
          } else if (width > hint.maxWidth) {
            width = hint.maxWidth;
          }
          expanderWidth = width;
        } else {
          expanderWidth = 0;
        }
      }

      if (expander.isVisible()) {
        expander.renderLayout(left, 0, expanderWidth, availHeight);
        left += expanderWidth + spacing;
      }

      label.renderLayout(left, 0, availWidth - left, availHeight);
    },

    _computeSizeHint() {
      let widget = this._getWidget();
      let expander = widget.getChildControl("expander");
      let left = widget.getIndentationLevel() * widget.getSpacePerIndentation();
      let spacing = this.getSpacing();
      let expanderWidth = widget.getExpanderWidth();
      if (expanderWidth === null) {
        if (expander.isVisible()) {
          let hint = expander.getSizeHint(true);
          let width = hint.width;
          if (width < hint.minWidth) {
            width = hint.minWidth;
          } else if (width > hint.maxWidth) {
            width = hint.maxWidth;
          }
          expanderWidth = width;
        } else {
          expanderWidth = 0;
        }
      }

      let width = left + expanderWidth + spacing;
      let label = widget.getChildControl("label");
      let hint = label.getSizeHint(true);
      let labelWidth = hint.width;
      if (hint.minWidth && hint.minWidth > labelWidth) {
        labelWidth = hint.minWidth;
      }
      width += labelWidth;
      return {
        width: width,
        minWidth: width,
        height: hint.height,
        minHeight: hint.minHeight,
        maxHeight: hint.maxHeight
      };
    }
  }
});
