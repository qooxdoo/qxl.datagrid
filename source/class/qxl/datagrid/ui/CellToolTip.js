/* ************************************************************************
 *
 *    Qooxdoo DataGrid
 *
 *    https://github.com/qooxdoo/qooxdoo
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 * *********************************************************************** */

/**
 * The tooltip of the cells: it shows the whole text of a cell whose text is cut off, and nothing for
 * a cell whose text fits. Whether the text fits is only measured when the tooltip is about to show,
 * not while cells are bound and scrolled; the tooltip manager decides on `pointerover` already which
 * tooltip a widget has, so the cells always have this one and it stays hidden when there is nothing
 * to show.
 *
 * `qxl.datagrid.DataGrid.truncatedTextToolTips` switches it off for a grid.
 */
qx.Class.define("qxl.datagrid.ui.CellToolTip", {
  extend: qx.ui.tooltip.ToolTip,
  type: "singleton",

  members: {
    /**
     * @override shows the tooltip only if a text of the cell is cut off
     */
    show() {
      let text = this.__getTruncatedText();
      if (!text) {
        return;
      }
      this.setLabel(text);
      super.show();
    },

    /**
     * Finds the text which is cut off in the cell the tooltip is opened for; the innermost element
     * whose content is wider than the element, so that eg the label of an `IconCell` or of a tree cell
     * is found
     *
     * @return {String?} the whole text, null if all fits or the grid has the tooltips switched off
     */
    __getTruncatedText() {
      let cell = this.getOpener();
      let grid = cell?.getLayoutParent();
      while (grid && !(grid instanceof qxl.datagrid.DataGrid)) {
        grid = grid.getLayoutParent();
      }
      let element = cell?.getContentElement().getDomElement();
      if (!grid?.getTruncatedTextToolTips() || !element) {
        return null;
      }
      let truncated = [element, ...element.querySelectorAll("*")].filter(el => el.scrollWidth > el.clientWidth && el.textContent.trim());
      return truncated.length ? truncated[truncated.length - 1].textContent : null;
    }
  }
});
