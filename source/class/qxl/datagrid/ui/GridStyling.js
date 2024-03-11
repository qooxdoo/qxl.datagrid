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
 * Collects all the styling information of together
 */
qx.Class.define("qxl.datagrid.ui.GridStyling", {
  extend: qx.core.Object,

  properties: {
    /** Number of header rows */
    numHeaderRows: {
      init: 1,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeNumHeaderRows"
    },

    /** Number of fixed rows that dont scroll */
    numFixedRows: {
      init: 0,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeNumFixedRows"
    },

    /* Number of fixed columns that dont scroll */
    numFixedColumns: {
      init: 0,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeNumFixedColumns"
    },

    /** Minimum height of each row */
    minRowHeight: {
      init: 22,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeMinRowHeight"
    },

    /** Maximum height of each row */
    maxRowHeight: {
      init: null,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeMaxRowHeight"
    },

    /** Target height of each header row */
    headerRowHeight: {
      init: null,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeHeaderRowHeight"
    },

    /** Minimum column width */
    minColumnWidth: {
      init: null,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeMinColumnWidth"
    },

    /** Maximum column width */
    maxColumnWidth: {
      init: null,
      nullable: true,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeMaxColumnWidth"
    },

    /** How much space to leave between columns */
    horizontalSpacing: {
      init: 3,
      themeable: true,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeHorizontalSpacing"
    },

    /** How much space to leave between rows */
    verticalSpacing: {
      init: 2,
      themeable: true,
      check: "Integer",
      apply: "__applyXxx",
      event: "changeVerticalSpacing"
    },

    // todo: colspan here, use it in wpane/hrows/oeBgs, col-specific colspan takes priority over this.
    /**
     * A callback used to determine how many columns a cell should fill. This
     * also includes header cells at negative indexes.
     *
     * If the returned value is not a number, is zero or is negative, the
     * colspan will default to 1. If a non-integer value is returned, it will
     * always be rounded down.
     *
     * For grid cells, the behavior of colSpan will be overridden by
     * {@link qxl.datagrid.column.Column#shouldFillWidth} if that property's
     * value function returns `true`.
     *
     * For a given column, if that column specifies
     * {@link qxl.datagrid.column.Column#colSpan} then that value function will
     * be used and this one will be ignored. Columns may defer back to this
     * function by calling their first argument (no parameters necessary).
     *
     * @type {(model: any, child: qx.ui.core.Widget, relativePosition: qxl.datagrid.source.Position, absolutePosition: qxl.datagrid.source.Position) => Integer}
     */
    colSpan: {
      init: null,
      check: "Function",
      nullable: true,
      event: "changecolSpan"
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
