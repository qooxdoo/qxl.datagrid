qx.Class.define("qxl.datagrid.ui.factory.AbstractWidgetFactory", {
  extend: qx.core.Object,
  type: "abstract",
  implement: [qxl.datagrid.ui.factory.IWidgetFactory],

  /**
   * Constructor
   *
   * @param {String} widgetAppearance the appearance to set on the widget
   */
  construct(columns, widgetAppearance) {
    super();
    this.__widgets = {};
    this.__widgetAppearance = widgetAppearance;
    if (columns) {
      this.setColumns(columns);
    }
  },

  properties: {
    /** The columns on display in this widget */
    columns: {
      init: null,
      nullable: true,
      check: "qxl.datagrid.column.IColumns",
      apply: "_applyColumns",
      event: "changeColumns"
    }
  },

  members: {
    /** @type{Map<String,qx.ui.core.Widget>} the widgets, indexed by row:column */
    __widgets: null,

    /** @type{String} the appearance to set on each widget */
    __widgetAppearance: null,

    /**
     * Apply for `columns`
     */
    _applyColumns(value, oldValue) {
      this.disposeAllWidgets();
    },

    /**
     * Unbinds and disposes all the widgets
     */
    disposeAllWidgets() {
      Object.values(this.getWidgets()).forEach(widget => {
        this.unbindWidget(widget);
        this.disposeWidget(widget);
      });
    },

    /**
     * @override
     */
    getWidgetFor(rowIndex, columnIndex) {
      let id = rowIndex + ":" + columnIndex;
      let widget = this.__widgets[id];
      if (!widget) {
        widget = this.__widgets[id] = this._createWidget();
        widget.setAppearance(this.__widgetAppearance);
        widget.setUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData", {
          rowIndex: rowIndex,
          columnIndex: columnIndex,
          column: this.getColumns().getColumn(columnIndex)
        });
      }
      return widget;
    },

    /**
     * @override
     */
    disposeWidget(widget) {
      let bindingData = widget.getUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData");
      let id = bindingData.rowIndex + ":" + bindingData.columnIndex;
      if (bindingData.model) {
        this.unbindWidget(widget);
      }
      widget.setUserData("qxl.datagrid.factory.AbstractWidgetFactory.bindingData", null);
      delete this.__widgets[id];
      widget.dispose();
    },

    /**
     * Called to create a widget
     *
     * @return {qx.ui.core.Widget}
     */
    _createWidget() {
      throw new Error("No such method " + this.classname + "._createWidget");
    },

    /**
     * Returns a list of all widgets
     *
     * @returns {qx.ui.core.Widget[]}
     */
    getWidgets() {
      return this.__widgets;
    }
  }
});
