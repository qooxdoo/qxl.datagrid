/**
 * The widget for the column header cell in the datagrid.
 * Shows the column's custom icon, label, sort icon and, with several sorted columns, the rank.
 *
 * A click sorts the column (Shift+click adds it to the sorted columns), dragging the right edge
 * changes its width. In the grid, `HeaderWidgetFactory` handles both via the events `sortRequest`
 * and `resizeRequest`; a cell on its own switches its `sortOrder` itself.
 * Changes its appearance based on the sort order of the column.
 */
qx.Class.define("qxl.datagrid.ui.ColumnHeaderCell", {
  extend: qx.ui.core.Widget,
  include: [qx.ui.core.MExecutable],

  construct() {
    super();

    this._setLayout(new qx.ui.layout.HBox().set({ alignY: "middle" }));
    this._add(this.getChildControl("icon"));
    this._add(this._createChildControl("label"), { flex: 1 });
    this._add(this._createChildControl("sortRank"));
    this._add(this._createChildControl("sortIcon"));

    this.bind("icon", this.getChildControl("icon"), "source");
    this.bind("label", this.getChildControl("label"), "value");

    this.addListener("pointerdown", this._onPointerDown);
    this.addListener("pointermove", this._onPointerMove);
    this.addListener("pointerup", this._onPointerUp);

    this.addListener("execute", e => {
      if (!this.getSortable()) {
        return;
      }
      if (this.hasListener("sortRequest")) {
        this.fireDataEvent("sortRequest", { add: this.__shift });
      } else if (this.getSortOrder() === "asc") {
        this.setSortOrder("desc");
      } else if (this.getSortOrder() === "desc") {
        this.setSortOrder(null);
      } else {
        this.setSortOrder("asc");
      }
    });
  },

  events: {
    /** Fired when the user wants to sort by this column (click, Enter); data is `{add}`, true with Shift */
    sortRequest: "qx.event.type.Data",

    /** Fired while the user drags the right edge; data is `{width}`, the wanted width in pixels */
    resizeRequest: "qx.event.type.Data"
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
    },

    /**
     * The rank of the column among several sorted columns (1 sorts first), shown next to the sort
     * icon; null with one sorted column or if the column is not sorted
     */
    sortRank: {
      check: "Integer",
      nullable: true,
      init: null,
      event: "changeSortRank",
      apply: "_applySortRank"
    }
  },

  // _forwardStates is a map that qooxdoo only reads, it is never changed
  // eslint-disable-next-line @qooxdoo/qx/no-refs-in-members
  members: {
    _forwardStates: {
      sortAsc: true,
      sortDesc: true,
      sortable: true
    },

    /** @type {Boolean} whether Shift was pressed with the click which executes */
    __shift: false,

    /** @type {Object?} while dragging the right edge: `{startX, startWidth}`; the pointer up then does not sort */
    __resizing: null,

    /**
     * Whether a pointer event is on the right edge, where dragging changes the width
     *
     * @param {qx.event.type.Pointer} e
     * @return {Boolean}
     */
    __isOnResizeEdge(e) {
      let location = this.getContentLocation();
      return !!location && this.hasListener("resizeRequest") && location.right - e.getDocumentLeft() <= qxl.datagrid.ui.ColumnHeaderCell.RESIZE_EDGE;
    },

    /**
     * Listener for "pointerdown": starts dragging the right edge
     *
     * @param {qx.event.type.Pointer} e
     */
    _onPointerDown(e) {
      if (!e.isLeftPressed() || !this.__isOnResizeEdge(e)) {
        return;
      }
      this.__resizing = { startX: e.getDocumentLeft(), startWidth: this.getBounds()?.width ?? 0 };
      this.capture();
      e.stopPropagation();
    },

    /**
     * Listener for "pointermove": changes the width while dragging, otherwise shows the resize
     * cursor on the right edge
     *
     * @param {qx.event.type.Pointer} e
     */
    _onPointerMove(e) {
      let resizing = this.__resizing;
      if (resizing) {
        this.fireDataEvent("resizeRequest", { width: Math.max(0, resizing.startWidth + e.getDocumentLeft() - resizing.startX) });
        return;
      }
      this.setCursor(this.__isOnResizeEdge(e) ? "col-resize" : null);
    },

    /**
     * Listener for "pointerup" event: ends dragging, otherwise sorts the column
     *
     * @param {qx.event.type.Pointer} e
     */
    _onPointerUp(e) {
      this.releaseCapture();
      e.stopPropagation();
      if (this.__resizing) {
        this.__resizing = null;
        return;
      }
      this.__shift = e.isShiftPressed();
      try {
        this.execute();
      } finally {
        this.__shift = false;
      }
    },

    /**
     * Apply for `sortOrder`
     *
     * @param {String?} value
     * @param old
     */
    _applySortOrder(value, old) {
      this.removeState("sortAsc");
      this.removeState("sortDesc");

      if (value) {
        this.addState(`sort${qx.lang.String.firstUp(value)}`);
      }
      this.__updateAriaSort();
    },

    /**
     * Apply for `sortable`; a column which cannot be sorted gives no space to the sort icon and rank,
     * so that the theme can align the caption like the cells
     *
     * @param {Boolean} value
     * @param old
     */
    _applySortable(value, old) {
      if (value) {
        this.addState("sortable");
      } else {
        this.removeState("sortable");
      }

      let visibility = value ? "visible" : "excluded";
      this.getChildControl("sortIcon").setVisibility(visibility);
      this.getChildControl("sortRank").setVisibility(visibility);
      this.__updateAriaSort();
    },

    /**
     * Apply for `sortRank`
     *
     * @param {Integer?} value
     */
    _applySortRank(value) {
      this.getChildControl("sortRank").setValue(value ? String(value) : "");
      this.__updateAriaSort();
    },

    /**
     * Sets `aria-sort` for screen readers; with several sorted columns only the first one carries the
     * direction, as WAI-ARIA asks for one sorted header
     */
    __updateAriaSort() {
      let value = null;
      if (this.getSortable()) {
        let sortOrder = (this.getSortRank() ?? 1) == 1 ? this.getSortOrder() : null;
        value = sortOrder == "asc" ? "ascending" : sortOrder == "desc" ? "descending" : "none";
      }
      this.getContentElement().setAttribute("aria-sort", value);
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
         * The sort icon, shown on the right; excluded until the column is sortable (`sortable` starts
         * as false, its apply runs only on a change).
         */
        case "sortIcon": {
          return new qx.ui.basic.Image().set({ visibility: "excluded" });
        }

        /**
         * The rank among several sorted columns, shown before the sort icon. It keeps a fixed width
         * like the sort icon in the themes: the header lays out its cells with fixed sizes, so a cell
         * whose size hint changes later would not be laid out again.
         */
        case "sortRank": {
          return new qx.ui.basic.Label("").set({ width: 12, allowGrowX: false, textAlign: "center", visibility: "excluded" });
        }
      }

      return super._createChildControlImpl(id);
    }
  },

  statics: {
    /** @type {Integer} width in pixels of the right edge where dragging changes the width */
    RESIZE_EDGE: 5
  }
});
