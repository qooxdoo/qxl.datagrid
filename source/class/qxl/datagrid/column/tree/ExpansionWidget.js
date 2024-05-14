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
    this._add(this.getChildControl("icon"));
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
    appearance: {
      refine: true,
      init: "qxl-datagrid-cell"
    },

    /** The text to display */
    value: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeValue",
      apply: "__applyValue"
    },

    /** The icon to display, next to the expander icon */
    icon: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeIcon",
      apply: "__applyIcon"
    },

    /** State of tne expander, ie whether there are children */
    state: {
      init: "none",
      check: ["none", "open", "closed"],
      apply: "__applyState",
      event: "changeState"
    },

    /**
     * Icon to use when the state is "none"
     */
    stateIconNone: {
      init: null,
      check: "String",
      apply: "_updateIcon",
      themeable: true
    },

    /**
     * Icon to use when the state is "open"
     */
    stateIconOpen: {
      init: "@MaterialIcons/expand_more/16",
      check: "String",
      apply: "_updateIcon",
      themeable: true
    },

    /**
     * Icon to use when the state is "closed"
     */
    stateIconClosed: {
      init: "@MaterialIcons/chevron_right/16",
      check: "String",
      apply: "_updateIcon",
      themeable: true
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
     * Apply for `icon`
     */
    __applyIcon(value) {
      this.getChildControl("icon").setSource(value || null);
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
      this._updateIcon();
    },

    /**
     * Called to update the icon, because one or several properties have been updated
     */
    _updateIcon() {
      let icon;

      switch (this.getState()) {
        case "none":
          icon = this.getStateIconNone();
          break;
        case "open":
          icon = this.getStateIconOpen();
          break;
        case "closed":
          icon = this.getStateIconClosed();
          break;
      }

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
    _createChildControlImpl(id) {
      switch (id) {
        case "expander":
          var expander = new qx.ui.basic.Image().set({
            visibility: "hidden",
            anonymous: true
          });
          return expander;

        case "icon":
          var icon = new qx.ui.basic.Image().set({
            anonymous: true
          });
          return icon;

        case "label":
          return new qx.ui.basic.Label().set({
            allowGrowX: true,
            anonymous: true,
            rich: true,
            wrap: true
          });
      }

      return super._createChildControlImpl(id);
    }
  }
});
