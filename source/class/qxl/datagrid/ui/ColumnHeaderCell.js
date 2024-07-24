/**
 * The widget for the column header cell in the datagrid.
 * Shows the column's custom icon, label, and sort icon.
 *
 * Listens to left click events when the user clicks on the cell to sort the column.
 * Changes its appearance based on the sort order of the column.
 *
 */
qx.Class.define("qxl.datagrid.ui.ColumnHeaderCell", {
  extend: qx.ui.core.Widget,
  include: [qx.ui.core.MExecutable],

  construct() {
    super();

    this._setLayout(new qx.ui.layout.HBox().set({ alignY: "middle" }));
    this._add(this.getChildControl("icon"));
    this._add(this._createChildControl("label"), { flex: 1 });
    this._add(this._createChildControl("sortIcon"));

    this.bind("icon", this.getChildControl("icon"), "source");
    this.bind("label", this.getChildControl("label"), "value");

    this.addListener("pointerup", this._onPointerUp);

    this.addListener("execute", e => {
      if (!this.getSortable()) return;

      if (this.getSortOrder() === "asc") {
        this.setSortOrder("desc");
      } else if (this.getSortOrder() === "desc") {
        this.setSortOrder("asc");
      } else {
        this.setSortOrder("asc");
      }
    });
  },

  properties: {
    /**
     * The caption of the column.
     */
    label: {
      check: "String",
      nullable: true,
      init: null,
      event: "changeLabel"
    },

    /**
     * The sort order of the column.
     * The column's sort order property (qxl.datagrid.column.Column#sortOrder) is bound to this property, bidirectionally, column first
     */
    sortOrder: {
      init: null,
      nullable: true,
      check: ["asc", "desc"],
      event: "changeSortOrder",
      apply: "_applySortOrder"
    },

    /**
     * Whether the column that this widget is linked to is sortable or not.
     * The column's sortable property (qxl.datagrid.column.Column#sortOrder) is bound to this property, bidirectionally, column first
     */
    sortable: {
      check: "Boolean",
      init: false,
      apply: "_applySortable",
      event: "changeSortable"
    },

    /**
     * User-specified icon to show in the cell. Displays on the left side of the label by default.
     * Must be a valid qx.ui.basic.Image.source
     */
    icon: {
      check: "String",
      nullable: true,
      init: null,
      event: "changeIcon"
    }
  },

  members: {
    _forwardStates: {
      sortAsc: true,
      sortDesc: true,
      sortable: true
    },

    /**
     * Listener for "pointerup" event.
     *
     * Updates the sort order of the column.
     * @param {} e
     */
    _onPointerUp(e) {
      this.releaseCapture();
      this.execute();
      e.stopPropagation();
    },

    _applySortOrder(value, old) {
      this.removeState("sortAsc");
      this.removeState("sortDesc");

      if (value) {
        this.addState(`sort${qx.lang.String.firstUp(value)}`);
      }
    },

    _applySortable(value, old) {
      if (value) {
        this.addState("sortable");
      } else {
        this.removeState("sortable");
      }

      this.getChildControl("sortIcon").setVisibility(value ? "visible" : "hidden");
    },

    /**
     * @override
     */
    _createChildControlImpl(id) {
      switch (id) {
        /**
         * User-specified icon to show in the cell. Displays on the left side of the label by default.
         * Must be a valid qx.ui.basic.Image.source
         */
        case "icon": {
          return new qx.ui.basic.Image();
        }

        /**
         * The caption of the column.
         */
        case "label": {
          return new qx.ui.basic.Label().set({ rich: true });
        }

        /**
         * The sort icon, shown on the right.
         */
        case "sortIcon": {
          return new qx.ui.basic.Image();
        }
      }

      return super._createChildControlImpl(id);
    }
  }
});
