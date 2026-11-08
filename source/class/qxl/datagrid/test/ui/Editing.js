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
      this.assertEquals("Vehicle type 1", editor.getValue());
      let cell = grid.getQxObject("widgetPane").getChildAtPosition(0, 1);
      this.assertJsonEquals(cell.getBounds(), editor.getBounds(), "editor covers the cell");
      this.assertTrue(qx.ui.core.FocusHandler.getInstance().isFocused(editor));

      // Enter takes the value and goes on with the cell below, like qx.ui.table
      editor.setValue("New");
      press("Enter");
      this.assertEquals("New", this.__model.getItem(0).getName());
      this.assertEquals("New", cell.getValue());
      this.assertEquals(1, this.__changes.length);
      this.assertEquals("Vehicle type 1", this.__changes[0].oldValue);
      this.assertEquals(1, this.__changes[0].columnIndex);
      this.assertTrue(grid.getFocusedPosition().equals(1, 1));
      this.assertEquals("Vehicle type 2", this.__getEditor().getValue());
      press("Escape");
      this.assertFalse(grid.isEditing());
      this.assertTrue(qx.ui.core.FocusHandler.getInstance().isFocused(grid), "the grid takes the focus back");

      // in the last row Enter only takes the value
      this.__openEditor(199, 1).setValue("Last");
      press("Enter");
      this.assertFalse(grid.isEditing());
      this.assertEquals("Last", this.__model.getItem(199).getName());
      this.assertTrue(grid.getFocusedPosition().equals(199, 1));

      editor = this.__openEditor(0, 1);
      editor.setValue("Discarded");
      press("Escape");
      this.assertFalse(grid.isEditing());
      this.assertEquals("New", this.__model.getItem(0).getName());
      this.assertEquals(2, this.__changes.length);
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
      this.assertEquals(30, first.getMaxSpeed());
      this.assertNotNull(grid.getCellError(first, speedColumn));
      this.assertFalse(editor.getValid());
      editor.setValue("120");
      press("Enter");
      this.assertTrue(grid.getFocusedPosition().equals(1, 5), "the accepted value goes on with the row below");
      press("Escape");
      this.assertEquals(120, first.getMaxSpeed());
      this.assertNull(grid.getCellError(first, speedColumn));

      // the validator of the dialog rejects an empty name
      grid.setCellValidator((model, column, value) => (column.getPath() == "name" && !value ? "required" : null));
      editor = this.__openEditor(0, 1);
      editor.setValue("");
      press("Enter");
      this.assertTrue(grid.isEditing());
      this.assertEquals("required", grid.getCellError(first, grid.getColumns().getColumn(1)));
      press("Escape");
      this.assertFalse(grid.isEditing());
      this.assertNull(grid.getCellError(first, grid.getColumns().getColumn(1)));
      this.assertEquals("Vehicle type 1", first.getName());
    },

    testTabGoesOnToNextEditableCell() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let first = this.__model.getItem(0);
      let editor = this.__openEditor(0, 1);
      editor.setValue("A");
      press("Tab");
      this.assertEquals("A", first.getName());
      this.assertTrue(grid.getFocusedPosition().equals(0, 2));
      this.assertEquals(first.getWebColor(), this.__getEditor().getValue(), "the next editor is open");

      // locked cells are skipped, in both directions
      grid.setCellEditable((model, column) => column.getPath() != "icon");
      press("Tab");
      this.assertTrue(grid.getFocusedPosition().equals(0, 4));
      this.assertTrue(grid.isEditing());
      press("Tab", { shift: true });
      this.assertTrue(grid.getFocusedPosition().equals(0, 2));
      press("Escape");

      // a boolean only gets the focus, it is not switched
      let inTraffic = first.getInTraffic();
      this.__openEditor(0, 6);
      press("Tab");
      this.assertTrue(grid.getFocusedPosition().equals(0, 7));
      this.assertFalse(grid.isEditing());
      this.assertEquals(inTraffic, first.getInTraffic());

      // after the last cell which may be edited, the focus stays
      grid.setCellEditable((model, column) => column.getPath() != "counted");
      this.__openEditor(199, 11);
      press("Tab");
      this.assertFalse(grid.isEditing());
      this.assertTrue(grid.getFocusedPosition().equals(199, 11));
    },

    testDeleteEmptiesCell() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let first = this.__model.getItem(0);
      grid.setFocusedPosition(0, 11);
      press("Delete");
      this.assertEquals("", first.getRemark());
      this.assertEquals(1, this.__changes.length);

      // an empty value rejected by the dialog: the cell gets an error, nothing is written
      grid.setCellValidator((model, column, value) => (column.getPath() == "maxSpeed" && value === null ? "required" : null));
      grid.setFocusedPosition(0, 5);
      press("Backspace");
      this.assertEquals(30, first.getMaxSpeed());
      this.assertNotNull(grid.getCellError(first, grid.getColumns().getColumn(5)));

      // a boolean, a locked cell and a grid without editing keep their values
      let inTraffic = first.getInTraffic();
      grid.setFocusedPosition(0, 7);
      press("Delete");
      this.assertEquals(inTraffic, first.getInTraffic());
      grid.setCellEditable((model, column) => column.getPath() != "name");
      grid.setFocusedPosition(0, 1);
      press("Delete");
      this.assertEquals("Vehicle type 1", first.getName());
      grid.setCellEditable(null);
      grid.setEditable(false);
      press("Delete");
      this.assertEquals("Vehicle type 1", first.getName());
    },

    testCopyAndPaste() {
      let grid = this.__grid;
      let second = this.__model.getItem(1);
      const clipboard = (type, text) => {
        let data = new DataTransfer();
        if (text !== undefined) {
          data.setData("text/plain", text);
        }
        let evt = new ClipboardEvent(type, { clipboardData: data, bubbles: true, cancelable: true });
        grid.getContentElement().getDomElement().dispatchEvent(evt);
        return data.getData("text/plain");
      };

      grid.setFocusedPosition(0, 3);
      this.assertEquals("car", clipboard("copy"));
      grid.setFocusedPosition(0, 5);
      this.assertEquals("30", clipboard("copy"));

      // a select takes the label, of several fields only the first one counts
      grid.setFocusedPosition(1, 3);
      clipboard("paste", "car\tignored\nignored");
      this.assertEquals("car", second.getIcon());
      // numbers in the format of the column, booleans as text
      grid.setFocusedPosition(1, 4);
      clipboard("paste", "1.5");
      this.assertEquals(1.5, second.getWeight());
      grid.setFocusedPosition(1, 9);
      clipboard("paste", "true");
      this.assertTrue(second.getInTrucks());
      // invalid text becomes the error of the cell
      grid.setFocusedPosition(1, 5);
      clipboard("paste", "fast");
      this.assertEquals(40, second.getMaxSpeed());
      this.assertNotNull(grid.getCellError(second, grid.getColumns().getColumn(5)));
    },

    testToggleAndReadOnly() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let first = this.__model.getItem(0);
      let motorVehiclesColumn = grid.getColumns().getColumn(8);
      this.assertFalse(first.getInMotorVehicles());

      grid.setFocusedPosition(0, 8);
      press("Space");
      this.assertTrue(first.getInMotorVehicles());
      this.assertNull(this.__getEditor(), "a boolean has no editor");
      // with Ctrl the space bar belongs to the selection
      press("Space", { ctrl: true });
      this.assertTrue(first.getInMotorVehicles());
      // a typed character does not switch it
      qxl.datagrid.test.util.InputHelper.type("x");
      this.assertTrue(first.getInMotorVehicles());

      motorVehiclesColumn.setReadOnly(true);
      press("Space");
      this.assertTrue(first.getInMotorVehicles());
      motorVehiclesColumn.setReadOnly(false);

      grid.getColumns().getColumn(1).setReadOnly(true);
      this.assertNull(this.__openEditor(0, 1));
      grid.getColumns().getColumn(1).setReadOnly(false);

      grid.setEditable(false);
      this.assertNull(this.__openEditor(0, 1));
      grid.setFocusedPosition(0, 8);
      press("Space");
      this.assertTrue(first.getInMotorVehicles());
    },

    async testEditorFollowsScrolling() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let pane = grid.getQxObject("widgetPane");
      let editor = this.__openEditor(2, 1);
      editor.setValue("scrolled");
      // the cell under the editor is hidden, editors may be transparent
      const hiddenCells = () => pane._getChildren().filter(child => child.getOpacity() === 0);
      this.assertArrayEquals([pane.getChildAtPosition(2, 1)], hiddenCells());

      // far away the cell widgets are reused for other rows, the editor waits hidden
      grid.setStartRowIndex(100);
      qx.ui.core.queue.Manager.flush();
      await new Promise(resolve => setTimeout(resolve, 20));
      this.assertTrue(grid.isEditing());
      this.assertFalse(pane.isEditorOnDisplay());
      this.assertEquals(0, hiddenCells().length, "no reused cell stays hidden");
      this.assertEquals("Vehicle type 3", this.__model.getItem(2).getName(), "hiding the editor takes nothing");
      this.assertTrue(qx.ui.core.FocusHandler.getInstance().isFocused(grid));

      grid.setStartRowIndex(0);
      qx.ui.core.queue.Manager.flush();
      this.assertTrue(pane.isEditorOnDisplay());
      this.assertJsonEquals(pane.getChildAtPosition(2, 1).getBounds(), editor.getBounds());
      this.assertArrayEquals([pane.getChildAtPosition(2, 1)], hiddenCells());
      press("F2");
      this.assertTrue(qx.ui.core.FocusHandler.getInstance().isFocused(editor));
      press("Enter");
      press("Escape");
      this.assertEquals(0, hiddenCells().length);
      this.assertEquals("scrolled", this.__model.getItem(2).getName());
      this.assertEquals("Vehicle type 2", this.__model.getItem(1).getName());
      this.assertEquals("Vehicle type 4", this.__model.getItem(3).getName());
      this.assertEquals("Vehicle type 103", this.__model.getItem(102).getName());
    },

    async testFocusOutsideTakesValue() {
      let outside = new qx.ui.form.TextField();
      qx.core.Init.getApplication().getRoot().add(outside, { left: 0, top: 320 });
      let editor = this.__openEditor(0, 1);
      editor.setValue("outside");
      outside.focus();
      qx.ui.core.queue.Manager.flush();
      await new Promise(resolve => setTimeout(resolve, 20));
      this.assertFalse(this.__grid.isEditing());
      this.assertEquals("outside", this.__model.getItem(0).getName());
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
      this.assertEquals("car", first.getIcon());
      // with the list closed, Enter takes the value
      press("Enter");
      this.assertTrue(this.__grid.getFocusedPosition().equals(1, 3));
      this.assertEquals("truck", first.getIcon());
    },

    testCellErrorFollowsModel() {
      let grid = this.__grid;
      let pane = grid.getQxObject("widgetPane");
      let model = this.__model.getItem(2);
      grid.setCellError(model, grid.getColumns().getColumn(1), "from the server");
      this.assertTrue(pane.getChildAtPosition(2, 1).hasState("invalid"));
      this.assertFalse(pane.getChildAtPosition(2, 2).hasState("invalid"));

      // the cell widgets are reused while scrolling, the error stays with the cell of the model
      grid.setStartRowIndex(100);
      qx.ui.core.queue.Manager.flush();
      this.assertFalse(pane._getChildren().some(child => child.hasState("invalid")));
      grid.setStartRowIndex(0);
      qx.ui.core.queue.Manager.flush();
      let cell = pane.getChildAtPosition(2, 1);
      this.assertTrue(cell.hasState("invalid"));
      this.assertEquals("from the server", cell.getToolTipText());
      // screen readers get the message too, not only the tool tip
      let describedBy = cell.getContentElement().getDomElement().getAttribute("aria-describedby");
      this.assertEquals("true", cell.getContentElement().getDomElement().getAttribute("aria-invalid"));
      this.assertEquals("from the server", document.getElementById(describedBy).textContent);

      grid.resetCellErrors();
      qx.ui.core.queue.Manager.flush();
      this.assertFalse(cell.hasState("invalid"));
      this.assertNull(cell.getContentElement().getDomElement().getAttribute("aria-describedby"));
      this.assertNull(document.getElementById(describedBy));
    },

    testAriaStates() {
      let grid = this.__grid;
      let pane = grid.getQxObject("widgetPane");
      const attribute = (widget, name) => widget.getContentElement().getDomElement().getAttribute(name);
      const rowWidget = row => grid.getQxObject("oddEvenRows")._getChildren().find(child => child.getUserData("qxl.datagrid.cellData")?.row === row);

      // with row selection, the rows carry aria-selected, not the cells
      grid.setFocusedPosition(1, 1);
      grid.getSelectionManager().selectAt(grid.getFocusedPosition(), "move");
      grid.updateWidgets();
      qx.ui.core.queue.Manager.flush();
      this.assertEquals("true", attribute(rowWidget(1), "aria-selected"));
      this.assertEquals("false", attribute(rowWidget(2), "aria-selected"));
      this.assertNull(attribute(pane.getChildAtPosition(1, 1), "aria-selected"));
      grid.getSelectionManager().setSelectionStyle("cell");
      grid.updateWidgets();
      qx.ui.core.queue.Manager.flush();
      this.assertEquals("true", attribute(pane.getChildAtPosition(1, 1), "aria-selected"));
      this.assertNull(attribute(rowWidget(1), "aria-selected"));

      // a locked column, and the whole grid without editing
      grid.getColumns().getColumn(2).setReadOnly(true);
      grid.updateWidgets();
      qx.ui.core.queue.Manager.flush();
      this.assertEquals("true", attribute(pane.getChildAtPosition(1, 2), "aria-readonly"));
      this.assertNull(attribute(pane.getChildAtPosition(1, 1), "aria-readonly"));
      this.assertNull(attribute(grid, "aria-readonly"));
      grid.setEditable(false);
      qx.ui.core.queue.Manager.flush();
      this.assertEquals("true", attribute(grid, "aria-readonly"));
    },

    testCellEditable() {
      const press = qxl.datagrid.test.util.InputHelper.press;
      let grid = this.__grid;
      let pane = grid.getQxObject("widgetPane");
      const readOnly = (row, column) => pane.getChildAtPosition(row, column).getContentElement().getDomElement().getAttribute("aria-readonly");
      let locked = new Set([this.__model.getItem(1)]);
      grid.setCellEditable(model => !locked.has(model));
      grid.updateWidgets();
      qx.ui.core.queue.Manager.flush();

      // a locked row: no editor, no switching by key or click, aria-readonly; the next row stays editable
      this.assertNull(this.__openEditor(1, 1));
      this.assertEquals("true", readOnly(1, 1));
      this.assertNull(readOnly(2, 1));
      this.assertNotNull(this.__openEditor(2, 1));
      press("Escape");
      let second = this.__model.getItem(1);
      let inTrucks = second.getInTrucks();
      grid.setFocusedPosition(1, 9);
      press("Space");
      qxl.datagrid.test.util.InputHelper.tap(pane.getChildAtPosition(1, 9));
      this.assertEquals(inTrucks, second.getInTrucks());
      grid.setFocusedPosition(1, 1);

      // the condition changes with the model; the cells follow after rendering again
      locked = new Set([this.__model.getItem(2)]);
      grid.updateWidgets();
      qx.ui.core.queue.Manager.flush();
      this.assertNull(readOnly(1, 1));
      this.assertEquals("true", readOnly(2, 1));

      // an editor whose cell got locked meanwhile writes nothing, Enter goes on with the row below
      let editor = this.__openEditor(3, 1);
      editor.setValue("written?");
      locked.add(this.__model.getItem(3));
      press("Enter");
      this.assertEquals("Vehicle type 4", this.__model.getItem(3).getName());
      this.assertEquals(0, this.__changes.length);
      this.assertTrue(grid.getFocusedPosition().equals(4, 1));
      press("Escape");
    },

    testRowAndCellStates() {
      let grid = this.__grid;
      let pane = grid.getQxObject("widgetPane");
      const rowWidget = row => grid.getQxObject("oddEvenRows")._getChildren().find(child => child.getUserData("qxl.datagrid.cellData")?.row === row);
      let changed = new Set([this.__model.getItem(2)]);
      grid.setRowStates(model => (changed.has(model) ? ["changed"] : null));
      grid.setCellStates((model, column) => (changed.has(model) && column.getPath() == "name" ? ["changed"] : null));
      grid.updateWidgets();
      qx.ui.core.queue.Manager.flush();
      this.assertTrue(rowWidget(2).hasState("changed"));
      this.assertFalse(rowWidget(3).hasState("changed"));
      this.assertTrue(pane.getChildAtPosition(2, 1).hasState("changed"));
      this.assertFalse(pane.getChildAtPosition(2, 2).hasState("changed"));

      // the widgets are reused for other rows while scrolling, the states stay with the model
      grid.setStartRowIndex(100);
      qx.ui.core.queue.Manager.flush();
      this.assertFalse(pane._getChildren().some(child => child.hasState("changed")));
      this.assertFalse(grid.getQxObject("oddEvenRows")._getChildren().some(child => child.hasState("changed")));
      grid.setStartRowIndex(0);
      qx.ui.core.queue.Manager.flush();
      this.assertTrue(rowWidget(2).hasState("changed"));
      this.assertTrue(pane.getChildAtPosition(2, 1).hasState("changed"));

      // states the function no longer returns are removed
      changed.clear();
      grid.updateWidgets();
      qx.ui.core.queue.Manager.flush();
      this.assertFalse(rowWidget(2).hasState("changed"));
      this.assertFalse(pane.getChildAtPosition(2, 1).hasState("changed"));
    }
  }
});
