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
 *      * Will Johnson (willsterjohnson)
 *
 * *********************************************************************** */

/**
 * Demonstrates a DataGrid on a 1-dimensional array of data: editing with the typical kinds of
 * columns, a check of values, cells locked per row, changed values marked by states, sorting,
 * the column menu, a context menu and the keyboard
 */
qx.Class.define("qxl.datagrid.demo.array.ArrayDemo", {
  extend: qx.ui.container.Composite,

  construct() {
    super();
    this.__changed = new Map();
    this.setLayout(new qx.ui.layout.VBox(10));
    this.add(this.getQxObject("controls"));
    this.add(
      qxl.datagrid.demo.Demo.createKeyHint(
        "F2/Enter edit, Enter goes on below, Tab to the next cell, Delete empties, Ctrl+C/Ctrl+V copy and paste, " +
          "Space switches a check mark or selects, Shift+arrows select a range (multi), Up in the first row goes into the header " +
          "(Enter sorts, Shift+Enter adds a column, Shift+Left/Right width), menu key opens the context menu"
      )
    );
    this.add(this.getQxObject("grid"), { flex: 1 });
  },

  objects: {
    dataSource() {
      return new qxl.datagrid.source.ArrayDataSource();
    },

    grid() {
      let grid = new qxl.datagrid.ClippedScrollDataGrid(this.getQxObject("columns")).set({
        dataSource: this.getQxObject("dataSource"),
        editable: true,
        columnVisibilityButtonVisible: true,
        widgetsContextMenu: this.getQxObject("contextMenu"),
        // a title and a date are required
        cellValidator: (model, column, value) => (["title", "date"].includes(column.getPath()) && !value ? `A ${column.getPath()} is required` : null),
        // books which are not in stock keep their price
        cellEditable: (model, column) => !(column.getPath() == "price" && !model.getInStock()),
        rowStates: model => (this.__changed.has(model) ? ["changed"] : null),
        cellStates: (model, column) => (this.__changed.get(model)?.has(column.getPath()) ? ["changed"] : null)
      });
      grid.getSelectionManager().setSelectionMode("multi");
      grid.addListener("cellValueChanged", evt => this.__onCellValueChanged(evt.getData()));
      grid.addListener("changeSelection", () => this.__updateStatus());
      return grid;
    },

    columns() {
      let columns = new qxl.datagrid.column.Columns();
      columns.add(new qxl.datagrid.column.TextColumn("title").set({ caption: "Title", minWidth: 200, flex: 1, sortable: true, hideable: false }));
      columns.add(new qxl.datagrid.column.TextColumn("author").set({ caption: "Author", minWidth: 160, sortable: true }));
      columns.add(new qxl.datagrid.column.NumberColumn("price").set({ caption: "Price", minWidth: 90, sortable: true }));
      columns.add(new qxl.datagrid.column.BooleanColumn("inStock").set({ caption: "In stock", minWidth: 80, sortable: true }));
      columns.add(
        new qxl.datagrid.column.SelectColumn(
          "genre",
          qxl.datagrid.demo.array.DummyModel.GENRES.map(genre => ({ label: genre, model: genre }))
        ).set({ caption: "Genre", minWidth: 120, sortable: true })
      );
      columns.add(new qxl.datagrid.column.DateColumn("date").set({ caption: "Date", minWidth: 160, sortable: true }));
      return columns;
    },

    controls() {
      let controls = new qx.ui.container.Composite(new qx.ui.layout.HBox(10).set({ alignY: "middle" }));
      let grid = this.getQxObject("grid");

      let editable = new qx.ui.form.CheckBox("Editable").set({ value: true });
      editable.bind("value", grid, "editable");
      controls.add(editable);

      controls.add(new qx.ui.basic.Label("Selection mode:"));
      let mode = new qx.ui.form.SelectBox();
      for (let name of ["one", "single", "multi", "additive"]) {
        mode.add(new qx.ui.form.ListItem(name, null, name));
      }
      mode.setModelSelection(["multi"]);
      mode.addListener("changeSelection", () => grid.getSelectionManager().setSelectionMode(mode.getModelSelection().getItem(0)));
      controls.add(mode);

      let reset = new qx.ui.form.Button("Reset changes");
      reset.addListener("execute", () => this.resetChanges());
      controls.add(reset);

      controls.add(this.getQxObject("status"), { flex: 1 });
      return controls;
    },

    status() {
      return new qx.ui.basic.Label("");
    },

    contextMenu() {
      let menu = new qx.ui.menu.Menu();
      let remove = new qx.ui.menu.Button("Delete selected rows");
      remove.addListener("execute", () => {
        let selected = this.getQxObject("grid").getSelection().toArray().slice();
        this.getQxObject("dataSource").getModel().removeAll(selected);
      });
      menu.add(remove);
      return menu;
    }
  },

  members: {
    /** @type {Map<qx.core.Object, Set<String>>} the paths changed per model, for the states "changed" */
    __changed: null,

    /** @type {String} the last change, for the status line */
    __lastChange: "",

    async init() {
      this.getQxObject("dataSource").setColumns(this.getQxObject("columns"));
      let model = new qx.data.Array(...Array.from({ length: 100 }, () => new qxl.datagrid.demo.array.DummyModel()));
      this.getQxObject("dataSource").setModel(model);
      this.__updateStatus();
    },

    /**
     * Forgets the changes, the rows and cells lose the state "changed"
     */
    resetChanges() {
      this.__changed.clear();
      this.__lastChange = "";
      this.getQxObject("grid").scheduleUpdateWidgets();
      this.__updateStatus();
    },

    /**
     * Remembers a changed value for the states; the grid renders again, also because "In stock"
     * locks or unlocks the price
     *
     * @param {Object} change data of `cellValueChanged`
     */
    __onCellValueChanged(change) {
      let paths = this.__changed.get(change.model) ?? new Set();
      paths.add(change.column.getPath());
      this.__changed.set(change.model, paths);
      this.__lastChange = `${change.column.getCaption()}: ${change.column.formatForClipboard(change.oldValue)} → ${change.column.formatForClipboard(change.value)}`;
      this.getQxObject("grid").scheduleUpdateWidgets();
      this.__updateStatus();
    },

    /**
     * Shows the number of selected rows, of changed rows and the last change
     */
    __updateStatus() {
      let selected = this.getQxObject("grid").getSelection().getLength();
      let text = `${selected} selected, ${this.__changed.size} changed`;
      this.getQxObject("status").setValue(this.__lastChange ? `${text} – last: ${this.__lastChange}` : text);
    }
  }
});
