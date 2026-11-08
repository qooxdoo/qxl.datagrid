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
      converter: value => this.getLabelFor(value)
    }));
  },

  properties: {
    /** The list to choose from, as objects `{label, model}`; `model` is the value written into the model */
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
      let option = (this.getOptions() || []).find(option => option.model === value);
      if (option) {
        return option.label;
      }
      return value === null || value === undefined ? "" : String(value);
    },

    /**
     * @override
     */
    createWidgetForEdit() {
      let box = new qx.ui.form.SelectBox();
      for (let option of this.getOptions() || []) {
        box.add(new qx.ui.form.ListItem(option.label, null, option.model));
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
    }
  }
});
