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
 * @asset(qxl/datagrid/demo/tree/dummy-tree-data.json)
 */
qx.Class.define("qxl.datagrid.demo.tree.TreeDemoFileNode", {
  extend: qx.core.Object,

  construct() {
    super();
    this.__children = new qx.data.Array();
  },

  properties: {
    name: {
      check: "String",
      event: "changeName"
    },
    size: {
      init: 0,
      check: "Integer",
      event: "changeSize"
    },
    type: {
      init: "file",
      check: ["file", "directory"],
      event: "changeType"
    },
    permissions: {
      init: null,
      nullable: true,
      check: "String",
      event: "changePermissions"
    },
    lastModified: {
      init: null,
      nullable: true,
      check: "Date",
      event: "changeLastModified"
    }
  },

  events: {
    changeChildren: "qx.event.type.Data"
  },

  members: {
    __children: null,

    getChildren() {
      return this.__children;
    },

    resetChildren() {
      this.__children.replace([]);
    },

    setChildren(children) {
      this.__children.replace(children);
    }
  },

  statics: {
    async createDummyRoot() {
      const download = (url, opts) => {
        return new qx.Promise((resolve, reject) => {
          var req = new qx.io.request.Xhr(url);
          if (opts) {
            req.set(opts);
          }
          req.addListener("success", evt => {
            let content = req.getResponseText();
            req.dispose();
            resolve(content);
          });
          req.addListener("fail", () => {
            req.dispose();
            reject();
          });
          req.send();
        });
      };

      let uri = qx.util.ResourceManager.getInstance().toUri("qxl/datagrid/demo/tree/dummy-tree-data.json");
      let data = await download(uri);
      data = JSON.parse(data);

      const createModel = data => {
        let model = new qxl.datagrid.demo.tree.TreeDemoFileNode().set({
          name: data.name,
          permissions: data.permissions,
          lastModified: new Date(data.lastModified)
        });
        if (data.size) {
          model.set({
            size: data.size,
            type: "file"
          });
        } else {
          model.set({
            type: "directory"
          });
        }
        if (data.children) {
          for (let childData of data.children) {
            let child = createModel(childData);
            model.__children.push(child);
            4;
          }
        }
        return model;
      };

      let model = createModel(data);
      return model;
    }
  }
});
