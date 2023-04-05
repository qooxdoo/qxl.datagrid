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

qx.Class.define("qxl.datagrid.test.source.TreeDataSource", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testOnDemand() {
      let model = qx.data.marshal.Json.createModel({
        name: "root",
        children: [
          { name: "alpha" },
          { name: "bravo" },
          {
            name: "charlie",
            children: [
              { name: "charlie-one" },
              {
                name: "charlie-two",
                children: [{ name: "charlie-two-one" }, { name: "charlie-two-two" }]
              }
            ]
          }
        ]
      });

      let inspector = new qxl.datagrid.source.tree.NodeInspector().set({
        childrenPath: "children"
      });
      let columns = new qxl.datagrid.column.Columns();
      columns.add(new qxl.datagrid.column.TextColumn("name"));

      let ds = new qxl.datagrid.source.tree.TreeDataSource(() => inspector, columns);
      ds.setRoot(model);
      await ds.flushQueue();

      const testValue = (row, expected) => {
        let pos = new qxl.datagrid.source.Position(row, 0);
        let actual = ds.getValueAt(pos);
        this.assertTrue(expected == actual);
      };

      testValue(0, "alpha");
      testValue(2, "charlie");
      testValue(3, null);
      await ds.expandNode(ds.getNode(2));
      testValue(3, "charlie-one");
    }
  }
});
