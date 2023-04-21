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

qx.class.define("qxl.datagrid.test.ui.DummyWidgetFactory", {
  extend: qx.core.Object,
  implement: [qxl.datagrid.ui.factory.IWidgetFactory],

  construct(widgetAppearance) {
    super();
    this.__widgets = {};
    this.__widgetAppearance = widgetAppearance;
  },

  members: {
    /** @type{Map<String,qx.ui.core.Widget>} the widgets, indexed by row:column */
    __widgets: null,

    /** @type{String} the appearance to set on each widget */
    __widgetAppearance: null,

    /**
     * @override
     */
    getWidgetFor(rowIndex, columnIndex) {
      let id = rowIndex + ":" + columnIndex;
      let widget = this.__widgets[id];
      if (!widget) {
        widget = this.__widgets[id] = new qx.ui.basic.Atom();
        widget.setAppearance(this.__widgetAppearance);
        widget.setUserData("qxl.datagrid.DummyWidgetFactory.bindingData", {
          rowIndex: rowIndex,
          columnIndex: columnIndex
        });
      }
      return widget;
    },

    disposeWidget(widget) {
      let bindingData = widget.getUserData("qxl.datagrid.DummyWidgetFactory.bindingData");
      if (bindingData) {
        if (bindingData.model) {
          this.unbindWidget(widget);
        }
        widget.setUserData("qxl.datagrid.DummyWidgetFactory.bindingData", null);
      }
      widget.dispose();
    },

    /**
     * @override
     */
    bindWidget(widget, model) {
      let id = model.bind("label", widget, "value");
      let bindingData = widget.getUserData("qxl.datagrid.DummyWidgetFactory.bindingData");
      bindingData.model = model;
      bindingData.bindingId = id;
    },

    /**
     * @override
     */
    unbindWidget(widget) {
      let bindingData = widget.getUserData("qxl.datagrid.DummyWidgetFactory.bindingData");
      bindingData.model.removeBinding(bindingData.bindingId);
      bindingData.model = null;
      bindingData.bindingId = null;
    }
  }
});
