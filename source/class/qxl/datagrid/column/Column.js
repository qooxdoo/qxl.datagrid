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
 * Abstract base for columns; this works with `qxl.datagrid`
 * to provide an easy way for columns of specific types to be managed
 */
qx.Class.define("qxl.datagrid.column.Column", {
  extend: qx.core.Object,
  type: "abstract",

  construct(path) {
    super();
    if (path) {
      this.setPath(path);
    }
  },

  properties: {
    /** Optional path to the value in a node for this column */
    path: {
      init: null,
      nullable: true,
      check: "String",
      event: "changePath"
    },

    /** Caption for the header */
    caption: {
      init: null,
      check: "String",
      event: "changeCaption"
    },

    /** Assigned width, can be null */
    width: {
      init: null,
      nullable: true,
      check: "Integer",
      event: "changeWidth",
      apply: "_applyWidth"
    },

    /** Minimum width, can be null */
    minWidth: {
      init: null,
      nullable: true,
      check: "Integer",
      event: "changeMinWidth",
      apply: "_applyMinWidth"
    },

    /** Maximum width, can be null */
    maxWidth: {
      init: null,
      nullable: true,
      check: "Integer",
      event: "changeMaxWidth",
      apply: "_applyMaxWidth"
    },

    /** Flex of the column  */
    flex: {
      init: 0,
      nullable: false,
      check: "Integer",
      event: "changeFlex",
      apply: "_applyFlex"
    },

    /** Whether the column is editable */
    readOnly: {
      init: false,
      check: "Boolean",
      apply: "_applyReadOnly",
      event: "changeReadOnly"
    }
  },

  events: {
    change: "qx.event.type.Data",
    headerTap: "qx.event.type.Event"
  },

  members: {
    /**
     * Returns a value for displaying the value for the column
     *
     * @param {*} node
     * @return {String}
     */
    getDisplayValue(node) {
      let path = this.getPath();
      if (!path) {
        return node;
      }
      let upname = qx.lang.String.firstUp(path);
      let value = node["get" + upname]();
      value = this._convertValueForDisplay(value);
      return value;
    },

    /**
     * Helper method that converts the model into a text value for display, used by bindings and `getDisplayValue`
     * @param {*} value returned by the binding, according to the path
     * @returns {String}
     */
    _convertValueForDisplay(value) {
      return value;
    },

    /**
     * Called to implement the binding
     *
     * @param {qx.ui.core.Widget} widget
     * @param {qx.core.Object} model
     * @param {qxl.datagrid.ui.factory.IWidgetFactory} factory
     * @returns {qxl.datagrid.binding.Bindings} the object to dispose of to remove the binding
     */
    bindWidget(widget, model, factory) {
      let path = this.getPath();
      if (path) {
        if (model) {
          let bindingId = model.bind(path, widget, "value", this._getBindingOptions(widget, model));
          return new qxl.datagrid.binding.Bindings(model, bindingId);
        }
      } else {
        widget.setLabel(model);
      }
    },

    /**
     * Creates a widget for displaying a value for for a single cell
     * @returns {qx.ui.core.Widget}
     */
    createWidgetForDisplay() {
      return new qx.ui.basic.Label();
    },

    /**
     * Returns options for the binding
     *
     * @param {qx.ui.core.Widget} widget
     * @param {qx.core.Object} model
     * @returns {*?}
     */
    _getBindingOptions(widget, model) {
      return undefined;
    },

    /**
     * Apply for `width` property
     */
    _applyWidth(value) {},

    /**
     * Apply for `minWidth` property
     */
    _applyMinWidth(value) {},

    /**
     * Apply for `maxWidth` property
     */
    _applyMaxWidth(value) {},

    /**
     * Apply for `flex` property
     */
    _applyFlex(value) {},

    /**
     * Apply for `readOnly` property`
     */
    _applyReadOnly(value) {}
  }
});
