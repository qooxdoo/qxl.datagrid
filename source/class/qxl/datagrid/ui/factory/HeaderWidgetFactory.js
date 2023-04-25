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

qx.Class.define("qxl.datagrid.ui.factory.HeaderWidgetFactory", {
  extend: qxl.datagrid.ui.factory.AbstractWidgetFactory,

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
      return new qx.ui.basic.Atom();
    }
  }
});
