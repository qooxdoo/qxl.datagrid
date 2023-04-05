qx.Class.define("qxl.datagrid.test.source.Position", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testConstructor() {
      let p = new qxl.datagrid.source.Position(1, 2);
      this.assertTrue(p.getRow() == 1);
      this.assertTrue(p.getColumn() == 2);

      p = new qxl.datagrid.source.Position({ row: 3, column: 4 });
      this.assertTrue(p.getRow() == 3);
      this.assertTrue(p.getColumn() == 4);

      p = new qxl.datagrid.source.Position([5, 6]);
      this.assertTrue(p.getRow() == 5);
      this.assertTrue(p.getColumn() == 6);

      p.increment(1, 1);
      this.assertTrue(p.getRow() == 6);
      this.assertTrue(p.getColumn() == 7);
    }
  }
});
