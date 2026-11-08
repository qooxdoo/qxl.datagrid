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
        await this.__checkTreeKeys(grid);
        await this.__checkTreeSorting(grid);
      });
    },

    /**
     * Sorts the tree by name: siblings are sorted on each level, open nodes stay open, nodes opened
     * later bring their children sorted, and without sorting the order of the node inspector returns
     *
     * @param {qxl.datagrid.DataGrid} grid a grid on a tree data source, with the name column first
     */
    async __checkTreeSorting(grid) {
      let dataSource = grid.getDataSource();
      let nameColumn = grid.getColumns().getColumn(0);
      const rows = () => Array.from({ length: dataSource.getSize().getRow() }, (_, row) => dataSource.getModelForPosition(new qxl.datagrid.source.Position(row, 0)));
      const stateOf = node => dataSource.getNodeStateFor(node).state;
      const topLevel = () => rows().filter(node => dataSource.getNodeStateFor(node).level == 0);
      const assertSorted = direction => {
        let namesByParent = new Map();
        for (let node of rows()) {
          let parent = dataSource.getParentOf(node);
          if (!namesByParent.has(parent)) {
            namesByParent.set(parent, []);
          }
          namesByParent.get(parent).push(node.getName());
        }
        for (let names of namesByParent.values()) {
          for (let i = 1; i < names.length; i++) {
            this.assertTrue(qxl.datagrid.column.Columns.compareValues(names[i - 1], names[i], direction) <= 0, `${names[i - 1]} before ${names[i]}`);
          }
        }
      };
      let original = topLevel();
      let opened = original.find(node => stateOf(node) == "closed");
      await dataSource.expandNode(opened);

      grid.getColumns().toggleSort(nameColumn);
      await dataSource.flushQueue();
      assertSorted(1);
      this.assertEquals("open", stateOf(opened), "an open node stays open");
      let later = rows().find(node => stateOf(node) == "closed");
      await dataSource.expandNode(later);
      assertSorted(1);

      grid.getColumns().toggleSort(nameColumn);
      await dataSource.flushQueue();
      assertSorted(-1);
      grid.getColumns().toggleSort(nameColumn);
      await dataSource.flushQueue();
      this.assertArrayEquals(original, topLevel(), "without sorting the order of the inspector returns");
    },

    /**
     * Opens and closes a node with the keys of `qx.ui.tree.Tree`: Right, Left, Enter, and Left on a
     * child moves to its parent
     *
     * @param {qxl.datagrid.DataGrid} grid a grid on a tree data source, with the expansion column first
     */
    async __checkTreeKeys(grid) {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let dataSource = grid.getDataSource();
      const stateAt = row => dataSource.getNodeStateFor(dataSource.getModelForPosition(new qxl.datagrid.source.Position(row, 0))).state;
      const until = async condition => {
        for (let i = 0; i < 50 && !condition(); i++) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        this.assertTrue(condition());
      };
      let row = 0;
      while (stateAt(row) != "closed") {
        row++;
      }
      grid.focus();
      grid.setFocusedPosition(row, 0);
      press("Right");
      await until(() => stateAt(row) == "open");
      this.assertTrue(grid.getFocusedPosition().equals(row, 0), "the focus stays on the node");
      press("Down");
      press("Left");
      this.assertTrue(grid.getFocusedPosition().equals(row, 0), "Left on a child moves to the parent");
      press("Left");
      await until(() => stateAt(row) == "closed");
      press("Enter");
      await until(() => stateAt(row) == "open");
      press("Enter");
      await until(() => stateAt(row) == "closed");
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
