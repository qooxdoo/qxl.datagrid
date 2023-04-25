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
    /**
     * @override
     */
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

      let doc = this.getRoot();
      let tv = new qx.ui.tabview.TabView();
      doc.add(tv, { left: 0, top: 0, right: 0, bottom: 0 });

      let storage = qx.bom.Storage.getSession();
      let lastPageId = storage.getItem(this.classname + ".lastPageId") || null;

      tv.add(this.getQxObject("pgBigGridDemo"));
      tv.add(this.getQxObject("pgTreeDemo"));
      if (lastPageId) {
        let page = this.getQxObject(lastPageId);
        if (page) {
          tv.setSelection([page]);
        }
      }

      tv.addListener("changeSelection", evt => {
        let page = tv.getSelection()[0] || null;
        let id = page.getQxObjectId();
        storage.setItem(this.classname + ".lastPageId", id);
      });
    },

    /**
     * @override
     */
    _createQxObjectImpl(id) {
      switch (id) {
        case "pgBigGridDemo":
          var page = new qx.ui.tabview.Page("Big Grid Demo");
          page.setLayout(new qx.ui.layout.Grow());
          page.addListenerOnce("appear", async () => {
            let demo = new qxl.datagrid.demo.biggrid.BigGridDemo();
            page.add(demo);
            await demo.init();
          });
          return page;

        case "pgTreeDemo":
          var page = new qx.ui.tabview.Page("Tree Demo");
          page.setLayout(new qx.ui.layout.Grow());
          page.addListenerOnce("appear", async () => {
            let demo = new qxl.datagrid.demo.tree.TreeDemo();
            page.add(demo);
            await demo.init();
          });
          return page;
      }
      return super._createQxObjectImpl(id);
    }
  }
});
