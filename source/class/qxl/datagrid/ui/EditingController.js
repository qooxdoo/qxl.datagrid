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
 * Edits the cells of a grid: opens the editor of the focused cell on demand, takes or discards its
 * value, switches values of columns without editor and keeps the error messages of cells. The grid
 * creates one controller and offers its methods as its own API (`startEditing`, `setCellError`, ...);
 * properties (`editable`, `cellValidator`) and the event `cellValueChanged` stay on the grid.
 */
qx.Class.define("qxl.datagrid.ui.EditingController", {
  extend: qx.core.Object,

  /**
   * @param {qxl.datagrid.DataGrid} grid the grid whose cells are edited
   */
  construct(grid) {
    super();
    this.__grid = grid;
    this.__cellErrors = new Map();
    let pane = grid.getQxObject("widgetPane");
    pane.setCellErrors(this.__cellErrors);
    pane.setCellEditableFunction((model, column, columnEditable) => this.isCellEditable(model, column, columnEditable));
    pane.addListener("cellTap", evt => this.__onCellTap(evt.getData()));
    pane.addListener("cellDoubleTap", evt => this.__onCellDoubleTap(evt.getData()));
    // editors like the select box stop Enter and Tab themselves, so these are taken before them
    grid.addListener("keypress", this.__onEditorKeyPress, this, true);
    grid.addListener("keyinput", this.__onKeyInput, this);
  },

  destruct() {
    if (this.__editing) {
      this.__editing.editor.dispose();
    }
    this.__grid = null;
    this.__editing = null;
  },

  members: {
    /** @type {qxl.datagrid.DataGrid} */
    __grid: null,

    /** @type {Map<String, String>} error messages by `WidgetPane.cellErrorKey` */
    __cellErrors: null,

    /**
     * @type {Object?} the cell being edited, `{model, column, columnIndex, row, editor, listeners, rejected}`;
     * it is bound to model and column, not to a cell widget, since cell widgets are reused for other
     * rows while scrolling
     */
    __editing: null,
    /**
     * Handles the keys for editing; called by the grid before a key moves the focus
     *
     * @param {qx.event.type.KeySequence} evt
     * @return {Boolean} true if the key has been dealt with and must not move the focus
     */
    handleKey(evt) {
      const stop = () => {
        evt.preventDefault();
        evt.stopPropagation();
      };
      let key = evt.getKeyIdentifier();
      if (!this.__editing) {
        if (!this.__grid.getEditable()) {
          return false;
        }
        if (key == "F2" || key == "Enter") {
          this.startEditing();
          stop();
          return true;
        }
        // with Ctrl or Shift, the space bar belongs to the selection
        if (key == "Space" && evt.getModifiers() == 0 && this.toggleFocusedCell()) {
          stop();
          return true;
        }
        return false;
      }
      switch (key) {
        case "Escape":
          this.cancelEditing();
          stop();
          return true;

        case "Enter":
          if (this.__isEditorPopupOpen()) {
            // the select box takes the item first
            return true;
          }
          stop();
          this.__commitAndEditBelow();
          return true;

        case "Tab":
          if (!this.commitEditing()) {
            stop();
            return true;
          }
          return false;

        case "F2":
          this.startEditing();
          stop();
          return true;

        default:
          if (evt.getTarget() !== this.__grid) {
            // all other keys belong to the editor
            return true;
          }
          // the grid has the focus while the editor is open (eg scrolled out of view): moving commits
          if (qxl.datagrid.DataGrid.computeFocusMove(key, {}, { row: 0, column: 0 }, 1, 1, 1) === undefined) {
            return true;
          }
          if (!this.commitEditing()) {
            stop();
            return true;
          }
          return false;
      }
    },

    /**
     * Takes the value of the editor and, like `qx.ui.table`, opens the editor of the cell below; in
     * the last row the focus stays, a rejected value keeps the editor open
     */
    __commitAndEditBelow() {
      let editing = this.__editing;
      if (!this.commitEditing()) {
        return;
      }
      if (editing.row + 1 < this.__grid.getDataSource().getSize().getRow()) {
        this.__grid._moveFocusTo(editing.row + 1, editing.columnIndex);
        this.startEditing();
      }
    },

    /**
     * Capturing event handler for `keypress` in the editor: Enter takes the value and goes on in the
     * row below (unless a drop down list of the editor is open, then it picks the item), Tab takes the
     * value and moves on
     *
     * @param {qx.event.type.KeySequence} evt
     */
    __onEditorKeyPress(evt) {
      if (!this.__editing || evt.getTarget() === this.__grid) {
        return;
      }
      let key = evt.getKeyIdentifier();
      if (key == "Enter" && !this.__isEditorPopupOpen()) {
        evt.preventDefault();
        evt.stopPropagation();
        this.__commitAndEditBelow();
      } else if (key == "Tab") {
        evt.preventDefault();
        evt.stopPropagation();
        if (this.commitEditing()) {
          this.__grid._moveFocusByKey(evt);
        }
      }
    },

    /**
     * Event handler for `keyinput`: a typed character opens the editor with this character
     *
     * @param {qx.event.type.KeyInput} evt
     */
    __onKeyInput(evt) {
      if (evt.getTarget() !== this.__grid || !this.__grid.getEditable()) {
        return;
      }
      if (this.__editing) {
        // the editor is out of view; bring it back, the character is not added
        this.startEditing();
        return;
      }
      if (this.startEditing(evt.getChar())) {
        evt.preventDefault();
      }
    },

    /**
     * Whether the editor shows a drop down list which is open, eg of a select box
     *
     * @return {Boolean}
     */
    __isEditorPopupOpen() {
      let editor = this.__editing?.editor;
      return editor instanceof qx.ui.form.AbstractSelectBox && editor.getChildControl("popup").isVisible();
    },

    /**
     * Returns the focused cell with its column and model
     *
     * @return {{row: Integer, columnIndex: Integer, column: qxl.datagrid.column.Column, model: qx.core.Object}?}
     */
    __getFocusedCell() {
      let position = this.__grid.getFocusedPosition();
      let dataSource = this.__grid.getDataSource();
      if (!position || !dataSource) {
        return null;
      }
      let column = this.__grid.getColumns().getColumn(position.getColumn());
      let model = dataSource.getModelForPosition(position);
      if (!column || !model) {
        return null;
      }
      return { row: position.getRow(), columnIndex: position.getColumn(), column, model };
    },

    /**
     * Whether a cell may be edited: `editable` of the grid, the column and the grid's `cellEditable`
     * allow it
     *
     * @param {qx.core.Object} model the model of the cell
     * @param {qxl.datagrid.column.Column} column the column of the cell
     * @param {Boolean?} columnEditable `column.isEditable()` if the caller has it already
     * @return {Boolean}
     */
    isCellEditable(model, column, columnEditable) {
      if (!this.__grid.getEditable() || !(columnEditable ?? column.isEditable())) {
        return false;
      }
      let cellEditable = this.__grid.getCellEditable();
      return !cellEditable || cellEditable(model, column) !== false;
    },

    /**
     * Whether an editor is open, possibly scrolled out of view
     *
     * @return {Boolean}
     */
    isEditing() {
      return !!this.__editing;
    },

    /**
     * Opens the editor of the focused cell; a column without editor (eg a boolean) switches its
     * value instead. If an editor is already open, it is brought into view and focused.
     *
     * @param {String?} initialText text which replaces the value in a text editor, eg a typed
     *  character; a column without editor ignores the call then
     * @return {Boolean} true if an editor is open or the value has been switched
     */
    startEditing(initialText) {
      let pane = this.__grid.getQxObject("widgetPane");
      let editing = this.__editing;
      if (editing) {
        this.__grid.getSelectionManager().setFocusedPosition(new qxl.datagrid.source.Position(editing.row, editing.columnIndex));
        this.__grid.scrollToPosition(editing.row, editing.columnIndex);
        editing.editor.focus();
        return true;
      }
      let cell = this.__getFocusedCell();
      if (!cell || !this.isCellEditable(cell.model, cell.column)) {
        return false;
      }
      let editor = cell.column.createWidgetForEdit();
      if (!editor) {
        return initialText === undefined && this.toggleFocusedCell();
      }
      cell.column.setEditorValue(editor, cell.column.getModelValue(cell.model));
      if (cell.column.getCaption()) {
        editor.setAriaLabel(cell.column.getCaption());
      }
      let textEditor = editor instanceof qx.ui.form.AbstractField;
      if (textEditor && initialText !== undefined) {
        editor.setValue(initialText);
      }
      editing = this.__editing = { ...cell, editor, listeners: [] };
      editing.listeners.push(
        [editor, editor.addListener("blur", () => this.__onEditorBlur(editing))],
        [cell.column, cell.column.addListener("changeEffectivelyReadOnly", () => this.__cancelIfNotEditable())],
        [cell.column, cell.column.addListener("changeEffectivelyEnabled", () => this.__cancelIfNotEditable())]
      );
      editor.addListenerOnce("appear", () => {
        editor.focus();
        if (textEditor) {
          if (initialText === undefined) {
            editor.selectAllText();
          } else {
            editor.setTextSelection(initialText.length, initialText.length);
          }
        }
      });
      this.__grid.scrollToPosition(cell.row, cell.columnIndex);
      pane.showEditor(editor, cell.row, cell.columnIndex);
      return true;
    },

    /**
     * Takes the value of the editor: it is checked by the column and `cellValidator`, written into
     * the model and `cellValueChanged` is fired. A rejected value keeps the editor open and shows the
     * message.
     *
     * @param {Boolean?} refocus whether the grid takes back the keyboard focus, default true
     * @return {Boolean} true if no editor is open any more
     */
    commitEditing(refocus = true) {
      let editing = this.__editing;
      if (!editing) {
        return true;
      }
      if (!this.isCellEditable(editing.model, editing.column)) {
        // the model has changed while editing and the cell is locked now: discard
        if (editing.rejected) {
          this.setCellError(editing.model, editing.column, null);
        }
        this.__closeEditor(refocus);
        return true;
      }
      let error;
      try {
        let value = editing.column.getEditorValue(editing.editor);
        error = this.__writeValue(editing, value);
      } catch (ex) {
        error = ex.message;
      }
      if (error) {
        this.setCellError(editing.model, editing.column, error);
        editing.rejected = true;
        if (typeof editing.editor.setValid == "function") {
          editing.editor.setInvalidMessage(error);
          editing.editor.setValid(false);
        }
        if (refocus && this.__grid.getQxObject("widgetPane").isEditorOnDisplay()) {
          editing.editor.focus();
        }
        return false;
      }
      this.__closeEditor(refocus);
      return true;
    },

    /**
     * Closes the editor without taking its value
     */
    cancelEditing() {
      let editing = this.__editing;
      if (editing) {
        if (editing.rejected) {
          this.setCellError(editing.model, editing.column, null);
        }
        this.__closeEditor(true);
      }
    },

    /**
     * Switches the value of the focused cell, for columns without editor (see
     * `Column.getToggledValue`); a value rejected by `cellValidator` is shown as error of the cell
     *
     * @return {Boolean} true if the column can be switched, even if the value was rejected
     */
    toggleFocusedCell() {
      let cell = this.__getFocusedCell();
      if (!cell || !this.isCellEditable(cell.model, cell.column)) {
        return false;
      }
      let value = cell.column.getToggledValue(cell.column.getModelValue(cell.model));
      if (value === undefined) {
        return false;
      }
      let error = this.__writeValue(cell, value);
      if (error) {
        this.setCellError(cell.model, cell.column, error);
      }
      return true;
    },

    /**
     * Writes text from the clipboard into the focused cell, converted by `Column.parseFromClipboard`;
     * of several lines or tab separated fields only the first one counts. Invalid or rejected text
     * becomes the error of the cell.
     *
     * @param {String} text
     * @param {Boolean?} skipToggling whether columns which switch their value directly are left alone
     * @return {Boolean} true if the cell may be edited and the text has been dealt with
     */
    pasteIntoFocusedCell(text, skipToggling) {
      let cell = this.__getFocusedCell();
      if (this.__editing || !cell || !this.isCellEditable(cell.model, cell.column)) {
        return false;
      }
      if (skipToggling && cell.column.getToggledValue(cell.column.getModelValue(cell.model)) !== undefined) {
        return false;
      }
      let error;
      try {
        let value = cell.column.parseFromClipboard(text.split(/\r?\n/)[0].split("\t")[0]);
        error = this.__writeValue(cell, value);
      } catch (ex) {
        error = ex.message;
      }
      if (error) {
        this.setCellError(cell.model, cell.column, error);
      }
      return true;
    },

    /**
     * Returns the value of the focused cell as text for the clipboard (`Column.formatForClipboard`)
     *
     * @return {String?} null without a focused cell
     */
    getFocusedCellText() {
      let cell = this.__getFocusedCell();
      return cell ? cell.column.formatForClipboard(cell.column.getModelValue(cell.model)) : null;
    },

    /**
     * Checks a value with `cellValidator`, writes it into the model and fires `cellValueChanged`;
     * a value accepted for the cell removes its error
     *
     * @param {Object} cell `{row, columnIndex, column, model}`
     * @param {*} value the new value
     * @return {String?} the error message if the value has been rejected
     */
    __writeValue(cell, value) {
      let oldValue = cell.column.getModelValue(cell.model);
      let validator = this.__grid.getCellValidator();
      let message = validator ? validator(cell.model, cell.column, value, oldValue) : null;
      if (message) {
        return message;
      }
      if (this.getCellError(cell.model, cell.column)) {
        this.setCellError(cell.model, cell.column, null);
      }
      if (value !== oldValue) {
        cell.column.setModelValue(cell.model, value);
        this.__grid.fireDataEvent("cellValueChanged", { model: cell.model, column: cell.column, row: cell.row, columnIndex: cell.columnIndex, value, oldValue });
      }
      return null;
    },

    /**
     * Removes and disposes the editor
     *
     * @param {Boolean} refocus whether the grid takes back the keyboard focus
     */
    __closeEditor(refocus) {
      let editing = this.__editing;
      this.__editing = null;
      editing.listeners.forEach(([target, id]) => target.removeListenerById(id));
      this.__grid.getQxObject("widgetPane").removeEditor();
      editing.editor.dispose();
      if (refocus) {
        this.__grid.focus();
      }
    },

    /**
     * Takes the value when the keyboard focus leaves the grid from the editor; hiding the editor
     * while scrolling moves the focus to the grid and takes nothing
     *
     * @param {Object} editing the editing state the editor belongs to
     */
    __onEditorBlur(editing) {
      qx.event.Timer.once(
        () => {
          if (this.__editing !== editing || !this.__grid.getQxObject("widgetPane").isEditorOnDisplay()) {
            return;
          }
          let focused = qx.ui.core.FocusHandler.getInstance().getFocusedWidget();
          if (focused && qx.ui.core.Widget.contains(this.__grid, focused)) {
            return;
          }
          this.commitEditing(false);
        },
        this,
        0
      );
    },

    /**
     * Called by the grid after its widgets have been updated: moves the keyboard focus from the
     * editor to the grid when the editor has been hidden, before the browser drops the focus of the
     * hidden element
     */
    onPaneUpdated() {
      let editing = this.__editing;
      if (editing && !this.__grid.getQxObject("widgetPane").isEditorOnDisplay() && qx.ui.core.FocusHandler.getInstance().isFocused(editing.editor)) {
        this.__grid.focus();
      }
    },

    /**
     * Called by the grid when the size of the data source has changed: keeps the editor on its model
     * after rows were added or removed; without the model the editor is closed
     */
    onDataSourceChangeSize() {
      let editing = this.__editing;
      if (!editing) {
        return;
      }
      let dataSource = this.__grid.getDataSource();
      if (typeof dataSource.isModelValid == "function" && !dataSource.isModelValid(editing.model)) {
        this.cancelEditing();
        return;
      }
      let row = dataSource.getPositionOfModel(editing.model)?.getRow();
      if (row !== undefined && row >= 0 && row !== editing.row) {
        editing.row = row;
        this.__grid.getQxObject("widgetPane").moveEditor(row);
      }
    },

    /**
     * Closes the editor without taking its value when its column cannot be edited any more
     */
    __cancelIfNotEditable() {
      if (this.__editing && !this.__editing.column.isEditable()) {
        this.cancelEditing();
      }
    },

    /**
     * Event handler for a click on a cell: takes the value of an open editor of another cell and
     * switches a boolean cell
     *
     * @param {Object} cell `{row, column, model}` as fired by the widget pane
     */
    __onCellTap(cell) {
      let editing = this.__editing;
      if (editing && (cell.row !== editing.row || cell.column !== editing.columnIndex)) {
        if (!this.commitEditing()) {
          this.__grid.getSelectionManager().setFocusedPosition(new qxl.datagrid.source.Position(editing.row, editing.columnIndex));
          return;
        }
      }
      if (!this.__editing && this.__grid.getEditable()) {
        let column = this.__grid.getColumns().getColumn(cell.column);
        if (column && column.getToggledValue(column.getModelValue(cell.model)) !== undefined) {
          this.toggleFocusedCell();
        }
      }
    },

    /**
     * Event handler for a double click on a cell: opens the editor
     *
     * @param {Object} cell `{row, column, model}` as fired by the widget pane
     */
    __onCellDoubleTap(cell) {
      let column = this.__grid.getColumns().getColumn(cell.column);
      if (!this.__grid.getEditable() || !column || column.getToggledValue(column.getModelValue(cell.model)) !== undefined) {
        return;
      }
      this.startEditing();
    },

    /**
     * Sets or removes the error message of a cell, eg from a check on the server; the cell shows the
     * state `invalid` and the message as tool tip while it is on display. Accepting a new value for
     * the cell removes its error.
     *
     * @param {qx.core.Object} model the model of the cell
     * @param {qxl.datagrid.column.Column} column the column of the cell
     * @param {String?} message the error, null to remove it
     */
    setCellError(model, column, message) {
      let columnIndex = this.__grid.getColumns().indexOf(column);
      let key = qxl.datagrid.ui.WidgetPane.cellErrorKey(model, columnIndex);
      if (message) {
        this.__cellErrors.set(key, message);
      } else {
        this.__cellErrors.delete(key);
      }
      this.__grid.getQxObject("widgetPane").setErrorText(key, message);
      let row = this.__grid.getDataSource()?.getPositionOfModel(model)?.getRow();
      if (row !== undefined && row >= 0) {
        this.__grid.getQxObject("widgetPane").updateCellError(row, columnIndex);
      }
    },

    /**
     * Returns the error message of a cell
     *
     * @param {qx.core.Object} model the model of the cell
     * @param {qxl.datagrid.column.Column} column the column of the cell
     * @return {String?} the error, null if there is none
     */
    getCellError(model, column) {
      return this.__cellErrors.get(qxl.datagrid.ui.WidgetPane.cellErrorKey(model, this.__grid.getColumns().indexOf(column))) ?? null;
    },

    /**
     * Removes the error messages of all cells
     */
    resetCellErrors() {
      let pane = this.__grid.getQxObject("widgetPane");
      this.__cellErrors.forEach((message, key) => pane.setErrorText(key, null));
      this.__cellErrors.clear();
      this.__grid.getQxObject("widgetPane").updateCellErrors();
    }
  }
});
