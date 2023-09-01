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
 * Special widget used for the cells in the first column that can show expansion or branches
 */
qx.Class.define("qxl.datagrid.column.tree.ExpansionWidget", {
  extend: qx.ui.core.Widget,

  construct() {
    super();
    this._setLayout(new qxl.datagrid.column.tree.ExpansionLayout());
    this._add(this.getChildControl("expander"));
    this._add(this.getChildControl("label"));

    this.addListener("tap", evt => {
      let state = this.getState();
      if (state == "open") {
        this.setState("closed");
      } else if (state == "closed") {
        this.setState("open");
      }
    });
  },

  properties: {
    /** The text to display */
    value: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeValue",
      apply: "__applyValue"
    },

    /** State of tne expander, ie whether there are children */
    state: {
      init: "none",
      check: ["none", "open", "closed"],
      apply: "__applyState",
      event: "changeState"
    },

    /** Function that when called will return the icon to use
     *
     * @param {String} state the state of the node
     * @return {String?} the image source for the expander, null to not show anything
     */
    stateIconProvider: {
      init: null,
      nullable: true,
      check: "Function"
    },

    /** Number of pixels to indent for each indentation level */
    spacePerIndentation: {
      init: 20,
      check: "Integer",
      themeable: true
    },

    /** How much space to allow for the expander; null means automatic, and that the expander will not
     * take up any space if `state == "none"`
     */
    expanderWidth: {
      init: null,
      nullable: true,
      check: "Integer",
      themeable: true
    },

    /** How deep the indentation level is */
    indentationLevel: {
      init: 0,
      check: "Integer",
      apply: "__applyIndentationLevel"
    }
  },

  members: {
    _forwardStates: {
      selected: true
    },

    /**
     * Apply for `value`
     */
    __applyValue(value) {
      this.getChildControl("label").setValue(value || "");
    },

    /**
     * Apply for `indentationLevel`
     */
    __applyIndentationLevel(value, oldValue) {
      qx.ui.core.queue.Layout.add(this);
    },

    /**
     * Apply for `state`
     */
    __applyState(value, oldValue) {
      const STATES = {
        none: "@MaterialIcons/article/16",
        open: "@MaterialIcons/folder_open/16",
        closed: "@MaterialIcons/folder/16"
      };
      let fn = this.getStateIconProvider();
      let icon = fn ? fn(value) : STATES[value];

      let expander = this.getChildControl("expander");
      if (!icon) {
        expander.setVisibility("hidden");
      } else {
        expander.set({
          source: icon,
          visibility: "visible"
        });
      }
    },

    /**
     * @Override
     */
    getExpander() {
      return this.getChildControl("expander");
    },

    /**
     * Returns the widget for displaying the object
     *
     * @Override
     */
    getLabel() {
      return this.getChildControl("label");
    },

    /**
     * @Override
     */
    _createChildControlImpl(id) {
      switch (id) {
        case "expander":
          var expander = new qx.ui.basic.Image().set({
            visibility: "hidden",
            anonymous: true
          });
          return expander;

        case "label":
          return new qx.ui.basic.Label().set({
            allowGrowX: true,
            anonymous: true
          });
      }

      return super._createChildControlImpl(id);
    }
  }
});
