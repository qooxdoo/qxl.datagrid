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
 * Implementation of `qxl.datagrid.ui.factory.IWidgetFactory` for widgets in header rows
 */
qx.Class.define("qxl.datagrid.ui.factory.HeaderWidgetFactory", {
  extend: qxl.datagrid.ui.factory.AbstractWidgetFactory,
  implement: qxl.datagrid.ui.factory.IWidgetFactory,

  properties: {
    /**
     * Sets the appearance for created widgets.
     *
     * This will only alter the appearance of widgets created after this property is set.
     */
    widgetAppearance: {
      check: "String",
      event: "changeWidgetAppearance",
      init: "qxl-datagrid-header-cell"
    }
  },

  members: {
    /**
     * @override
     */
    bindWidget(widget) {
      let bindingData = widget.getUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData");
      let column = bindingData.column;
      let bindings = new qxl.datagrid.binding.Bindings();
      bindings.add(column, column.bind("sortOrder", widget, "sortOrder"));
      bindings.add(widget, widget.bind("sortOrder", column, "sortOrder"));
      bindings.add(column, column.bind("caption", widget, "label"));
      bindings.add(column, column.bind("sortable", widget, "sortable"));
      bindings.add(widget, widget.addListener("sortRequest", evt => this.__onSortRequest(column, evt.getData().add)), "listener");
      bindings.add(widget, widget.addListener("resizeRequest", evt => column.resize(evt.getData().width)), "listener");
      let columns = this.getColumns();
      const updateRank = () => {
        let sortColumns = columns.getSortColumns();
        widget.setSortRank(sortColumns.length > 1 && sortColumns.includes(column) ? sortColumns.indexOf(column) + 1 : null);
      };
      bindings.add(columns, columns.addListener("changeSort", updateRank), "listener");
      updateRank();
      bindingData.bindings = bindings;
    },

    /**
     * Sorts by a column when its header cell is clicked or gets Enter, via the grid so that
     * `beforeSort` is fired; without a grid the column is sorted directly
     *
     * @param {qxl.datagrid.column.Column} column
     * @param {Boolean} add whether the column is added to the other sorted columns (Shift)
     */
    __onSortRequest(column, add) {
      let grid = column.getDataGrid();
      if (grid) {
        grid.toggleSort(column, add);
      } else {
        this.getColumns().toggleSort(column, add);
      }
    },


    /**
     * @override
     */
    unbindWidget(widget) {
      let bindingData = widget.getUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData");
      bindingData.bindings.dispose();
      bindingData.bindings = null;
    },

    /**
     * The states of the column go to the cell and to its label, so that the theme can align the caption
     * like the values (eg `number` to the right)
     *
     * @override
     */
    _createWidget(column) {
      let widget = new qxl.datagrid.ui.ColumnHeaderCell().set({ appearance: this.getWidgetAppearance() });
      let label = widget.getChildControl("label");
      column.getWidgetStates().forEach(state => {
        widget.addState(state);
        label.addState(state);
      });
      return widget;
    }
  }
});
