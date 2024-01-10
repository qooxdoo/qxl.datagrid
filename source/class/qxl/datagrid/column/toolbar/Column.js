/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2020 Zenesis Ltd, https://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * John Spackman (https://githuib.com/johnspackman, john.spackman@zenesis.com)

************************************************************************ */

/**
 * Provides a column which has a toolbar in each row
 */
qx.Class.define("qxl.datagrid.column.toolbar.Column", {
  extend: qxl.datagrid.column.Column,

  construct() {
    super();
    this.setButtons(new qx.data.Array());
  },

  properties: {
    /** @type{qx.data.Array<qxl.datagrid.column.toolbar.Factory} */
    buttons: {
      check: "qx.data.Array",
      event: "changeButtons",
      transform: "_transformButtons"
    }
  },

  members: {
    /**
     * Transform for the buttons property
     */
    _transformButtons(value, oldValue) {
      if (oldValue) {
        oldValue.replace(value || []);
        return oldValue;
      }
      return value || new qx.data.Array();
    },

    /**
     * @Override
     */
    createWidgetForDisplay() {
      return new qxl.datagrid.column.toolbar.CellWidget();
    },

    /**
     * @Override
     */
    bindWidget(widget, model, factory) {
      let bindings = super.bindWidget(widget, model, factory);
      widget.setModel(model);
      let bindingId = this.bind("buttons", widget, "buttons");
      bindings.add(this, bindingId);
      return bindings;
    }
  }
});
