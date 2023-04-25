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
 * Provides an implementation of `qxl.datagrid.source.IDataSource` which navigates a tree
 * structure to provide the tree as a flat array of rows
 */
qx.Class.define("qxl.datagrid.source.tree.TreeDataSource", {
  extend: qxl.datagrid.source.AbstractDataSource,
  implement: [qxl.datagrid.source.tree.ITreeDataSource],

  construct(nodeInspectorFactory, columns) {
    super();
    this.__rows = [];
    this.__rowsByNode = {};
    this.__queue = [];
    if (nodeInspectorFactory) {
      this.setNodeInspectorFactory(nodeInspectorFactory);
    }
    if (columns) {
      this.setColumns(columns);
    }
  },

  properties: {
    /** The root object at the top of the tree */
    root: {
      nullable: true,
      apply: "__applyRoot"
    },

    /** Function that is called with a node to get the `qxl.datagrid.source.tree.NodeInspector` for that node */
    nodeInspectorFactory: {
      check: "Function"
    }
  },

  events: {
    /** Fired when the size changes */
    changeSize: "qx.event.type.Data"
  },

  members: {
    /**
     * @typedef RowData
     * @property {qx.core.Object} node the node object for the row
     * @property {Integer} level indentation level
     *
     * @type{RowData[]} array of objects for each row */
    __rows: null,

    /** @type{Map<String,Object>} map of rows indexed by hash code of the node */
    __rowsByNode: null,

    /* @type{Promise[]?} queue of promises of background actions, eg loading nodes */
    __queue: null,

    /**
     * Apply for root
     */
    async __applyRoot(value) {
      this._data = {};
      this.__rows = [];
      if (value) {
        let inspector = this.getNodeInspectorFactory()(value);
        await this.queue(async () => {
          for (let i = 0, nodes = await inspector.getChildrenOf(value); i < nodes.length; i++) {
            let node = nodes.getItem(i);
            let row = this.__createRow(node, 0);
            row.canHaveChildren = inspector.canHaveChildren(node);
            this.__rows.push(row);
            this.__rowsByNode[node.toHashCode()] = row;
          }
        });
      }
      this.fireDataEvent("changeSize", this.getSize());
    },

    /**
     * Creates a row entry object
     *
     * @param {qx.core.Object} node
     * @param {Integer} level the indentation level
     * @returns {RowData}
     */
    __createRow(node, level) {
      return {
        node: node,
        level: level
      };
    },

    /**
     * Expands a node
     *
     * @param {qx.core.Object} node
     */
    async expandNode(node) {
      let row = this.__rowsByNode[node.toHashCode()];
      if (!row) {
        throw new Error(`Cannot find ${node} in rows`);
      }
      if (row.childRows) {
        return;
      }

      let inspector = this.getNodeInspectorFactory()(node);
      await this.queue(async () => {
        let children = await inspector.getChildrenOf(node);
        row = this.__rowsByNode[node.toHashCode()]; // In case the index has changed
        if (!row) {
          return;
        }
        let parentRowIndex = this.__rows.indexOf(row);
        let childRows = [];
        for (let childNode of children) {
          let childRow = this.__createRow(childNode, row.level + 1);
          childRow.canHaveChildren = inspector.canHaveChildren(childNode);
          childRows.push(childRow);
          this.__rowsByNode[childNode.toHashCode()] = childRow;
        }
        let before = this.__rows.slice(0, parentRowIndex + 1);
        let after = parentRowIndex == this.__rows.length - 1 ? [] : this.__rows.slice(parentRowIndex + 1);
        qx.lang.Array.append(before, childRows);
        qx.lang.Array.append(before, after);
        row.childRows = childRows;
        this.__rows = before;
        this.fireDataEvent("changeSize", this.getSize());
      });
    },

    /**
     * Collapses a node
     *
     * @param {qx.core.Object} node
     */
    async collapseNode(node) {
      let row = this.__rowsByNode[node.toHashCode()];
      if (!row) {
        throw new Error(`Cannot find ${node} in rows`);
      }
      if (!row.childRows) {
        return;
      }
      let toRemove = [];
      const removeChildRows = row => {
        if (row.childRows) {
          for (let childRow of row.childRows) {
            toRemove.push(childRow);
            removeChildRows(childRow);
          }
        }
      };
      removeChildRows(row);
      delete row.childRows;
      for (let childRow of toRemove) {
        delete this.__rowsByNode[childRow.node.toHashCode()];
        qx.lang.Array.remove(this.__rows, childRow);
      }
      this.fireDataEvent("changeSize", this.getSize());
    },

    /**
     * Calls a function which can return a promise (an async function) and keeps that
     * promise in a queue so that we can check later that all the async work has been
     * completed
     *
     * @param {Function} fn
     * @returns {*} whatever the function returns
     */
    async queue(fn) {
      let promise = fn();
      if (!qx.lang.Type.isPromise(promise)) {
        return promise;
      }
      promise = promise.then(result => {
        qx.lang.Array.remove(this.__queue, promise);
        return result;
      });
      this.__queue.push(promise);
      return await promise;
    },

    /**
     * Called to flush the queue and wait for all the promises to be complete
     */
    async flushQueue() {
      while (this.__queue.length) {
        let queue = qx.lang.Array.clone(this.__queue);
        await qx.Promise.all(queue);
      }
    },

    /**
     * @Override
     */
    async makeAvailable(range) {
      await this.flushQueue();
    },

    /**
     * @Override
     */
    isAvailable(range) {
      return !this.__queue.length;
    },

    /**
     * @Override
     */
    getModelForPosition(pos) {
      let node = this.getNode(pos.getRow());
      return node || null;
    },

    /**
     * @override
     */
    getPositionOfModel(node) {
      let row = this.__rowsByNode[node.toHashCode()] || null;
      if (row !== null) {
        let rowIndex = this.__rows.indexOf(row);
        return new qxl.datagrid.source.Position(rowIndex, 0);
      }
      return null;
    },

    /**
     * @override
     */
    getNodeStateFor(node) {
      let row = this.__rowsByNode[node.toHashCode()] || null;
      if (!row) {
        return null;
      }
      return {
        level: row.level,
        state: row.canHaveChildren ? (row.childRows ? "open" : "closed") : "none"
      };
    },

    /**
     * Returns the node for a given row
     *
     * @param {Integer} rowIndex
     * @returns {*}
     */
    getNode(rowIndex) {
      if (rowIndex >= this.__rows.length) {
        return null;
      }
      let row = this.__rows[rowIndex];
      return row.node;
    },

    /**
     * @Override
     */
    getSize() {
      return new qxl.datagrid.source.Position(this.__rows?.length || 0, 1);
    }
  }
});
