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

qx.Class.define("qxl.datagrid.demo.biggrid.BigGridDemo", {
  extend: qx.ui.container.Composite,

  construct() {
    super();
    this.setLayout(new qx.ui.layout.VBox());

    let grid = this.getQxObject("grid");

    {
      let comp = new qx.ui.container.Composite(new qx.ui.layout.Grid(5, 3));
      comp.add(new qx.ui.basic.Label("Selection Style : "), { row: 0, column: 0 });
      let rbComp = new qx.ui.container.Composite(new qx.ui.layout.HBox(5));
      let rbRow = new qx.ui.form.RadioButton("Row");
      rbComp.add(rbRow.set({ model: "row" }));
      let rbCell = new qx.ui.form.RadioButton("Cell");
      rbComp.add(rbCell.set({ model: "cell" }));
      let rbArea = new qx.ui.form.RadioButton("Area");
      rbComp.add(rbArea.set({ model: "area" }));
      comp.add(rbComp, { row: 0, column: 1 });
      let manager = new qx.ui.form.RadioGroup(rbRow, rbCell, rbArea);
      manager.addListener("changeSelection", evt => {
        let rb = evt.getData()[0];
        grid.getSelectionManager().setSelectionStyle(rb.getModel());
      });
      manager.setSelection([rbCell]);
      this.add(comp);
    }

    {
      let comp = new qx.ui.container.Composite(new qx.ui.layout.Grid(5, 3));
      comp.add(new qx.ui.basic.Label("Selection Mode : "), { row: 0, column: 0 });
      let rbComp = new qx.ui.container.Composite(new qx.ui.layout.HBox(5));

      let rbOne = new qx.ui.form.RadioButton("One").set({ model: "one" });
      rbComp.add(rbOne);

      let rbSingle = new qx.ui.form.RadioButton("Single").set({ model: "single" });
      rbComp.add(rbSingle);

      let rbMulti = new qx.ui.form.RadioButton("Multi").set({ model: "multi" });
      rbComp.add(rbMulti);

      let rbAdditive = new qx.ui.form.RadioButton("Additive").set({ model: "additive" });
      rbComp.add(rbAdditive);

      comp.add(rbComp, { row: 0, column: 1 });
      let manager = new qx.ui.form.RadioGroup(rbOne, rbSingle, rbMulti, rbAdditive);
      manager.addListener("changeSelection", evt => {
        let rb = evt.getData()[0];
        grid.getSelectionManager().setSelectionMode(rb.getModel());
      });
      manager.setSelection([rbMulti]);
      this.add(comp);
    }

    this.add(grid, { flex: 1 });
  },

  objects: {
    dataSource() {
      // Create a massive data source with 1,000,000 rows and 10,000 columns
      return new qxl.datagrid.demo.biggrid.DummyDataSource(1000 /* 000 */, 100 /* 00 */);
    },

    grid() {
      var dataSource = this.getQxObject("dataSource");
      var columns = new qxl.datagrid.column.Columns();
      for (let columnIndex = 0; columnIndex < dataSource.getNumColumns(); columnIndex++) {
        // One column definition does not take uyp much space, so although we create 10,000
        //  columns that shouldnt be much of a problem
        let column = new qxl.datagrid.column.TextColumn().set({
          caption: qxl.datagrid.util.Labels.getColumnLetters(columnIndex),
          path: "label",
          minWidth: 80
        });
        columns.add(column);
      }

      var grid = new qxl.datagrid.ClippedScrollDataGrid(columns).set({
        dataSource: dataSource
      });

      // Adjust the default selection style
      grid.getSelectionManager().set({
        selectionStyle: "cell",
        selectionMode: "multi"
      });
      grid.addListener("changeSelection", evt => {
        let sel = evt.getData();
        console.log("Selection changed to " + sel.map(model => model.toString()).join(","));
      });
      return grid;
    }
  },

  members: {
    /**
     * Called once to get the demo running
     */
    async init() {
      let dataSource = this.getQxObject("dataSource");
      await dataSource.makeAvailable(new qxl.datagrid.source.Range([0, 0], [10, 10]));

      let grid = this.getQxObject("grid");
      const valueAt = (row, column) => dataSource.getModelForPosition(new qxl.datagrid.source.Position(row, column));
      grid.getSelection().replace([valueAt(1, 0), valueAt(2, 0), valueAt(3, 0)]);
      grid.getSelectionManager().setFocused(valueAt(4, 4));
    }
  }
});
