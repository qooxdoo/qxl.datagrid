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
     * Will Johnson (willsterjohnson)

************************************************************************ */

/**
 * This is the demo application class of "qxl.datagrid"
 *
 * @asset(qxl/datagrid/*)
 */
qx.Class.define("qxl.datagrid.demo.Demo", {
  extend: qx.ui.tabview.TabView,

  /**
   * @override
   */
  construct() {
    super();

    if (qx.core.Environment.get("qx.debug")) {
      qx.log.appender.Native;
      qx.log.appender.Console;
    }

    let storage = qx.bom.Storage.getSession();
    let lastPageId = storage.getItem(this.classname + ".lastPageId") || null;

    this.add(this.getQxObject("pgArrayDemo"));
    this.add(this.getQxObject("pgTreeDemo"));
    this.add(this.getQxObject("pgBigGridDemo"));
    if (lastPageId) {
      let page = this.getQxObject(lastPageId);
      if (page) {
        this.setSelection([page]);
      }
    }

    this.addListener("changeSelection", evt => {
      let page = this.getSelection()[0] || null;
      let id = page.getQxObjectId();
      storage.setItem(this.classname + ".lastPageId", id);
    });
  },

  members: {
    /**
     * @override
     */
    _createQxObjectImpl(id) {
      switch (id) {
        case "pgArrayDemo":
          const arrayPage = new qx.ui.tabview.Page("Array Demo");
          arrayPage.setLayout(new qx.ui.layout.Grow());
          arrayPage.addListenerOnce("appear", async () => {
            let demo = new qxl.datagrid.demo.array.ArrayDemo();
            arrayPage.add(demo);
            await demo.init();
          });
          return arrayPage;

        case "pgTreeDemo":
          const treePage = new qx.ui.tabview.Page("Tree Demo");
          treePage.setLayout(new qx.ui.layout.Grow());
          treePage.addListenerOnce("appear", async () => {
            let demo = new qxl.datagrid.demo.tree.TreeDemo();
            treePage.add(demo);
            await demo.init();
          });
          return treePage;

        case "pgBigGridDemo":
          const bigGridPage = new qx.ui.tabview.Page("Big Grid Demo");
          bigGridPage.setLayout(new qx.ui.layout.Grow());
          bigGridPage.addListenerOnce("appear", async () => {
            let demo = new qxl.datagrid.demo.biggrid.BigGridDemo();
            bigGridPage.add(demo);
            await demo.init();
          });
          return bigGridPage;
      }
      return super._createQxObjectImpl(id);
    }
  }
});
