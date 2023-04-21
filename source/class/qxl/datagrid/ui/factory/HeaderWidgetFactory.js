qx.Class.define("qxl.datagrid.ui.factory.HeaderWidgetFactory", {
  extend: qxl.datagrid.ui.factory.AbstractWidgetFactory,

  members: {
    /**
     * @override
     */
    bindWidget(widget) {
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
      return new qx.ui.basic.Atom();
    }
  }
});
