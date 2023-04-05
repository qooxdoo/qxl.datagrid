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
qx.Class.define("qxl.datagrid.Application", {
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
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.column.FilteredColumns);
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.source.TreeDataSource);
      await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.ui.GridSizes);
    }
  }
});
