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

/**
 * Sorting by columns: the states of a click, the comparison and the sorted rows of `ArrayDataSource`
 */
qx.Class.define("qxl.datagrid.test.column.Sorting", {
  extend: qx.dev.unit.TestCase,

  members: {
    /**
     * Creates sortable columns for the paths
     *
     * @param {String[]} paths
     * @return {qxl.datagrid.column.Columns}
     */
    __createColumns(paths) {
      let columns = new qxl.datagrid.column.Columns();
      for (let path of paths) {
        columns.add(new qxl.datagrid.column.TextColumn(path).set({ sortable: true }));
      }
      return columns;
    },

    testToggleSort() {
      let columns = this.__createColumns(["a", "b", "c"]);
      let [a, b, c] = columns.toArray();
      let fired = 0;
      columns.addListener("changeSort", () => fired++);

      // a click: ascending, descending, unsorted; the other columns are reset
      columns.toggleSort(a);
      this.assertEquals("asc", a.getSortOrder());
      columns.toggleSort(a);
      this.assertEquals("desc", a.getSortOrder());
      columns.toggleSort(a);
      this.assertNull(a.getSortOrder());
      this.assertEquals(3, fired, "one change per click");

      // Shift adds criteria in order and switches between ascending and descending
      columns.toggleSort(b);
      columns.toggleSort(a, true);
      columns.toggleSort(c, true);
      columns.toggleSort(a, true);
      this.assertArrayEquals([b, a, c], columns.getSortColumns());
      this.assertEquals("desc", a.getSortOrder());

      // a click without Shift and setting sortOrder in code leave one sorted column
      columns.toggleSort(c);
      this.assertArrayEquals([c], columns.getSortColumns());
      this.assertEquals("desc", c.getSortOrder());
      columns.toggleSort(a, true);
      b.setSortOrder("asc");
      this.assertArrayEquals([b], columns.getSortColumns());
    },

    testCompareValues() {
      const compare = qxl.datagrid.column.Columns.compareValues;
      let values = ["Type 10", null, "Type 2", "", "type 1"];
      this.assertArrayEquals(["type 1", "Type 2", "Type 10", null, ""], [...values].sort((x, y) => compare(x, y)));
      this.assertArrayEquals(["Type 10", "Type 2", "type 1", null, ""], [...values].sort((x, y) => compare(x, y, -1)), "empty values stay last");
      this.assertTrue(compare(2, 10) < 0);
      this.assertTrue(compare(new Date(2026, 0, 2), new Date(2026, 0, 1)) > 0);
      this.assertTrue(compare(false, true) < 0);

      let select = new qxl.datagrid.column.SelectColumn("icon", [
        { label: "Bus", model: "z" },
        { label: "Car", model: "a" }
      ]);
      let model = new qxl.datagrid.demo.perf.PerfModel(0).set({ icon: "z" });
      this.assertEquals("Bus", select.getSortValue(model));
    },

    async testArrayDataSourceSorts() {
      const PerfModel = qxl.datagrid.demo.perf.PerfModel;
      let columns = this.__createColumns(["weight", "name"]);
      let [weight, name] = columns.toArray();
      let items = [5, 1, 3, 1, 4].map((value, i) => new PerfModel(i).set({ weight: value }));
      let model = new qx.data.Array(items);
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      dataSource.setColumns(columns);
      let sized = new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve));
      dataSource.setModel(model);
      await sized;
      const rows = () => Array.from({ length: dataSource.getSize().getRow() }, (_, row) => dataSource.getModelForPosition(new qxl.datagrid.source.Position(row, 0)));

      this.assertArrayEquals(items, rows(), "unsorted: the order of the array");
      columns.toggleSort(weight);
      columns.toggleSort(name, true);
      columns.toggleSort(name, true);
      // weight ascending, equal weights by name descending: "Vehicle type 4" before "Vehicle type 2"
      this.assertArrayEquals([items[3], items[1], items[2], items[4], items[0]], rows());
      for (let item of items) {
        this.assertIdentical(item, dataSource.getModelForPosition(dataSource.getPositionOfModel(item)));
      }
      this.assertArrayEquals([5, 1, 3, 1, 4], model.toArray().map(item => item.getWeight()), "the array stays as it is");

      // after changes of the array the rows are sorted again, a removed model is gone at once
      model.push(new PerfModel(9).set({ weight: 0 }));
      model.remove(items[0]);
      this.assertFalse(dataSource.isModelValid(items[0]));
      this.assertEquals(0, rows()[0].getWeight());
      // values changed by editing do not move the row until sort() is called
      items[4].setWeight(-1);
      this.assertEquals(0, rows()[0].getWeight());
      dataSource.sort();
      this.assertIdentical(items[4], rows()[0]);
    }
  }
});
