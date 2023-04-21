/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2023 Zenesis Limited https://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * John Spackman (@johnspackman)

************************************************************************ */

/**
 * This is the main application class of "qxl.datagrid"
 *
 * @asset(qxl/datagrid/*)
 */
qx.Class.define("qxl.datagrid.demo.Application", {
  extend: qx.application.Standalone,

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members: {
    async main() {
      super.main();

      if (qx.core.Environment.get("qx.debug")) {
        qx.log.appender.Native;
        qx.log.appender.Console;
      }
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.source.Position);
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.source.Range);
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.util.Labels);
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.column.FilteredColumns);
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.source.TreeDataSource);
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.ui.GridSizeCalculator);
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.ui.DataGrid);

      let dataSource = new qxl.datagrid.test.ui.DummyDataSource(1000000, 10000);
      let columns = new qxl.datagrid.column.Columns();
      for (let columnIndex = 0; columnIndex < dataSource.getNumColumns(); columnIndex++) {
        let column = new qxl.datagrid.column.TextColumn().set({
          caption: qxl.datagrid.util.Labels.getColumnLetters(columnIndex),
          path: "label",
          minWidth: 80
        });
        columns.add(column);
      }
      let grid = new qxl.datagrid.DataGrid(columns).set({
        dataSource: dataSource
      });
      let doc = this.getRoot();
      doc.add(grid, { left: 10, top: 10, right: 10, bottom: 10 });
    }
  }
});
