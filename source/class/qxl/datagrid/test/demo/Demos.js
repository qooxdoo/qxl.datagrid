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
 * Smoke tests of the demos: each one renders, scrolls and shows the cells of its data source
 */
qx.Class.define("qxl.datagrid.test.demo.Demos", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testArrayDemo() {
      await this.__checkDemo(new qxl.datagrid.demo.array.ArrayDemo());
    },

    async testTreeDemo() {
      let demo = new qxl.datagrid.demo.tree.TreeDemo();
      await this.__checkDemo(demo, async grid => {
        // the tree loads its nodes from a JSON file
        for (let i = 0; i < 50 && grid.getDataSource().getSize().getRow() == 0; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      });
    },

    async testBigGridDemo() {
      await this.__checkDemo(new qxl.datagrid.demo.biggrid.BigGridDemo());
    },

    /**
     * Renders a demo, checks the cells on display, scrolls down and checks them again
     *
     * @param {qx.ui.core.Widget} demo the demo, it is disposed afterwards
     * @param {Function?} waitForData async function `(grid)` to wait until the data has been loaded
     */
    async __checkDemo(demo, waitForData) {
      let root = qx.core.Init.getApplication().getRoot();
      root.add(demo, { left: 0, top: 0, width: "60%", height: "60%" });
      let grid = demo.getQxObject("grid");
      try {
        // like qxl.datagrid.demo.Demo, which calls init() after adding a demo
        if (typeof demo.init == "function") {
          await demo.init();
        }
        await this.__settle(grid);
        if (waitForData) {
          await waitForData(grid);
          await this.__settle(grid);
        }
        this.__assertCells(grid);

        if (grid instanceof qxl.datagrid.VirtualScrollDataGrid) {
          grid.setStartRowIndex(Math.min(500, grid.getDataSource().getSize().getRow() - 1));
        } else {
          grid.scrollToY(1000);
        }
        await this.__settle(grid);
        this.__assertCells(grid);
      } finally {
        demo.destroy();
      }
    },

    /**
     * Waits until the grid has been rendered and its data has been made available
     *
     * @param {qxl.datagrid.DataGrid} grid
     */
    async __settle(grid) {
      for (let i = 0; i < 20; i++) {
        qx.ui.core.queue.Manager.flush();
        await new Promise(resolve => setTimeout(resolve, 20));
        if (!grid._updatingPromise) {
          break;
        }
      }
      qx.ui.core.queue.Manager.flush();
    },

    /**
     * Asserts that there are cells and each one is bound to the model at its position
     *
     * @param {qxl.datagrid.DataGrid} grid
     */
    __assertCells(grid) {
      let pane = grid.getQxObject("widgetPane");
      let factory = grid.getQxObject("paneWidgetFactory");
      let cells = pane._getChildren().filter(child => child.getUserData("qxl.datagrid.cellData"));
      this.assertTrue(cells.length > 0, "cells on display");
      for (let cell of cells) {
        let position = pane.getPositionOfChild(cell);
        this.assertIdentical(grid.getDataSource().getModelForPosition(position), factory.getModelForWidget(cell), `model of cell ${position}`);
      }
    }
  }
});
