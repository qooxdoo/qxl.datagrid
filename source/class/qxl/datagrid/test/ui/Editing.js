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
 * Editing in a rendered virtual grid with the 13 typed columns of the performance page
 */
qx.Class.define("qxl.datagrid.test.ui.Editing", {
  extend: qx.dev.unit.TestCase,

  members: {
    /** @type {qxl.datagrid.VirtualScrollDataGrid} */
    __grid: null,

    /** @type {qx.data.Array} */
    __model: null,

    /** @type {Object[]} fired `cellValueChanged` data */
    __changes: null,

    async setUp() {
      const PerfModel = qxl.datagrid.demo.perf.PerfModel;
      let columns = new qxl.datagrid.column.Columns();
      for (let [path, kind] of qxl.datagrid.demo.perf.PerfDemo.COLUMNS) {
        let column;
        if (kind == "number") {
          column = new qxl.datagrid.column.NumberColumn(path).set({ numberFormat: new qx.util.format.NumberFormat("en").set({ maximumFractionDigits: 1 }) });
        } else if (kind == "bool") {
          column = new qxl.datagrid.column.BooleanColumn(path);
        } else if (kind == "select") {
          column = new qxl.datagrid.column.SelectColumn(
            path,
            PerfModel.ICONS.map(name => ({ label: name, model: name }))
          );
        } else {
          column = new qxl.datagrid.column.TextColumn(path);
        }
        columns.add(column.set({ caption: path, minWidth: 90 }));
      }
      let dataSource = new qxl.datagrid.source.ArrayDataSource();
      dataSource.setColumns(columns);
      let grid = (this.__grid = new qxl.datagrid.VirtualScrollDataGrid(columns).set({ width: 700, height: 300, editable: true }));
      grid.setDataSource(dataSource);
      qx.core.Init.getApplication().getRoot().add(grid, { left: 0, top: 0 });
      this.__changes = [];
      grid.addListener("cellValueChanged", evt => this.__changes.push(evt.getData()));
      let sized = new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve));
      this.__model = new qx.data.Array(Array.from({ length: 200 }, (_, i) => new PerfModel(i)));
      dataSource.setModel(this.__model);
      await sized;
      qx.ui.core.queue.Manager.flush();
      grid.focus();
      qx.ui.core.queue.Manager.flush();
    },

    tearDown() {
      this.__grid.destroy();
      this.__grid = null;
    },

    /**
     * Focuses a cell, presses a key and returns the open editor
     *
     * @param {Integer} row
     * @param {Integer} column
     * @param {String?} key the key which opens the editor, default F2
     * @return {qx.ui.core.Widget?} the editor
     */
    __openEditor(row, column, key = "F2") {
      this.__grid.setFocusedPosition(row, column);
      qx.ui.core.queue.Manager.flush();
      qxl.datagrid.test.util.InputHelper.press(key);
      return this.__getEditor();
    },

    /**
     * @return {qx.ui.core.Widget?} the editor on the pane, if any
     */
    __getEditor() {
      let pane = this.__grid.getQxObject("widgetPane");
      return pane._getChildren().find(child => !child.getUserData("qxl.datagrid.cellData")) || null;
    },

    testTextWithEnterAndEscape() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let editor = this.__openEditor(0, 1);
      this.assertInstance(editor, qx.ui.form.TextField);
      this.assertEquals("Fahrzeugart 1", editor.getValue());
      let cell = grid.getQxObject("widgetPane").getChildAtPosition(0, 1);
      this.assertJsonEquals(cell.getBounds(), editor.getBounds(), "editor covers the cell");
      this.assertTrue(qx.ui.core.FocusHandler.getInstance().isFocused(editor));

      editor.setValue("Neu");
      press("Enter");
      this.assertFalse(grid.isEditing());
      this.assertEquals("Neu", this.__model.getItem(0).getStrart());
      this.assertEquals("Neu", cell.getValue());
      this.assertEquals(1, this.__changes.length);
      this.assertEquals("Fahrzeugart 1", this.__changes[0].oldValue);
      this.assertEquals(1, this.__changes[0].columnIndex);
      this.assertTrue(qx.ui.core.FocusHandler.getInstance().isFocused(grid), "the grid takes the focus back");

      editor = this.__openEditor(0, 1);
      editor.setValue("Verworfen");
      press("Escape");
      this.assertFalse(grid.isEditing());
      this.assertEquals("Neu", this.__model.getItem(0).getStrart());
      this.assertEquals(1, this.__changes.length);
    },

    testTypedCharacterStartsEditor() {
      this.__grid.setFocusedPosition(3, 1);
      qx.ui.core.queue.Manager.flush();
      qxl.datagrid.test.util.InputHelper.type("x");
      let editor = this.__getEditor();
      this.assertNotNull(editor);
      this.assertEquals("x", editor.getValue());
    },

    testRejectedValues() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let first = this.__model.getItem(0);
      let speedColumn = grid.getColumns().getColumn(5);

      // a number column rejects text and keeps the editor open
      let editor = this.__openEditor(0, 5);
      editor.setValue("abc");
      press("Enter");
      this.assertTrue(grid.isEditing());
      this.assertEquals(30, first.getMaxspeed());
      this.assertNotNull(grid.getCellError(first, speedColumn));
      this.assertFalse(editor.getValid());
      editor.setValue("120");
      press("Enter");
      this.assertFalse(grid.isEditing());
      this.assertEquals(120, first.getMaxspeed());
      this.assertNull(grid.getCellError(first, speedColumn));

      // the validator of the dialog rejects an empty name
      grid.setCellValidator((model, column, value) => (column.getPath() == "strart" && !value ? "required" : null));
      editor = this.__openEditor(0, 1);
      editor.setValue("");
      press("Enter");
      this.assertTrue(grid.isEditing());
      this.assertEquals("required", grid.getCellError(first, grid.getColumns().getColumn(1)));
      press("Escape");
      this.assertFalse(grid.isEditing());
      this.assertNull(grid.getCellError(first, grid.getColumns().getColumn(1)));
      this.assertEquals("Fahrzeugart 1", first.getStrart());
    },

    testTabTakesValueAndMovesOn() {
      let editor = this.__openEditor(0, 1);
      editor.setValue("A");
      qxl.datagrid.test.util.InputHelper.press("Tab");
      this.assertFalse(this.__grid.isEditing());
      this.assertEquals("A", this.__model.getItem(0).getStrart());
      this.assertTrue(this.__grid.getFocusedPosition().equals(0, 2));
    },

    testToggleAndReadOnly() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let first = this.__model.getItem(0);
      let kfzColumn = grid.getColumns().getColumn(8);
      this.assertFalse(first.getInkfz());

      grid.setFocusedPosition(0, 8);
      press("Space");
      this.assertTrue(first.getInkfz());
      this.assertNull(this.__getEditor(), "a boolean has no editor");
      // a typed character does not switch it
      qxl.datagrid.test.util.InputHelper.type("x");
      this.assertTrue(first.getInkfz());

      kfzColumn.setReadOnly(true);
      press("Space");
      this.assertTrue(first.getInkfz());
      kfzColumn.setReadOnly(false);

      grid.getColumns().getColumn(1).setReadOnly(true);
      this.assertNull(this.__openEditor(0, 1));
      grid.getColumns().getColumn(1).setReadOnly(false);

      grid.setEditable(false);
      this.assertNull(this.__openEditor(0, 1));
      grid.setFocusedPosition(0, 8);
      press("Space");
      this.assertTrue(first.getInkfz());
    },

    async testEditorFollowsScrolling() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let pane = grid.getQxObject("widgetPane");
      let editor = this.__openEditor(2, 1);
      editor.setValue("gescrollt");

      // far away the cell widgets are reused for other rows, the editor waits hidden
      grid.setStartRowIndex(100);
      qx.ui.core.queue.Manager.flush();
      await new Promise(resolve => setTimeout(resolve, 20));
      this.assertTrue(grid.isEditing());
      this.assertFalse(pane.isEditorOnDisplay());
      this.assertEquals("Fahrzeugart 3", this.__model.getItem(2).getStrart(), "hiding the editor takes nothing");
      this.assertTrue(qx.ui.core.FocusHandler.getInstance().isFocused(grid));

      grid.setStartRowIndex(0);
      qx.ui.core.queue.Manager.flush();
      this.assertTrue(pane.isEditorOnDisplay());
      this.assertJsonEquals(pane.getChildAtPosition(2, 1).getBounds(), editor.getBounds());
      press("F2");
      this.assertTrue(qx.ui.core.FocusHandler.getInstance().isFocused(editor));
      press("Enter");
      this.assertEquals("gescrollt", this.__model.getItem(2).getStrart());
      this.assertEquals("Fahrzeugart 2", this.__model.getItem(1).getStrart());
      this.assertEquals("Fahrzeugart 4", this.__model.getItem(3).getStrart());
      this.assertEquals("Fahrzeugart 103", this.__model.getItem(102).getStrart());
    },

    async testFocusOutsideTakesValue() {
      let outside = new qx.ui.form.TextField();
      qx.core.Init.getApplication().getRoot().add(outside, { left: 0, top: 320 });
      let editor = this.__openEditor(0, 1);
      editor.setValue("draußen");
      outside.focus();
      qx.ui.core.queue.Manager.flush();
      await new Promise(resolve => setTimeout(resolve, 20));
      this.assertFalse(this.__grid.isEditing());
      this.assertEquals("draußen", this.__model.getItem(0).getStrart());
      outside.destroy();
    },

    testSelectBox() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let first = this.__model.getItem(0);
      let editor = this.__openEditor(0, 3);
      this.assertInstance(editor, qx.ui.form.SelectBox);
      this.assertEquals(first.getIcon(), editor.getModelSelection().getItem(0));

      // with the list open, Enter picks the item and the editor stays
      editor.open();
      qx.ui.core.queue.Manager.flush();
      press("Down");
      press("Enter");
      this.assertTrue(this.__grid.isEditing());
      this.assertEquals("pkw", first.getIcon());
      // with the list closed, Enter takes the value
      press("Enter");
      this.assertFalse(this.__grid.isEditing());
      this.assertEquals("lkw", first.getIcon());
    },

    testCellErrorFollowsModel() {
      let grid = this.__grid;
      let pane = grid.getQxObject("widgetPane");
      let model = this.__model.getItem(2);
      grid.setCellError(model, grid.getColumns().getColumn(1), "vom Server");
      this.assertTrue(pane.getChildAtPosition(2, 1).hasState("invalid"));
      this.assertFalse(pane.getChildAtPosition(2, 2).hasState("invalid"));

      // the cell widgets are reused while scrolling, the error stays with the cell of the model
      grid.setStartRowIndex(100);
      qx.ui.core.queue.Manager.flush();
      this.assertFalse(pane._getChildren().some(child => child.hasState("invalid")));
      grid.setStartRowIndex(0);
      qx.ui.core.queue.Manager.flush();
      this.assertTrue(pane.getChildAtPosition(2, 1).hasState("invalid"));
      this.assertEquals("vom Server", pane.getChildAtPosition(2, 1).getToolTipText());

      grid.resetCellErrors();
      this.assertFalse(pane.getChildAtPosition(2, 1).hasState("invalid"));
    }
  }
});
