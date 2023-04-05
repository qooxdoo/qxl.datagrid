qx.Class.define("qxl.datagrid.test.source.Range", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testIterator() {
      let range = new qxl.datagrid.source.Range([2, 3], [4, 5]);

      const toString = iter => {
        let str = "";
        for (let pos of iter) {
          if (str.length > 0) {
            str += " ";
          }
          str += pos.getRow() + ":" + pos.getColumn();
        }
        return str;
      };
      let str = toString(range.iterator());
      this.assertTrue(str == "2:3 2:4 2:5 3:3 3:4 3:5 4:3 4:4 4:5");

      let exclude = new qxl.datagrid.source.Range([3, 4], [7, 7]);
      str = toString(range.iteratorExcept(exclude));
      this.assertTrue(str == "2:3 2:4 2:5 3:3 4:3");

      exclude = new qxl.datagrid.source.Range([1, 1], [3, 4]);
      str = toString(range.iteratorExcept(exclude));
      this.assertTrue(str == "2:5 3:5 4:3 4:4 4:5");
    },

    testContains() {
      let range = new qxl.datagrid.source.Range([2, 3], [4, 5]);

      this.assertTrue(range.contains(new qxl.datagrid.source.Position(2, 3)));
      this.assertTrue(!range.contains(new qxl.datagrid.source.Position(1, 3)));
      this.assertTrue(!range.contains(new qxl.datagrid.source.Position(2, 2)));
      this.assertTrue(range.contains(new qxl.datagrid.source.Position(4, 5)));
      this.assertTrue(!range.contains(new qxl.datagrid.source.Position(5, 5)));
      this.assertTrue(!range.contains(new qxl.datagrid.source.Position(4, 6)));
    }
  }
});
