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
 * Special column for expanding tree nodes - this depends on the datasource being an
 * instance of `qxl.datagrid.source.tree.TreeDataSource`
 */
qx.Class.define("qxl.datagrid.column.tree.ExpansionColumn", {
  extend: qxl.datagrid.column.Column,

  members: {
    /**
     * @Override
     */
    createWidgetForDisplay() {
      return new qxl.datagrid.column.tree.ExpansionWidget();
    },

    /**
     * @Override
     */
    bindWidget(widget, model, factory) {
      let bindings = super.bindWidget(widget, model);
      let state = factory.getDataSource().getNodeStateFor(model);
      widget.setIndentationLevel(state.level);
      widget.setState(state.state);
      widget.addListener("changeState", evt => {
        let state = evt.getData();
        if (state == "open") {
          factory.getDataSource().expandNode(model);
        } else if (state == "closed") {
          factory.getDataSource().collapseNode(model);
        }
      });
      return bindings;
    }
  }
});
