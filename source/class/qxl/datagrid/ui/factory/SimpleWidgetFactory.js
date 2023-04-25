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
 * Basic implementation of `qxl.datagrid.ui.factory.IWidgetFactory` for widgets in
 * the widget pane
 */
qx.Class.define("qxl.datagrid.ui.factory.SimpleWidgetFactory", {
  extend: qxl.datagrid.ui.factory.AbstractWidgetFactory,

  members: {
    /**
     * @override
     */
    bindWidget(widget, model) {
      let bindingData = widget.getUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData");
      bindingData.binding = bindingData.column.bindWidget(widget, model, this);
      bindingData.model = model;
    },

    /**
     * @override
     */
    unbindWidget(widget) {
      let bindingData = widget.getUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData");
      if (bindingData.binding) {
        bindingData.binding.dispose();
      }
      bindingData.model = null;
      bindingData.binding = null;
    },

    /**
     * @override
     */
    _createWidget(column) {
      return column.createWidgetForDisplay();
    }
  }
});
