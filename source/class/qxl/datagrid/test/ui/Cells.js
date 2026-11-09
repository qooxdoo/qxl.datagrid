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
 * How the columns show their values in a rendered grid with the theme of the tests
 *
 * @asset(qxl/datagrid/test/*)
 */
qx.Class.define("qxl.datagrid.test.ui.Cells", {
  extend: qx.dev.unit.TestCase,

  members: {
    /** @type {qxl.datagrid.VirtualScrollDataGrid} */
    __grid: null,

    /**
     * Creates and renders a grid
     *
     * @param {qxl.datagrid.column.Column[]} columnList the columns
     * @param {Object[]} data the rows, as plain objects which become models
     * @return {Promise<qxl.datagrid.VirtualScrollDataGrid>}
     */
    async __createGrid(columnList, data) {
      let columns = new qxl.datagrid.column.Columns();
      columnList.forEach(column => columns.add(column));
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      dataSource.setColumns(columns);
      let grid = (this.__grid = new qxl.datagrid.VirtualScrollDataGrid(columns).set({ width: 500, height: 200 }));
      grid.setDataSource(dataSource);
      qx.core.Init.getApplication().getRoot().add(grid, { left: 0, top: 0 });
      let sized = new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve));
      dataSource.setModel(qx.data.marshal.Json.createModel(data));
      await sized;
      qx.ui.core.queue.Manager.flush();
      return grid;
    },

    /**
     * Returns the widget of a cell on display
     *
     * @param {Integer} row
     * @param {Integer} column
     * @return {qx.ui.core.Widget}
     */
    __getCell(row, column) {
      return this.__grid.getQxObject("widgetPane").getChildAtPosition(row, column);
    },

    tearDown() {
      this.__grid?.destroy();
      this.__grid = null;
    },

    async testNumbersAlignRight() {
      let grid = await this.__createGrid(
        [new qxl.datagrid.column.TextColumn("name").set({ caption: "Name" }), new qxl.datagrid.column.NumberColumn("speed").set({ caption: "Speed" })],
        [{ name: "Car", speed: 1.5 }]
      );
      const textAlign = widget => widget.getContentElement().getDomElement().style.textAlign;
      this.assertEquals("right", textAlign(this.__getCell(0, 1)));
      this.assertEquals("", textAlign(this.__getCell(0, 0)));
      let header = grid.getQxObject("header");
      this.assertEquals("right", textAlign(header.getCell(1).getChildControl("label")));
      this.assertEquals("", textAlign(header.getCell(0).getChildControl("label")));
    },

    async testSelectWithIcons() {
      // 110×55 pixels, the theme limits icons to 20 pixels in height
      const WIDE = "qxl/datagrid/test/wide.png";
      let column = new qxl.datagrid.column.SelectColumn("kind", [
        { label: "", model: "wide", icon: WIDE },
        { label: "Bus", model: "bus", icon: "@MaterialIcons/directions_bus/16" },
        { label: "Plain", model: "plain" }
      ]);
      await this.__createGrid([column.set({ caption: "Kind", width: 120 })], [{ kind: "wide" }, { kind: "bus" }, { kind: "plain" }]);
      const iconBounds = widget => {
        let bounds = widget.getChildControl("icon").getBounds();
        return [bounds.width, bounds.height];
      };

      // only the icon, scaled down within the row
      let cell = this.__getCell(0, 0);
      this.assertEquals(WIDE, cell.getChildControl("icon").getSource());
      this.assertEquals("", cell.getChildControl("label").getValue());
      this.assertJsonEquals([40, 20], iconBounds(cell));
      this.assertEquals(22, cell.getBounds().height, "the row keeps its height");

      // icon and label with a gap, or only the label
      cell = this.__getCell(1, 0);
      this.assertEquals("Bus", cell.getChildControl("label").getValue());
      this.assertEquals(qxl.datagrid.ui.IconCell.GAP, cell.getChildControl("icon").getMarginRight());
      this.assertTrue(cell.getChildControl("label").getBounds().left > 16);
      cell = this.__getCell(2, 0);
      this.assertNull(cell.getChildControl("icon").getSource());
      this.assertEquals("Plain", cell.getChildControl("label").getValue());
      this.assertEquals(0, cell.getChildControl("label").getBounds().left);

      // the editor shows icon and label in its items and in the box, with the size of the cells
      let box = column.createWidgetForEdit();
      qx.core.Init.getApplication().getRoot().add(box, { left: 0, top: 250 });
      column.setEditorValue(box, "wide");
      qx.ui.core.queue.Manager.flush();
      let items = box.getChildren();
      this.assertEquals(WIDE, items[0].getIcon());
      this.assertEquals("Bus", items[1].getLabel());
      this.assertJsonEquals([40, 20], [items[0].getChildControl("icon").getSizeHint().width, items[0].getChildControl("icon").getSizeHint().height]);
      this.assertJsonEquals([40, 20], iconBounds(box.getChildControl("atom")));
      box.destroy();

      // sorting and the clipboard still use the label
      this.assertEquals("Bus", column.getSortValue(qx.data.marshal.Json.createModel({ kind: "bus" })));
      this.assertEquals("Bus", column.formatForClipboard("bus"));
    }
  }
});
