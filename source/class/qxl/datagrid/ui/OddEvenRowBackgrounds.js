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
        if (row.rowIndex >= 0 && (minDataRowIndex === null || minDataRowIndex > row.rowIndex)) {
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
      qx.lang.Array.clone(this._getChildren()).forEach(child => {
        let cellData = child.getUserData("qxl.datagrid.cellData");
        // prettier-ignore
        if (cellData.row < minDataRowIndex ||
            cellData.row > maxRowIndex) {
          child.setUserData("qxl.datagrid.cellData", null);
          this._remove(child);
          child.dispose();
        } else {
          let id = cellData.row;
          children[id] = child;
        }
      });

      let rowWidth = 0;
      sizesData.columns.forEach(cd => (rowWidth += cd.width));

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
          child = this._createRowWidget();
          children[id] = child;
          child.setUserData("qxl.datagrid.cellData", {
            row: rowSizeData.rowIndex
          });
          this._add(child);
        }

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

        child.setLayoutProperties({
          left: this.__sizeCalculator.getInitialOffsets().left,
          width: rowWidth,
          top: top - spaceAbove,
          height: rowSizeData.height + spaceAbove + spaceBelow
        });
        child.getSizeHint(true);
        top += rowSizeData.height + verticalSpacing;
      }
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
    }
  }
});
