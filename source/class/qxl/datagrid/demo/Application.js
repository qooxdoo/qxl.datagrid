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
 * This is the demo application class of "qxl.datagrid"
 *
 * @asset(qxl/datagrid/*)
 */
qx.Class.define("qxl.datagrid.demo.Application", {
  extend: qx.application.Standalone,

  members: {
    /**
     * @override
     */
    async main() {
      super.main();

      if (qx.core.Environment.get("qx.debug")) {
        qx.log.appender.Native;
        qx.log.appender.Console;
      }
      // await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.source.Position);
      // await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.source.Range);
      // await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.util.Labels);
      // await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.column.FilteredColumns);
      // await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.source.TreeDataSource);
      // await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.ui.GridSizeCalculator);
      // await qxl.datagrid.test.TestRunner.runAll(qxl.datagrid.test.ui.DataGrid);

      let doc = this.getRoot();
      try {
        if (new URLSearchParams(window.location.search).has("perf")) {
          let perf = new qxl.datagrid.demo.perf.PerfDemo();
          doc.add(perf, { left: 0, top: 0, right: 0, bottom: 0 });
          await perf.init();
          return;
        }
        doc.add(new qxl.datagrid.demo.Demo(), { left: 0, top: 0, right: 0, bottom: 0 });
      } catch (ex) {
        // main() is async, so without this an exception is swallowed and leaves a blank page
        // eslint-disable-next-line no-console
        console.error("Failed to start the qxl.datagrid demo", ex);
        let label = new qx.ui.basic.Label("Failed to start the demo: " + ex).set({ rich: true, padding: 20, textColor: "red" });
        doc.add(label, { left: 0, top: 0, right: 0 });
      }
    }
  }
});
