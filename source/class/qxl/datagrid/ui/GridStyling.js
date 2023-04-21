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
    /** Number of header rows */
    numHeaderRows: {
      init: 1,
      check: "Integer",
      apply: "__applyXxx"
    },

    /** Number of fixed rows that dont scroll */
    numFixedRows: {
      init: 0,
      check: "Integer",
      apply: "__applyXxx"
    },

    /* Number of fixed columns that dont scroll */
    numFixedColumns: {
      init: 0,
      check: "Integer",
      apply: "__applyXxx"
    },

    /** Minimum height of each row */
    minRowHeight: {
      init: 28,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx"
    },

    /** Maximum height of each row */
    maxRowHeight: {
      init: null,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx"
    },

    /** Minimum column width */
    minColumnWidth: {
      init: null,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx"
    },

    /** Maximum column width */
    maxColumnWidth: {
      init: null,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx"
    },

    /** How much space to leave between columns */
    horizontalSpacing: {
      init: 3,
      themeable: true,
      check: "Integer",
      apply: "__applyXxx"
    },

    /** How much space to leave between rows */
    verticalSpacing: {
      init: 2,
      themeable: true,
      check: "Integer",
      apply: "__applyXxx"
    }
  },

  events: {
    /** Fired when any of the properties change */
    change: "qx.event.type.Event"
  },

  members: {
    /**
     * Generic apply method
     */
    __applyXxx() {
      this.fireEvent("change");
    }
  }
});
