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

qx.Class.define("qxl.datagrid.ui.GridStyling", {
  extend: qx.core.Object,

  properties: {
    numHeaderRows: {
      init: 0,
      check: "Integer",
      apply: "__applyXxx"
    },

    numFixedRows: {
      init: 0,
      check: "Integer",
      apply: "__applyXxx"
    },

    numFixedColumns: {
      init: 0,
      check: "Integer",
      apply: "__applyXxx"
    },

    minRowHeight: {
      init: 28,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx"
    },

    maxRowHeight: {
      init: null,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx"
    },

    horizontalSpacing: {
      init: 3,
      themeable: true,
      check: "Integer",
      apply: "__applyXxx"
    },

    verticalSpacing: {
      init: 2,
      themeable: true,
      check: "Integer",
      apply: "__applyXxx"
    }
  },

  events: {
    change: "qx.event.type.Event"
  },

  members: {
    __applyXxx() {
      this.fireEvent("change");
    }
  }
});
