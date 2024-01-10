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
 * Creates a toolbar button
 */
qx.Class.define("qxl.datagrid.column.toolbar.Factory", {
  extend: qx.core.Object,

  properties: {
    caption: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeCaption"
    },

    icon: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeIcon"
    },

    action: {
      init: null,
      nullable: true,
      check: "Function",
      event: "changeAction"
    },

    show: {
      init: "icon",
      check: ["both", "text", "icon"],
      event: "changeShow"
    }
  },

  members: {
    /**
     * Called to create the button
     *
     * @return {qx.ui.core.Widget} The button
     */
    createButton() {
      return new qx.ui.form.Button(this.getCaption(), this.getIcon()).set({ show: this.getShow() });
    }
  }
});
