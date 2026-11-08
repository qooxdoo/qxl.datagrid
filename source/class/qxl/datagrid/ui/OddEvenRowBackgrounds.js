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
 * Provides a layer of widgets which are the background for the rows in the datagrid
 */
qx.Class.define("qxl.datagrid.ui.OddEvenRowBackgrounds", {
  extend: qx.ui.core.Widget,

  construct(sizeCalculator, dataSource, selectionManager, widgetAppearance) {
    super();
    this.__sizeCalculator = sizeCalculator;
    this.__widgetAppearance = widgetAppearance || "qxl-datagrid-row";
    this._setLayout(new qxl.datagrid.ui.layout.Fixed());

    this.__selectionManager = selectionManager;
    selectionManager.addListener("changeSelectionStyle", () => this.updateWidgets());
    selectionManager.addListener("changeSelection", () => {
      if (selectionManager.getSelectionStyle() == "row") {
        this.updateWidgets();
      }
    });
    selectionManager.addListener("changeFocused", () => {
      if (selectionManager.getSelectionStyle() == "row") {
        this.updateWidgets();
      }
    });
    if (dataSource) {
      this.setDataSource(dataSource);
    }
  },

  properties: {
    /** The data source */
    dataSource: {
      init: null,
      check: "qxl.datagrid.source.IDataSource",
      event: "changeDataSource"
    }
  },

  members: {
    /** @type{qxl.datagrid.ui.GridSizeCalculator} */
    __sizeCalculator: null,

    /** @type{String} the appearance to set on each widget */
    __widgetAppearance: null,

    /** @type{Function?} `(row, column) => String`, the DOM id of a cell, see `setCellIdFunction` */
    __cellIdFunction: null,

    /**
     * Sets how to get the DOM id of a cell, so that each row can own its cells for screen readers
     * (`aria-owns`); the cells are not children of the row widgets in the DOM
     *
     * @param {Function?} fn `(row, column) => String`, eg `qxl.datagrid.ui.WidgetPane#getCellId`
     */
    setCellIdFunction(fn) {
      this.__cellIdFunction = fn;
    },

    /**
     * Sets role, index and owned cells of a row widget; only writes the attributes when the row or
     * the columns on display have changed
     *
     * @param {qx.ui.core.Widget} widget the row widget
     * @param {Integer} row row in the data source
     * @param {Object[]} columns the columns on display (`ColumnData` of `GridSizeCalculator`)
     * @param {Integer} headerRowCount number of header rows, which come first in `aria-rowindex`
     */
    __setRowAria(widget, row, columns, headerRowCount) {
      if (!this.__cellIdFunction) {
        return;
      }
      let key = row + ":" + (columns[0]?.columnIndex ?? 0) + ":" + columns.length;
      if (widget.getUserData("qxl.datagrid.ariaKey") === key) {
        return;
      }
      widget.setUserData("qxl.datagrid.ariaKey", key);
      let element = widget.getContentElement();
      element.setAttribute("role", "row");
      element.setAttribute("aria-rowindex", row + headerRowCount + 1);
      element.setAttribute("aria-owns", columns.map(column => this.__cellIdFunction(row, column.columnIndex)).join(" "));
    },

    /**
     * Called to update the widgets and synchronise the sizes
     */
    updateWidgets() {
      let styling = this.__sizeCalculator.getStyling();
      let sizesData = this.__sizeCalculator.getSizes();
      if (!sizesData) {
        return;
      }

      let minRowIndex = null;
      let maxRowIndex = null;
      let minDataRowIndex = null;
      sizesData.rows.forEach(row => {
        if (row.rowIndex >= styling.getNumFixedRows() && (minDataRowIndex === null || minDataRowIndex > row.rowIndex)) {
          minDataRowIndex = row.rowIndex;
        }
        if (minRowIndex === null || minRowIndex > row.rowIndex) {
          minRowIndex = row.rowIndex;
        }
        if (maxRowIndex === null || maxRowIndex < row.rowIndex) {
          maxRowIndex = row.rowIndex;
        }
      });

      let children = {};
      // widgets of rows leaving the display are reused for rows entering it
      let spareWidgets = [];
      this._getChildren().forEach(child => {
        let cellData = child.getUserData("qxl.datagrid.cellData");
        if (cellData.row < minDataRowIndex || cellData.row > maxRowIndex) {
          spareWidgets.push(child);
        } else {
          children[cellData.row] = child;
        }
      });
      // taken in row order, so that after a jump each widget keeps its position
      spareWidgets.sort((a, b) => b.getUserData("qxl.datagrid.cellData").row - a.getUserData("qxl.datagrid.cellData").row);

      let rowWidth = 0;
      sizesData.columns.forEach(cd => (rowWidth += cd.width));
      rowWidth += styling.getHorizontalSpacing() * (sizesData.columns.length - 1);

      let top = this.__sizeCalculator.getInitialOffsets().top;
      let verticalSpacing = styling.getVerticalSpacing();
      let spaceAbove = Math.ceil(verticalSpacing / 2);
      let spaceBelow = verticalSpacing - spaceAbove;
      for (let visibleRowIndex = 0; visibleRowIndex < sizesData.rows.length; visibleRowIndex++) {
        let rowSizeData = sizesData.rows[visibleRowIndex];
        // Negative rowIndex means its a header row
        if (rowSizeData.rowIndex < 0) {
          continue;
        }

        let id = "" + rowSizeData.rowIndex;

        let child = children[id];
        if (!child) {
          child = spareWidgets.pop();
          if (!child) {
            child = this._createRowWidget();
            this._add(child);
          }
          children[id] = child;
          child.setUserData("qxl.datagrid.cellData", {
            row: rowSizeData.rowIndex
          });
        }
        this.__setRowAria(child, rowSizeData.rowIndex, sizesData.columns, styling.getNumHeaderRows());

        let isSelected = false;
        let isFocused = false;
        if (this.__selectionManager.getSelectionStyle() == "row") {
          let model = this.getDataSource().getModelForPosition(new qxl.datagrid.source.Position(rowSizeData.rowIndex, 0));
          isSelected = this.__selectionManager.isSelected(model);
          isFocused = this.__selectionManager.getFocused() === model;
        }
        if (isSelected) {
          child.addState("selected");
        } else {
          child.removeState("selected");
        }
        if (isFocused) {
          child.addState("focused");
        } else {
          child.removeState("focused");
        }

        if (rowSizeData.rowIndex % 2 == 0) {
          child.addState("even");
          child.removeState("odd");
        } else {
          child.addState("odd");
          child.removeState("even");
        }

        let layoutProperties = {
          left: this.__sizeCalculator.getInitialOffsets().left,
          width: rowWidth,
          top: top - spaceAbove,
          height: rowSizeData.height + spaceAbove + spaceBelow
        };
        // every change of layout properties invalidates the layout, so only for real changes
        let props = child.getLayoutProperties();
        if (props.left !== layoutProperties.left || props.top !== layoutProperties.top || props.width !== layoutProperties.width || props.height !== layoutProperties.height) {
          child.setLayoutProperties(layoutProperties);
        }
        top += rowSizeData.height + verticalSpacing;
      }

      spareWidgets.forEach(child => {
        this._remove(child);
        child.dispose();
      });
    },

    /**
     * Creates a widget to be a row
     *
     * @returns {qx.ui.core.Widget}
     */
    _createRowWidget() {
      return new qx.ui.basic.Atom().set({
        appearance: this.__widgetAppearance
      });
    },

    /**
     * Allows row appearance to be set outside of the constructor
     * @param appearance
     */
    setRowAppearance(appearance) {
      this.__widgetAppearance = appearance;
      this._getChildren().forEach(child => child.setAppearance(appearance));
    }
  }
});
