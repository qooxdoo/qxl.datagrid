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

qx.Class.define("qxl.datagrid.test.ui.SelectionManager", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testFocusedPositionFollowsModel() {
      const Model = qxl.datagrid.demo.perf.PerfModel;
      let model = new qx.data.Array([new Model(0), new Model(1), new Model(2)]);
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      let columns = new qxl.datagrid.column.Columns();
      columns.add(new qxl.datagrid.column.TextColumn("name"));
      dataSource.setColumns(columns);
      dataSource.setModel(model);
      let manager = new qxl.datagrid.ui.SelectionManager();
      manager.setDataSource(dataSource);
      const changed = () => new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve));
      await changed();

      manager.setFocusedPosition(new qxl.datagrid.source.Position(1, 5));
      this.assertIdentical(model.getItem(1), manager.getFocused());

      // a row inserted above moves the focused cell along with its model, the column stays
      let insertion = changed();
      model.insertAt(0, new Model(9));
      await insertion;
      this.assertTrue(manager.getFocusedPosition().equals(2, 5));
      this.assertIdentical(model.getItem(2), manager.getFocused());

      // without its model the position stays within the rows and takes the model there
      let removal = changed();
      model.removeAt(2);
      model.removeAt(2);
      await removal;
      this.assertTrue(manager.getFocusedPosition().equals(1, 5));
      this.assertIdentical(model.getItem(1), manager.getFocused());

      let clearing = changed();
      model.removeAll();
      await clearing;
      this.assertNull(manager.getFocusedPosition());
      this.assertNull(manager.getFocused());
    },

    async testSelectAtPerMode() {
      const Model = qxl.datagrid.demo.perf.PerfModel;
      const Position = qxl.datagrid.source.Position;
      let model = new qx.data.Array(Array.from({ length: 10 }, (_, i) => new Model(i)));
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      let columns = new qxl.datagrid.column.Columns();
      columns.add(new qxl.datagrid.column.TextColumn("name"));
      columns.add(new qxl.datagrid.column.TextColumn("remark"));
      dataSource.setColumns(columns);
      let sized = new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve));
      dataSource.setModel(model);
      await sized;
      let manager = new qxl.datagrid.ui.SelectionManager();
      manager.setDataSource(dataSource);
      const select = (row, action, modifiers) => manager.selectAt(new Position(row, 0), action, modifiers);
      const rows = () =>
        manager
          .getSelection()
          .toArray()
          .map(item => model.indexOf(item))
          .sort((a, b) => a - b);

      // "single": moves follow, Ctrl moves only the focus, Ctrl+Space and a click switch the row
      select(1, "move");
      manager.selectAt(new Position(1, 1), "move");
      this.assertArrayEquals([1], rows(), "a move within the row keeps the selection");
      select(4, "move", { ctrl: true });
      this.assertArrayEquals([1], rows());
      select(4, "space", { ctrl: true });
      this.assertArrayEquals([4], rows());
      select(4, "space", { ctrl: true });
      this.assertArrayEquals([], rows());
      select(2, "tap");
      select(2, "tap");
      this.assertArrayEquals([], rows(), "a click on the selected row unselects it, as before");

      // "one" cannot be emptied
      manager.setSelectionMode("one");
      select(3, "space", { ctrl: true });
      select(3, "space", { ctrl: true });
      this.assertArrayEquals([3], rows());

      // "multi": a move replaces, Shift selects from the anchor, Ctrl+Shift adds the range
      manager.setSelectionMode("multi");
      select(5, "move");
      select(7, "move", { shift: true });
      this.assertArrayEquals([5, 6, 7], rows());
      select(6, "move", { shift: true });
      this.assertArrayEquals([5, 6], rows());
      select(9, "move", { ctrl: true });
      select(8, "move", { ctrl: true, shift: true });
      this.assertArrayEquals([5, 6, 8, 9], rows());
      select(0, "tap", { ctrl: true });
      this.assertArrayEquals([0, 5, 6, 8, 9], rows());
      select(2, "tap", { shift: true });
      this.assertArrayEquals([0, 1, 2], rows());

      // "additive": moves only move the focus, Shift is ignored, the space bar and a click switch
      manager.setSelectionMode("additive");
      select(4, "move");
      this.assertArrayEquals([0, 1, 2], rows());
      select(4, "space");
      select(1, "tap", { shift: true });
      this.assertArrayEquals([0, 2, 4], rows());
      this.assertTrue(manager.selectAll());
      this.assertEquals(10, manager.getSelection().getLength());
      manager.setSelectionMode("single");
      this.assertFalse(manager.selectAll());

      // "area": the range reaches from the anchor
      manager.setSelectionStyle("area");
      select(1, "move");
      manager.selectAt(new Position(3, 1), "move", { shift: true });
      let range = manager.getSelectionRange();
      this.assertTrue(range.getStart().equals(1, 0) && range.getEnd().equals(3, 1), `range ${range.getStart()} - ${range.getEnd()}`);
    },

    /**
     * The selection holds every model, so a data source loading on demand (like the big grid demo) is
     * only selected where it has loaded; like the demo, the anchor stays behind when Ctrl+End jumps
     * and loads the last rows
     */
    async testUnavailableRangesAreNotSelected() {
      const Position = qxl.datagrid.source.Position;
      let dataSource = new qxl.datagrid.demo.biggrid.DummyDataSource(100, 100);
      let manager = new qxl.datagrid.ui.SelectionManager();
      manager.set({ dataSource, selectionStyle: "cell", selectionMode: "multi" });
      const select = (row, modifiers) => manager.selectAt(new Position(row, 0), "move", modifiers);
      const load = (fromRow, toRow) => dataSource.makeAvailable(new qxl.datagrid.source.Range([fromRow, 0], [toRow, 9]));

      await load(0, 4);
      select(0);
      let selected = manager.getSelection().toArray();
      await load(90, 99);
      select(95, { shift: true });
      this.assertArrayEquals(selected, manager.getSelection().toArray(), "a range from an anchor no longer loaded");
      this.assertFalse(manager.selectAll());
      this.assertArrayEquals(selected, manager.getSelection().toArray());
      select(92);
      select(94, { shift: true });
      this.assertEquals(3, manager.getSelection().getLength(), "a range within the loaded rows");

      // a selected model is not disposed while scrolled away and comes back as the same object
      let held = manager.getSelection().getItem(0);
      let heldPosition = dataSource.getPositionOfModel(held);
      await load(0, 4);
      await load(90, 99);
      this.assertFalse(held.isDisposed());
      this.assertIdentical(held, dataSource.getModelForPosition(heldPosition));
      this.assertTrue(manager.isSelected(dataSource.getModelForPosition(heldPosition)));

      manager.setSelectionStyle("area");
      await load(0, 4);
      select(0);
      await load(90, 99);
      select(95, { shift: true });
      let range = manager.getSelectionRange();
      this.assertTrue(range.getStart().equals(0, 0) && range.getEnd().equals(0, 0), `range ${range.getStart()} - ${range.getEnd()}`);
      this.assertEquals(1, manager.getSelection().getLength());
      this.assertFalse(manager.selectAll());
    }
  }
});
