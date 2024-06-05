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

  // iconPath, iconPathOptions,
  properties: {
    iconPathProvider: {
      check: "Function",
      nullable: true
    }
  },

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
      if (state == null) {
        debugger;
        return bindings;
      }
      widget.setIndentationLevel(state.level);
      widget.setState(state.state);
      const iconPathProvider = this.getIconPathProvider();
      if (iconPathProvider) {
        const iconPath = iconPathProvider(model);
        if (iconPath) {
          widget.setIcon(iconPath);
        }
      }
      let listenerId = widget.addListener("changeState", async evt => {
        let state = evt.getData();
        if (state == "open") {
          await factory.getDataSource().expandNode(model);
        } else if (state == "closed") {
          await factory.getDataSource().collapseNode(model);
        }
      });
      bindings.add(widget, listenerId);
      return bindings;
    }
  }
});
