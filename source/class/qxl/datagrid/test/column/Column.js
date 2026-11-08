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

qx.Class.define("qxl.datagrid.test.column.Column", {
  extend: qx.dev.unit.TestCase,

  members: {
    testEffectiveStates() {
      let column = new qxl.datagrid.column.TextColumn("name");
      let events = [];
      column.addListener("changeEffectivelyEnabled", evt => events.push(["enabled", evt.getData()]));
      column.addListener("changeEffectivelyReadOnly", evt => events.push(["readOnly", evt.getData()]));
      const states = () => [column.isEffectivelyEnabled(), column.isEffectivelyReadOnly()];

      // without a datagrid only the column counts
      this.assertArrayEquals([true, false], states());
      column.setReadOnly(true);
      this.assertArrayEquals([true, true], states());
      column.setReadOnly(false);
      column.setEnabled(false);
      this.assertArrayEquals([false, true], states());
      column.setEnabled(true);

      let columns = new qxl.datagrid.column.Columns();
      columns.add(column);
      let grid = new qxl.datagrid.VirtualScrollDataGrid(columns);
      this.assertArrayEquals([true, false], states());

      events = [];
      grid.setEnabled(false);
      this.assertArrayEquals([false, true], states());
      this.assertJsonEquals(
        [
          ["enabled", false],
          ["readOnly", true]
        ],
        events
      );

      grid.setEnabled(true);
      grid.setReadOnly(true);
      this.assertArrayEquals([true, true], states());

      // removing the column from the grid must not fail and makes it independent again
      grid.setColumns(null);
      this.assertArrayEquals([true, false], states());
      grid.dispose();
    },

    testBindValueLikeBinding() {
      const Model = qx.Class.define(null, {
        extend: qx.core.Object,
        properties: {
          name: { init: null, nullable: true, event: "changeName" },
          child: { init: null, nullable: true, event: "changeChild" }
        }
      });
      let model = new Model().set({ name: "a" });
      let column = new qxl.datagrid.column.TextColumn("name");
      let updates = [];
      column.setBindingOptions(() => ({
        converter: value => (value === undefined ? "?" : "[" + value + "]"),
        onUpdate: (source, target, value) => updates.push(value)
      }));
      let label = new qx.ui.basic.Label();
      let bindings = column.bindWidget(label, model, null);
      this.assertEquals("[a]", label.getValue());
      model.setName("b");
      this.assertEquals("[b]", label.getValue());
      this.assertArrayEquals(["[a]", "[b]"], updates);
      bindings.dispose();
      model.setName("c");
      this.assertEquals("[b]", label.getValue(), "no update after unbinding");

      // a chain is bound with model.bind and still follows the child
      let child = new Model().set({ name: "x" });
      let parent = new Model().set({ child });
      column = new qxl.datagrid.column.TextColumn("child.name");
      bindings = column.bindWidget(label, parent, null);
      this.assertEquals("x", label.getValue());
      parent.setChild(new Model().set({ name: "y" }));
      this.assertEquals("y", label.getValue());
      bindings.dispose();
    }
  }
});
