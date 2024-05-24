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
      bindingData.bindings = bindings;
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
     * @override
     */
    _createWidget() {
      let widget = new qxl.datagrid.ui.ColumnHeaderCell();
      return widget;
    }
  }
});
