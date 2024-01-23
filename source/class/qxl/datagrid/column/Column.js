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
    },

    /** Whether the column is enabled (this is controlled by the data grid) */
    enabled: {
      init: true,
      check: "Boolean",
      apply: "_applyEnabled",
      event: "changeEnabled"
    },

    bindingOptions: {
      init: () => undefined
    }
  },

  events: {
    /** Fired when the column details change */
    change: "qx.event.type.Data",

    /** Fired when the user taps on a header cell */
    headerTap: "qx.event.type.Event",

    /** Fired when the effectivelyEnabled needs to be checked, data is a {Boolean} */
    changeEffectivelyEnabled: "qx.event.type.Data",

    /** Fired when the effectivelyReadOnly needs to be checked, data is a {Boolean} */
    changeEffectivelyReadOnly: "qx.event.type.Data"
  },

  members: {
    __datagrid: null,

    /**
     * Called the the DataGrid when the column is added.  Do NOT call this manually.
     *
     * @param {qxl.datagrid.DataGrid} datagrid
     */
    setDataGrid(datagrid) {
      if (this.__datagrid === datagrid) {
        return;
      }
      if (qx.core.Environment.get("qx.debug")) {
        this.assertInstance(datagrid, qxl.datagrid.DataGrid);
        this.assertTrue(!this.__datagrid, "DataGrid already set");
      }
      if (this.__datagrid) {
        this.__datagrid.removeListener("changeEnabled", this.__onDataGridChangeEnabled, this);
        this.__datagrid.removeListener("changeReadOnly", this.__onDataGridChangeReadOnly, this);
      }
      this.__datagrid = datagrid;
      if (datagrid) {
        datagrid.addListener("changeEnabled", this.__onDataGridChangeEnabled, this);
        datagrid.addListener("changeReadOnly", this.__onDataGridChangeReadOnly, this);
      }
      this.fireDataEvent("changeEffectivelyEnabled", this.isEffectivelyEnabled());
      this.fireDataEvent("changeEffectivelyReadOnly", this.isEffectivelyEnabled());
    },

    /**
     * Returns the datagrid, if any
     *
     * @returns {qxl.datagrid.DataGrid}
     */
    getDataGrid() {
      return this.__datagrid;
    },

    /**
     * Event handler for when the datagrid changes `enabled`
     */
    __onDataGridChangeEnabled(evt) {
      this.fireDataEvent("changeEffectivelyEnabled", this.isEffectivelyEnabled());
    },

    /**
     * Event handler for when the datagrid changes `readOnly`
     */
    __onDataGridChangeReadOnly(evt) {
      this.fireDataEvent("changeEffectivelyReadOnly", this.isEffectivelyEnabled());
    },

    /**
     * Detects whether the column is read only, taking into account the datagrid
     *
     * @returns {Boolean}
     */
    isEffectivelyReadOnly() {
      return this.getReadOnly() || !this.getEnabled() || this.__datagrid?.isReadOnly() || !this.__datagrid?.isEnabled();
    },

    /**
     * Detects whether the column is enabled, taking into account the datagrid
     *
     * @returns {Boolean}
     */
    isEffectivelyEnabled() {
      return !this.getEnabled() || this.__datagrid?.isEnabled();
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
      let bindings = new qxl.datagrid.binding.Bindings(model);
      if (path) {
        if (model) {
          let bindingId = model.bind(path, widget, "value", this.getBindingOptions()(widget, model));
          bindings.add(model, bindingId);
        }
      }
      if (typeof widget.setReadOnly == "function") {
        const update = () => {
          widget.setReadOnly(this.isEffectivelyReadOnly());
          widget.setEnabled(this.isEffectivelyEnabled());
        };

        bindings.add(
          this,
          this.addListener("changeEffectivelyReadOnly", () => update()),
          "listener"
        );
        bindings.add(
          this,
          this.addListener("changeEffectivelyEnabled", () => update()),
          "listener"
        );
        update();
      } else {
        const update = () => {
          widget.setEnabled(this.isEffectivelyEnabled() && !this.isEffectivelyReadOnly());
        };

        bindings.add(
          this,
          this.addListener("changeEffectivelyReadOnly", () => update()),
          "listener"
        );
        bindings.add(
          this,
          this.addListener("changeEffectivelyEnabled", () => update()),
          "listener"
        );
        update();
      }
      return bindings;
    },

    /**
     * Creates a widget for displaying a value for for a single cell
     * @returns {qx.ui.core.Widget}
     */
    createWidgetForDisplay() {
      return new qx.ui.basic.Label().set({
        appearance: "qxl-datagrid-cell"
      });
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
     * Apply for `readOnly` property
     */
    _applyReadOnly(value) {},

    /**
     * Apply for `enabled` property
     */
    _applyEnabled(value) {}
  }
});
