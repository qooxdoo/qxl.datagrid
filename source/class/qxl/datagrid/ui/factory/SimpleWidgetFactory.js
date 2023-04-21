qx.Class.define("qxl.datagrid.ui.factory.SimpleWidgetFactory", {
  extend: qxl.datagrid.ui.factory.AbstractWidgetFactory,

  members: {
    /**
     * @override
     */
    bindWidget(widget, model) {
      let bindingData = widget.getUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData");
      let path = bindingData.column.getPath();
      if (path) {
        if (model) {
          bindingData.bindingId = model.bind(path, widget, "label");
        }
      } else {
        widget.setLabel(model);
      }
      bindingData.model = model;
    },

    /**
     * @override
     */
    unbindWidget(widget) {
      let bindingData = widget.getUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData");
      if (bindingData.bindingId) {
        // Models can be disposed early, eg when scrolling across virtual data source spaces and
        //  the data source learns that they will no longer be needed
        if (!bindingData.model.isDisposed()) {
          bindingData.model.removeBinding(bindingData.bindingId);
        }
      }
      bindingData.model = null;
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
