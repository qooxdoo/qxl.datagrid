qx.Interface.define("qxl.datagrid.column.tree.IExpansionWidget", {
  properties: {
    /** How deep the indentation level is */
    indentationLevel: {
      init: 0,
      check: "Integer"
    }
  },

  members: {
    /**
     * Returns the expander widget
     *
     * @return {qx.ui.core.Widget}
     */
    getExpander() {},

    /**
     * Returns the widget for displaying the object
     *
     * @return {qx.ui.core.Widget}
     */
    getLabel() {}
  }
});
