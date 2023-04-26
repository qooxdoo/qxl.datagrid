/* ************************************************************************
 *
 *    Qooxdoo DataGrid
 *
 *    https://github.com/qooxdoo/qooxdoo
 *
 *    Copyright:
 *      2022-23 Zenesis Limited, https://www.zenesis.com
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 *    Authors:
 *      * John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * *********************************************************************** */

/**
 * This model object represents a piece of fabricated data for one of the cells
 * in the massive spreadsheet demo in `qxl.datagrid.demo.biggrid.BigGridDemo`,
 * i.e. one instance of this object relates to one row/column combination.
 *
 * The `DummyDataSource` will create and dispose of these on demand, out of a
 * fabricated data set of 10 billion model objects
 */
qx.Class.define("qxl.datagrid.demo.biggrid.DummyModel", {
  extend: qx.core.Object,

  properties: {
    rowIndex: {
      init: 0,
      check: "Integer",
      event: "changeRowIndex",
      apply: "__applyXxx"
    },
    columnIndex: {
      init: 0,
      check: "Integer",
      event: "changeColumnIndex",
      apply: "__applyXxx"
    },
    text: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeText",
      apply: "__applyXxx"
    },
    header: {
      init: false,
      check: "Boolean",
      event: "changeHeader",
      apply: "__applyXxx"
    },
    label: {
      check: "String",
      event: "changeLabel"
    }
  },

  members: {
    /**
     * Apply for various properties
     */
    __applyXxx() {
      let label = qxl.datagrid.util.Labels.getColumnLetters(this.getColumnIndex()) + this.getRowIndex();
      let text = (this.getText() || "").trim();
      if (text.length) {
        label += " " + text;
      }
      if (this.isHeader()) {
        label = "H:" + label;
      }
      this.setLabel(label);
    },

    /**
     * @Override
     */
    toString() {
      return this.getRowIndex() + ":" + this.getColumnIndex();
    }
  }
});
