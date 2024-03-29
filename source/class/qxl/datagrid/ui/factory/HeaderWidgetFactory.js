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
    bindWidget(widget, column) {
      let bindingData = widget.getUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData");
      let id = bindingData.column.bind("caption", widget, "label", {
        converter(data, model, source, target) {
          return data ? data : qxl.datagrid.util.Labels.getColumnLetters(bindingData.columnIndex);
        }
      });
      bindingData.bindingId = id;
    },

    /**
     * @override
     */
    unbindWidget(widget) {
      let bindingData = widget.getUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData");
      bindingData.column.removeBinding(bindingData.bindingId);
      bindingData.bindingId = null;
    },

    /**
     * @override
     */
    _createWidget() {
      let atom = new qx.ui.basic.Atom().set({
        appearance: this.getWidgetAppearance(),
        rich: true,
        iconPosition: "top-left"
      });
      return atom;
    }
  }
});
