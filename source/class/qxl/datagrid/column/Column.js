/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2020 Zenesis Ltd, https://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * John Spackman (https://githuib.com/johnspackman, john.spackman@zenesis.com)

************************************************************************ */

/**
 * Abstract base for columns; this works with `qxl.datagrid`
 * to provide an easy way for columns of specific types to be managed
 */
qx.Class.define("qxl.datagrid.column.Column", {
  extend: qx.core.Object,
  type: "abstract",

  construct(path) {
    super();
    this.__widgetStateUpdaters = new Set();
    // one listener per column instead of two per bound widget, the grid binds widgets while scrolling
    this.addListener("changeEffectivelyReadOnly", this.__updateWidgetStates, this);
    this.addListener("changeEffectivelyEnabled", this.__updateWidgetStates, this);
    if (path) {
      this.setPath(path);
    }
  },

  properties: {
    /** Optional path to the value in a node for this column */
    path: {
      init: null,
      nullable: true,
      check: "String",
      event: "changePath"
    },

    /** Caption for the header */
    caption: {
      init: null,
      check: "String",
      event: "changeCaption"
    },

    /** Assigned width, can be null */
    width: {
      init: null,
      nullable: true,
      check: "Integer",
      event: "changeWidth",
      apply: "_applyWidth"
    },

    /** Minimum width, can be null */
    minWidth: {
      init: null,
      nullable: true,
      check: "Integer",
      event: "changeMinWidth",
      apply: "_applyMinWidth"
    },

    /** Maximum width, can be null */
    maxWidth: {
      init: null,
      nullable: true,
      check: "Integer",
      event: "changeMaxWidth",
      apply: "_applyMaxWidth"
    },

    /** Flex of the column  */
    flex: {
      init: 0,
      nullable: false,
      check: "Integer",
      event: "changeFlex",
      apply: "_applyFlex"
    },

    /** Whether the column is editable */
    readOnly: {
      init: false,
      check: "Boolean",
      apply: "_applyReadOnly",
      event: "changeReadOnly"
    },

    /** Whether the column is enabled (this is controlled by the data grid) */
    enabled: {
      init: true,
      check: "Boolean",
      apply: "_applyEnabled",
      event: "changeEnabled"
    },

    /**
     * @type {(widget: qx.ui.core.Widget, model: qx.core.Object) => Object}
     * A factory for the binding options when the model property is bound to the widget.
     * It's return value is passed into parameter `options` of `qx.data.SingleValueBinding#bind`
     * @see {qx.data.SingleValueBinding#bind}
     */
    bindingOptions: {
      init: () => undefined
    },

    /**
     * A callback used to determine whether a given cell on the grid should fill
     * the remaining width in the row. By default, this always returns false.
     *
     * @type {(model: any, child: qx.ui.core.Widget, relativePosition: qxl.datagrid.source.Position, absolutePosition: qxl.datagrid.source.Position) => boolean}
     */
    shouldFillWidth: {
      init: null,
      check: "Function",
      nullable: true,
      event: "changeShouldFillWidth"
    },

    /**
     * A callback used to determine how many columns a cell should fill. This
     * also includes header cells at negative indexes.
     *
     * If the returned value is not a number, is zero or is negative, the
     * colspan will default to 1. If a non-integer value is returned, it will
     * always be rounded down.
     *
     * For grid cells, the behavior of colSpan will be overridden by
     * {@link #shouldFillWidth} if that property's value function returns
     * `true`.
     *
     * Providing a callback to this property will override the default call to
     * {@link qxl.datagrid.ui.GridStyling#colSpan}'s value function. Columns
     * may defer back to the GridStyling property value function by calling the
     * first argument `stylingFn` (no parameters necessary).
     *
     *
     * @type {(stylingFn: Function, model: any, child: qx.ui.core.Widget, relativePosition: qxl.datagrid.source.Position, absolutePosition: qxl.datagrid.source.Position) => Integer}
     */
    colSpan: {
      init: null,
      check: "Function",
      nullable: true,
      event: "changecolSpan"
    },

    /**
     * User-specified.
     * Whether this column supports sorting.
     * If true, the column will be sortable and the user can click on the header to sort the column.
     */
    sortable: {
      init: false,
      check: "Boolean",
      event: "changeSortable"
    },

    /**
     * Only relevant when sortable is set to true
     * Defines the sort order for this column
     * This is changed when the user clicks on a column to sort it,
     * but can also be set programatically.
     * Note: Setting it in code unsorts the other columns; several sorted columns come from
     * `qxl.datagrid.column.Columns.toggleSort` with `add` (Shift+click)
     */
    sortOrder: {
      init: null,
      nullable: true,
      check: ["asc", "desc"],
      event: "changeSortOrder"
    },

    /**
     * Whether the column is shown; a hidden column keeps its index, its values and errors and may stay
     * sorted, it is just not laid out. The user switches it in the column menu of the grid.
     */
    visible: {
      init: true,
      check: "Boolean",
      event: "changeVisible"
    },

    /** Whether the user may hide the column in the column menu of the grid; in code `visible` still works */
    hideable: {
      init: true,
      check: "Boolean",
      event: "changeHideable"
    }
  },

  events: {
    /** Fired when the column details change */
    change: "qx.event.type.Data",

    /** Fired when the user taps on a header cell */
    headerTap: "qx.event.type.Event",

    /** Fired when the effectivelyEnabled needs to be checked, data is a {Boolean} */
    changeEffectivelyEnabled: "qx.event.type.Data",

    /** Fired when the effectivelyReadOnly needs to be checked, data is a {Boolean} */
    changeEffectivelyReadOnly: "qx.event.type.Data"
  },

  members: {
    __datagrid: null,

    /** @type {Set<Function>} updates readOnly/enabled of each bound widget */
    __widgetStateUpdaters: null,

    /**
     * Event handler for `changeEffectivelyReadOnly` and `changeEffectivelyEnabled`; the grid renders
     * again, since `aria-readonly` of the cells depends on it
     */
    __updateWidgetStates() {
      this.__widgetStateUpdaters.forEach(update => update());
      this.__datagrid?.scheduleUpdateWidgets();
    },

    /**
     * Called by the DataGrid when the column is added.  Do NOT call this manually.
     *
     * @param {qxl.datagrid.DataGrid} datagrid
     */
    setDataGrid(datagrid) {
      if (this.__datagrid === datagrid) {
        return;
      }
      if (qx.core.Environment.get("qx.debug") && datagrid) {
        this.assertInstance(datagrid, qxl.datagrid.DataGrid);
        this.assertTrue(!this.__datagrid, "DataGrid already set");
      }
      if (this.__datagrid) {
        this.__datagrid.removeListener("changeEnabled", this.__fireEffectiveChanges, this);
        this.__datagrid.removeListener("changeReadOnly", this.__fireEffectiveChanges, this);
      }
      this.__datagrid = datagrid;
      if (datagrid) {
        datagrid.addListener("changeEnabled", this.__fireEffectiveChanges, this);
        datagrid.addListener("changeReadOnly", this.__fireEffectiveChanges, this);
      }
      this.__fireEffectiveChanges();
    },

    /**
     * Returns the datagrid, if any
     *
     * @returns {qxl.datagrid.DataGrid}
     */
    getDataGrid() {
      return this.__datagrid;
    },

    /**
     * Fires `changeEffectivelyEnabled` and `changeEffectivelyReadOnly` with the current values; called
     * whenever `enabled` or `readOnly` of the column or the datagrid changes, since `enabled` affects both
     */
    __fireEffectiveChanges() {
      this.fireDataEvent("changeEffectivelyEnabled", this.isEffectivelyEnabled());
      this.fireDataEvent("changeEffectivelyReadOnly", this.isEffectivelyReadOnly());
    },

    /**
     * Detects whether the column is read only, taking into account the datagrid; a disabled column or
     * datagrid is read only too
     *
     * @returns {Boolean}
     */
    isEffectivelyReadOnly() {
      return this.getReadOnly() || !this.isEffectivelyEnabled() || !!this.__datagrid?.isReadOnly();
    },

    /**
     * Detects whether the column is enabled, taking into account the datagrid
     *
     * @returns {Boolean}
     */
    isEffectivelyEnabled() {
      return this.getEnabled() && (this.__datagrid?.isEnabled() ?? true);
    },

    /**
     * Called to implement the binding
     *
     * @param {qx.ui.core.Widget} widget
     * @param {qx.core.Object} model Model object representing the row
     * @param {qxl.datagrid.ui.factory.IWidgetFactory} factory
     * @returns {qxl.datagrid.binding.Bindings} the object to dispose of to remove the binding
     */
    bindWidget(widget, model, factory) {
      let path = this.getPath();
      let bindings = new qxl.datagrid.binding.Bindings(model);
      if (path) {
        if (path == ".") {
          widget.setValue(model);
          bindings.add(model, () => widget.setValue(null));
        } else if (model) {
          let options = this.getBindingOptions()(widget, model);
          let listenerId = this.__bindValueDirectly(model, path, widget, options);
          if (listenerId) {
            bindings.add(model, listenerId, "listener");
          } else {
            bindings.add(model, model.bind(path, widget, "value", options));
          }
        }
      }
      let update;
      if (typeof widget.setReadOnly == "function") {
        update = () => {
          widget.setReadOnly(this.isEffectivelyReadOnly());
          widget.setEnabled(this.isEffectivelyEnabled());
        };
      } else {
        update = () => {
          widget.setEnabled(this.isEffectivelyEnabled() && !this.isEffectivelyReadOnly());
        };
      }
      this.__widgetStateUpdaters.add(update);
      bindings.add(this, () => this.__widgetStateUpdaters.delete(update), "callback");
      update();
      return bindings;
    },

    /**
     * Binds `value` of the widget to a plain property of the model with a change listener, which
     * is much cheaper than `model.bind` (a `qx.data.SingleValueBinding` with its segment objects);
     * the grid binds every cell entering the display, so this is done on every scroll step.
     *
     * Behaves like `model.bind(path, widget, "value", options)`: the converter is called with the
     * widget's model, `ignoreConverter`, `onUpdate` and `onSetFail` are respected, and `undefined`
     * resets the value. Anything else (a chain, an async property or binding, a property without
     * change event) is left to `model.bind`.
     *
     * @param {qx.core.Object} model
     * @param {String} path the column's path
     * @param {qx.ui.core.Widget} widget
     * @param {Object?} options binding options, see `qx.data.SingleValueBinding`
     * @return {String?} the listener id on the model, null if `model.bind` is needed
     */
    __bindValueDirectly(model, path, widget, options) {
      if (!/^[A-Za-z_$][\w$]*$/.test(path) || options?.async) {
        return null;
      }
      let property = qx.Class.getByProperty(model.constructor, qx.lang.String.firstLow(path));
      let eventName = property?.getEventName();
      if (!eventName || (property.supportsGetAsync() && !property.hasLocalValue(model))) {
        return null;
      }

      let converter = options?.converter;
      let ignoreConverter = !!options?.ignoreConverter && new RegExp("^" + options.ignoreConverter).test(path);
      const setValue = value => {
        // same condition as in SingleValueBinding
        if (converter && (value !== undefined || !ignoreConverter)) {
          value = converter(value, typeof widget.getModel == "function" ? widget.getModel() : null, model, widget);
        }
        try {
          if (value === undefined) {
            widget.resetValue();
          } else {
            widget.setValue(value);
          }
        } catch (ex) {
          options?.onSetFail?.();
          return;
        }
        options?.onUpdate?.(model, widget, value);
      };
      setValue(property.get(model));
      return model.addListener(eventName, evt => setValue(evt.getData()));
    },

    /**
     * Returns the states which the widgets of this column always have, in the cells and in the header
     * (the header cell and its label), so that the theme can style a kind of column; eg the themes align
     * `number` to the right
     *
     * @return {String[]}
     */
    getWidgetStates() {
      return [];
    },

    /**
     * Creates a widget for displaying a value for for a single cell
     * @returns {qx.ui.core.Widget}
     */
    createWidgetForDisplay() {
      return new qx.ui.basic.Label().set({
        appearance: "qxl-datagrid-cell"
      });
    },

    /**
     * Creates the editor for a cell of this column; the grid creates it only for the cell being
     * edited, never for every cell. Override for other editors, together with `setEditorValue` and
     * `getEditorValue`.
     *
     * @return {qx.ui.core.Widget?} the editor, null if cells of this column have no editor (they
     *  may still be changed with `getToggledValue`)
     */
    createWidgetForEdit() {
      return new qx.ui.form.TextField();
    },

    /**
     * Whether the user may change values of this column, taking into account `readOnly` and
     * `enabled` of the column and the grid
     *
     * @return {Boolean}
     */
    isEditable() {
      return !this.isEffectivelyReadOnly() && this.isEffectivelyEnabled();
    },

    /**
     * Reads the value of this column from a model, following the path
     *
     * @param {qx.core.Object} model
     * @return {*} the value, undefined if the path cannot be resolved
     */
    getModelValue(model) {
      let path = this.getPath();
      if (!model || !path) {
        return undefined;
      }
      return path == "." ? model : qx.data.SingleValueBinding.resolvePropertyChain(model, path);
    },

    /**
     * Writes the value of this column into a model, following the path
     *
     * @param {qx.core.Object} model
     * @param {*} value the new value
     */
    setModelValue(model, value) {
      let path = this.getPath();
      let pos = path.lastIndexOf(".");
      let target = pos < 0 ? model : qx.data.SingleValueBinding.resolvePropertyChain(model, path.substring(0, pos));
      target.set(path.substring(pos + 1), value);
    },

    /**
     * Changes the width like the user does (dragging the header edge, Shift+Left/Right in the header):
     * within `minWidth`/`maxWidth`, and a flexible column gets this fixed width, like in `qx.ui.table`.
     * A column with `minWidth` equal to `maxWidth` keeps its width.
     *
     * @param {Number} width the wanted width in pixels
     * @return {Boolean} true if the column can be resized
     */
    resize(width) {
      let minWidth = this.getMinWidth() ?? 0;
      let maxWidth = this.getMaxWidth() ?? Infinity;
      if (minWidth == maxWidth) {
        return false;
      }
      this.setFlex(0);
      this.setWidth(Math.round(Math.min(maxWidth, Math.max(minWidth, width))));
      return true;
    },

    /**
     * Returns the value a model is sorted by in this column, compared with
     * `qxl.datagrid.column.Columns.compareValues`; by default the value of the model
     *
     * @param {qx.core.Object} model
     * @return {*}
     */
    getSortValue(model) {
      return this.getModelValue(model);
    },

    /**
     * Puts a value into the editor
     *
     * @param {qx.ui.core.Widget} editor as created by `createWidgetForEdit`
     * @param {*} value the value of the model
     */
    setEditorValue(editor, value) {
      editor.setValue(this._formatForEdit(value));
    },

    /**
     * Reads the value from the editor
     *
     * @param {qx.ui.core.Widget} editor as created by `createWidgetForEdit`
     * @return {*} the value for the model
     * @throws {Error} with a message for the user if the input is not valid
     */
    getEditorValue(editor) {
      return this._parseFromEditor(editor.getValue());
    },

    /**
     * Converts a value of the model into the text of a text editor
     *
     * @param {*} value
     * @return {String}
     */
    _formatForEdit(value) {
      return value === null || value === undefined ? "" : String(value);
    },

    /**
     * Converts the text of a text editor into a value of the model
     *
     * @param {String?} text
     * @return {*} the value
     * @throws {Error} with a message for the user if the text is not valid
     */
    _parseFromEditor(text) {
      return text ?? "";
    },

    /**
     * Converts a value of the model into text for the clipboard (Ctrl+C); by default the text of the
     * editor
     *
     * @param {*} value
     * @return {String}
     */
    formatForClipboard(value) {
      return this._formatForEdit(value);
    },

    /**
     * Converts text from the clipboard (Ctrl+V) into a value of the model; by default like the text
     * of the editor. An empty text is what Delete writes into the cell.
     *
     * @param {String} text
     * @return {*} the value
     * @throws {Error} with a message for the user if the text is not valid
     */
    parseFromClipboard(text) {
      return this._parseFromEditor(text);
    },

    /**
     * For columns without editor whose value is switched directly (eg a boolean with Space or a
     * click): returns the value after switching
     *
     * @param {*} value the current value
     * @return {*} the new value, undefined if the value cannot be switched
     */
    getToggledValue(value) {
      return undefined;
    },

    /**
     * Called to allow the column to update the state of the widget based on the model;
     * this is typically used by the expansion column to show the correct icon for
     * expanding/collapsing
     *
     * @param {qx.ui.core.Widget} widget
     * @param {qx.core.Object} model
     * @param {qxl.datagrid.ui.factory.IWidgetFactory} factory
     */
    updateState(widget, model, factory) {
      // Nothing to do
    },

    /**
     * Apply for `width` property
     * @param value
     */
    _applyWidth(value) {},

    /**
     * Apply for `minWidth` property
     * @param value
     */
    _applyMinWidth(value) {},

    /**
     * Apply for `maxWidth` property
     * @param value
     */
    _applyMaxWidth(value) {},

    /**
     * Apply for `flex` property
     * @param value
     */
    _applyFlex(value) {},

    /**
     * Apply for `readOnly` property
     * @param value
     */
    _applyReadOnly(value) {
      this.__fireEffectiveChanges();
    },

    /**
     * Apply for `enabled` property
     * @param value
     */
    _applyEnabled(value) {
      this.__fireEffectiveChanges();
    }
  }
});
