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
