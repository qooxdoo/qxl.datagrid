/* ************************************************************************
 *
 *    Qooxdoo DataGrid
 *
 *    https://github.com/qooxdoo/qooxdoo
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 * *********************************************************************** */

/**
 * A cell which shows an icon and a label, used by `SelectColumn` and `BooleanColumn`.
 *
 * The icon has the appearance `qxl-datagrid-cell/icon`, where the theme sets its size (eg `maxHeight` with
 * `scale`, the image keeps its proportions) and, for the state `checked`, its source. A font icon takes
 * the text color of the cell.
 */
qx.Class.define("qxl.datagrid.ui.IconCell", {
  extend: qx.ui.core.Widget,

  construct() {
    super();
    this._setLayout(new qx.ui.layout.HBox().set({ alignY: "middle" }));
    let icon = this.getChildControl("icon");
    this._add(icon);
    this._add(this.getChildControl("label"), { flex: 1 });
    icon.addListener("changeSource", this.__updateLabel, this);
  },

  properties: {
    appearance: {
      refine: true,
      init: "qxl-datagrid-cell"
    },

    /**
     * What the cell shows, as `{label, icon, checked}`, all optional: `icon` is a source for
     * `qx.ui.basic.Image`; `checked` gives the cell the state `checked`, and while the theme then
     * gives the icon a source, the label is not shown (it is the text for themes without icon)
     */
    value: {
      init: null,
      nullable: true,
      check: "Object",
      event: "changeValue",
      apply: "_applyValue"
    }
  },

  // _forwardStates is a map that qooxdoo only reads, it is never changed
  // eslint-disable-next-line @qooxdoo/qx/no-refs-in-members
  members: {
    _forwardStates: {
      checked: true
    },

    /**
     * Apply for `value`
     *
     * @param {Object?} value
     */
    _applyValue(value) {
      if (value?.checked) {
        this.addState("checked");
      } else {
        this.removeState("checked");
      }
      let icon = this.getChildControl("icon");
      if (value?.icon) {
        icon.setSource(value.icon);
      } else {
        // the theme may give an icon
        icon.resetSource();
      }
      this.__updateLabel();
    },

    /**
     * Shows the label unless it is replaced by the icon of the theme; keeps a gap between icon and label
     */
    __updateLabel() {
      let value = this.getValue();
      let hasIcon = !!this.getChildControl("icon").getSource();
      let text = value?.label ?? "";
      let replaced = !!value?.checked && hasIcon && !value.icon;
      this.getChildControl("label").setValue(replaced ? "" : text);
      this.getChildControl("icon").setMarginRight(hasIcon && text && !replaced ? qxl.datagrid.ui.IconCell.GAP : 0);
      // screen readers still get the text the icon stands for
      this.getContentElement().setAttribute("aria-label", replaced && text ? text : null);
    },

    /**
     * @override
     */
    _createChildControlImpl(id) {
      switch (id) {
        case "icon":
          return new qx.ui.basic.Image().set({ anonymous: true });

        case "label":
          return new qx.ui.basic.Label().set({ anonymous: true });
      }
      return super._createChildControlImpl(id);
    }
  },

  statics: {
    /** @type {Integer} pixels between icon and label */
    GAP: 4
  }
});
