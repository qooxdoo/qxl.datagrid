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
    this.__rowMetaDatas = [];
    this.__rowMetaDataByNode = {};
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
     * @typedef RowMetaData
     * @property {qx.core.Object} node the node object for the row
     * @property {Integer} level indentation level
     * @property {Boolean} canHaveChildren whether the node might have children
     * @property {*} childrenChangeListener the binding Id that is listening for changes to the children
     *
     * @type{RowMetaData[]} array of objects for each row */
    __rowMetaDatas: null,

    /** @type{Map<String,RowMetaData>} map of rows indexed by hash code of the node */
    __rowMetaDataByNode: null,

    /* @type{Promise[]?} queue of promises of background actions, eg loading nodes */
    __queue: null,

    /**
     * Apply for root
     */
    async __applyRoot(value) {
      this._data = {};
      this.__rowMetaDatas = [];
      if (value) {
        let inspector = this.getNodeInspectorFactory()(value);

        await this.queue(async () => {
          let row = this.__createRowMetaData(value, -1);
          row.canHaveChildren = inspector.canHaveChildren(value);
          // row.childrenChangeListener = inspector.addChildrenChangeListener(value, evt => this._onNodeChildrenChange(evt, value));
          row.childrenChangeListener = inspector.addChildrenChangeListener(value, this.__applyRoot, this);

          row.childRows = [];
          this.__rowMetaDataByNode[value.toHashCode()] = row;

          for (let i = 0, nodes = await inspector.getChildrenOf(value); i < nodes.length; i++) {
            let node = nodes.getItem(i);
            let childRow = this.__createRowMetaData(node, 0);
            let childInspector = this.getNodeInspectorFactory()(node);

            childRow.canHaveChildren = childInspector.canHaveChildren(node);
            this.__rowMetaDatas.push(childRow);
            this.__rowMetaDataByNode[node.toHashCode()] = childRow;
            row.childRows.push(childRow);
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
     * @returns {RowMetaData}
     */
    __createRowMetaData(node, level) {
      return {
        node: node,
        level: level,
        canHaveChildren: undefined,
        childrenChangeListener: undefined
      };
    },

    /**
     * @override
     */
    async expandNode(node) {
      let rowMetadata = this.__rowMetaDataByNode[node.toHashCode()];
      if (!rowMetadata) {
        throw new Error(`Cannot find ${node} in rows`);
      }
      if (rowMetadata.childRows || !rowMetadata.canHaveChildren) {
        return;
      }

      let inspector = this.getNodeInspectorFactory()(node);
      await this.queue(async () => {
        let children = await inspector.getChildrenOf(node);
        rowMetadata = this.__rowMetaDataByNode[node.toHashCode()]; // In case the index has changed
        if (!rowMetadata) {
          return;
        }
        rowMetadata.childrenChangeListener = inspector.addChildrenChangeListener(node, evt => this._onNodeChildrenChange(evt, node));
        let parentRowIndex = this.__rowMetaDatas.indexOf(rowMetadata);
        let childRows = [];
        for (let childNode of children) {
          let childRow = this.__createRowMetaData(childNode, rowMetadata.level + 1);
          childRow.canHaveChildren = inspector.canHaveChildren(childNode);
          childRows.push(childRow);
          this.__rowMetaDataByNode[childNode.toHashCode()] = childRow;
        }
        let before = this.__rowMetaDatas.slice(0, parentRowIndex + 1);
        let after = parentRowIndex == this.__rowMetaDatas.length - 1 ? [] : this.__rowMetaDatas.slice(parentRowIndex + 1);
        qx.lang.Array.append(before, childRows);
        qx.lang.Array.append(before, after);
        rowMetadata.childRows = childRows;
        this.__rowMetaDatas = before;
        this.fireDataEvent("changeSize", this.getSize());
      });
    },

    /**
     * Evcent handler for changes to a row's children
     */
    async _onNodeChildrenChange(evt, node) {
      // removeStart = parenVtindex + 1 + evt.start
      // removeend = parentindex + 1 + evt.end
      // metadatas.remove between start and end
      // metadatas.insert new children at start
      rowMetadata = this.__rowMetaDataByNode[node.toHashCode()]; // In case the index has changed
      let parentRowIndex = this.__rowMetaDatas.indexOf(rowMetadata);
      let changeStart = parentRowIndex + 1 + evt.getData().start;
      let changeEnd = parentRowIndex + 1 + evt.getData().end;
      let before = this.__rowMetaDatas.slice(0, changeStart);
      let after = changeEnd == this.__rowMetaDatas.length - 1 ? [] : this.__rowMetaDatas.slice(changeEnd);
      await this.queue(async () => {
        let newRowsMetaDatas = [];
        for (let childNode of evt.getData().added) {
          let inspector = this.getNodeInspectorFactory()(childNode);
          let childRow = this.__createRowMetaData(childNode, rowMetadata.level + 1);
          newRowsMetaDatas.push(childRow);
          childRow.canHaveChildren = inspector.canHaveChildren(childNode);
          rowMetadata.childRows.push(childRow);
          this.__rowMetaDataByNode[childNode.toHashCode()] = childRow;
        }
        qx.lang.Array.append(before, newRowsMetaDatas);
        qx.lang.Array.append(before, after);
        for (let removedNode of evt.getData().removed) {
          let childRow = this.__rowMetaDataByNode[removedNode.toHashCode()];
          this._removeChildRows(childRow);
          rowMetadata.childRows.splice(rowMetadata.childRows.indexOf(childRow), 1);
        }
        this.__rowMetaDatas = before;
        this.fireDataEvent("changeSize", this.getSize());
      });
    },
    /**
     * @override
     */
    async collapseNode(node) {
      let row = this.__rowMetaDataByNode[node.toHashCode()];
      if (!row) {
        throw new Error(`Cannot find ${node} in rows`);
      }
      if (!row.childRows) {
        return;
      }
      let inspector = this.getNodeInspectorFactory()(node);
      if (row.childrenChangeListener) {
        inspector.removeChildrenChangeListener(node, row.childrenChangeListener);
        delete row.childrenChangeListener;
      }
      this._removeChildRows(row);
      this.fireDataEvent("changeSize", this.getSize());
    },

    _removeChildRows(row) {
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
        delete this.__rowMetaDataByNode[childRow.node.toHashCode()];
        qx.lang.Array.remove(this.__rowMetaDatas, childRow);
      }
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
      let row = this.__rowMetaDataByNode[node.toHashCode()] || null;
      if (row !== null) {
        let rowIndex = this.__rowMetaDatas.indexOf(row);
        return new qxl.datagrid.source.Position(rowIndex, 0);
      }
      return null;
    },

    /**
     * @override
     */
    getNodeStateFor(node) {
      let row = this.__rowMetaDataByNode[node.toHashCode()] || null;
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
      if (rowIndex >= this.__rowMetaDatas.length) {
        return null;
      }
      let row = this.__rowMetaDatas[rowIndex];
      return row.node;
    },

    /**
     * @Override
     */
    getSize() {
      return new qxl.datagrid.source.Position(this.__rowMetaDatas?.length || 0, 1);
    }
  }
});
