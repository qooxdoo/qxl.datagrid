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
 * A value chosen from a fixed list: the cell shows the label of the value, the editor is a SelectBox
 */
qx.Class.define("qxl.datagrid.column.SelectColumn", {
  extend: qxl.datagrid.column.Column,

  /**
   * @param {String?} path the path to the value in the model
   * @param {Object[]?} options the list to choose from, see `options`
   */
  construct(path, options) {
    super(path);
    if (options) {
      this.setOptions(options);
    }
    this.setBindingOptions((widget, model) => ({
      converter: value => ({ label: this.getLabelFor(value), icon: this.__findOption(value)?.icon ?? null })
    }));
  },

  properties: {
    /**
     * The list to choose from, as objects `{label, model, icon}`; `model` is the value written into the
     * model, the optional `icon` is a source for `qx.ui.basic.Image` (a resource, an alias or a font icon),
     * shown in the cell and in the editor with the size of `qxl-datagrid-cell/icon` in the theme; with an
     * empty label the cell shows only the icon
     */
    options: {
      init: null,
      nullable: true,
      check: "Array",
      event: "changeOptions"
    }
  },

  members: {
    /**
     * Returns the label of a value
     *
     * @param {*} value a value of the model
     * @return {String} the label, the value itself if it is not in `options`
     */
    getLabelFor(value) {
      let option = this.__findOption(value);
      if (option) {
        return option.label ?? "";
      }
      return value === null || value === undefined ? "" : String(value);
    },

    /**
     * Returns the option of a value
     *
     * @param {*} value a value of the model
     * @return {Object?} the option, null if the value is not in `options`
     */
    __findOption(value) {
      return (this.getOptions() || []).find(option => option.model === value) ?? null;
    },

    /**
     * @override
     */
    createWidgetForDisplay() {
      return new qxl.datagrid.ui.IconCell();
    },

    /**
     * The icons get the size which the theme gives the icons of the cells
     *
     * @override
     */
    createWidgetForEdit() {
      let style = qx.theme.manager.Appearance.getInstance().styleFrom("qxl-datagrid-cell/icon", {}) ?? {};
      let size = {};
      for (let key of ["scale", "maxWidth", "maxHeight"]) {
        if (style[key] !== undefined) {
          size[key] = style[key];
        }
      }
      let box = new qx.ui.form.SelectBox();
      box.getChildControl("atom").getChildControl("icon").set(size);
      for (let option of this.getOptions() || []) {
        let item = new qx.ui.form.ListItem(option.label ?? "", option.icon ?? null, option.model);
        if (option.icon) {
          item.getChildControl("icon").set(size);
        }
        box.add(item);
      }
      return box;
    },

    /**
     * @override
     */
    setEditorValue(editor, value) {
      editor.setModelSelection([value]);
    },

    /**
     * @override
     */
    getEditorValue(editor) {
      return editor.getModelSelection().getItem(0) ?? null;
    },

    /**
     * @override
     */
    formatForClipboard(value) {
      return this.getLabelFor(value);
    },

    /**
     * Sorts by the label which is shown
     *
     * @override
     */
    getSortValue(model) {
      return this.getLabelFor(this.getModelValue(model));
    },

    /**
     * Accepts the label or the model value of an option; an empty text is null
     *
     * @override
     */
    parseFromClipboard(text) {
      let trimmed = text.trim();
      if (trimmed === "") {
        return null;
      }
      let option = (this.getOptions() || []).find(option => option.label === trimmed || String(option.model) === trimmed);
      if (!option) {
        throw new Error(qx.locale.Manager.tr("Not one of the choices: %1", text));
      }
      return option.model;
    }
  }
});
