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
 * Widget to contain the toolbar buttons
 */
qx.Class.define("qxl.datagrid.column.toolbar.CellWidget", {
  extend: qx.ui.core.Widget,

  construct() {
    super();
    this._setLayout(new qx.ui.layout.HBox());
    this.__buttonsByFactoryHash = {};
  },

  properties: {
    /** The model for the for that this widget appears on */
    model: {
      init: null,
      nullable: true,
      check: "qx.core.Object",
      event: "changeModel"
    },

    /** @type{qx.data.Array<qxl.datagrid.column.toolbar.Factory} */
    buttons: {
      check: "Array",
      event: "changeButtons",
      apply: "_applyButtons"
    }
  },

  members: {
    /** @type{Object<String,qx.ui.core.Widget>} the buttons, indexed by the has code of the factory */
    __buttonsByFactoryHash: null,

    /**
     * Apply for the buttons property
     */
    _applyButtons(value, oldValue) {
      if (oldValue) {
        throw new Error("Changing the buttons array is not supported");
      }
      if (value) {
        value.addListener("change", this._onButtonsChange, this);
        value.forEach(factory => this._addButton(factory));
      }
    },

    /**
     * Adds a button factory
     *
     * @param {qxl.datagrid.column.toolbar.Factory} factory
     */
    _addButton(factory) {
      let button = factory.createButton();
      button.addListener("execute", () => {
        factory.getAction()(this.getModel());
      });
      this.__buttonsByFactoryHash[factory.toHashCode()] = button;
      this._add(button);
    },

    /**
     * Removes a button factory
     *
     * @param {qxl.datagrid.column.toolbar.Factory} factory
     */
    _removeButton(factory) {
      let current = this.__buttonsByFactoryHash[factory.toHashCode()];
      if (current) {
        delete this.__buttonsByFactoryHash[factory.toHashCode()];
        this._remove(current);
        current.dispose();
      }
    },

    /**
     * @Override
     */
    _applyEnabled(value, oldValue) {
      for (let btn of Object.values(this.__buttonsByFactoryHash)) {
        btn.setEnabled(value);
      }
      return super._applyEnabled(value, oldValue);
    },

    /**
     * Event handler for changes to the buttons array
     *
     * @param {*} evt
     */
    _onButtonsChange(evt) {
      let data = evt.getData();
      if (data.removed) {
        data.removed.forEach(factory => this._removeButton(factory));
      }
      if (data.added) {
        data.added.forEach(factory => this._addButton(factory));
      }
    }
  }
});
