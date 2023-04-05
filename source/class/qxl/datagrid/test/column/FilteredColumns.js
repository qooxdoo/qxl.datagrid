qx.Class.define("qxl.datagrid.test.column.FilteredColumns", {
  extend: qx.dev.unit.TestCase,

  members: {
    testInsert() {
      let src = new qxl.datagrid.column.Columns();
      let columns = [new qxl.datagrid.column.TextColumn("a"), new qxl.datagrid.column.TextColumn("b"), new qxl.datagrid.column.TextColumn("c"), new qxl.datagrid.column.TextColumn("d")];
      src.add(columns[2]);
      src.insertBefore(columns[0], columns[2]);
      src.insertAfter(columns[1], columns[0]);
      let arr = [];
      for (let column of src) {
        arr.push(column);
      }
      this.assertArrayEquals([columns[0], columns[1], columns[2]], arr);

      src.remove(columns[1]);
      arr = [];
      for (let column of src) arr.push(column);
      this.assertArrayEquals(arr, [columns[0], columns[2]]);
    },

    testSort() {
      let src = new qxl.datagrid.column.Columns();
      let columns = [
        new qxl.datagrid.column.TextColumn("a"),
        new qxl.datagrid.column.TextColumn("b"),
        new qxl.datagrid.column.TextColumn("c"),
        new qxl.datagrid.column.TextColumn("d"),
        new qxl.datagrid.column.TextColumn("e"),
        new qxl.datagrid.column.TextColumn("f")
      ];
      for (let column of columns) {
        src.add(column);
      }

      let filtered = new qxl.datagrid.column.FilteredColumns(src);
      filtered.addRange(2, 5);
      let arr = [];
      for (let column of filtered) arr.push(column);
      this.assertArrayEquals(arr, [columns[2], columns[3], columns[4]]);

      filtered.sort((a, b) => {
        a = a.getPath();
        b = b.getPath();
        return a < b ? 1 : a > b ? -1 : 0;
      });
      arr = [];
      for (let column of filtered) arr.push(column);
      this.assertArrayEquals(arr, [columns[4], columns[3], columns[2]]);

      arr = [];
      for (let column of src) arr.push(column);
      this.assertArrayEquals(arr, [columns[0], columns[1], columns[2], columns[3], columns[4], columns[5]]);
    }
  }
});
