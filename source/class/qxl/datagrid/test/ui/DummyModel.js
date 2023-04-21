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

qx.Class.define("qxl.datagrid.test.ui.DummyModel", {
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
    }
  }
});
