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
 * Custom layout for the `qxl.datagrid.column.tree.ExpansionWidget`
 */
qx.Class.define("qxl.datagrid.column.tree.ExpansionLayout", {
  extend: qx.ui.layout.Abstract,

  properties: {
    /** How far apart to space the expand and label */
    spacing: {
      init: 3,
      check: "Integer"
    },

    position: {
      init: "start",
      check: ["start", "end"]
    }
  },

  members: {
    /**
     * @Override
     */
    renderLayout(availWidth, availHeight, padding) {
      let widget = this._getWidget();
      let expander = widget.getExpander();
      let label = widget.getLabel();
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

      if (this.getPosition() == "start") {
        if (expander.isVisible()) {
          expander.renderLayout(left, 0, expanderWidth, availHeight);
          left += expanderWidth + spacing;
        }
        label.renderLayout(left, 0, availWidth - left, availHeight);
      } else {
        let width = availWidth - left - expanderWidth - spacing;
        label.renderLayout(left, 0, width, availHeight);
        if ( expander.isVisible() ) {
          left += width + spacing;
          expander.renderLayout(left, 0, expanderWidth, availHeight);
        }
      }
    },

    _computeSizeHint() {
      let widget = this._getWidget();
      let expander = widget.getExpander();
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
      let label = widget.getLabel();
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
