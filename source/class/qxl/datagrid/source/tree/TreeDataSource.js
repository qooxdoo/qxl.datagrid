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
     * @property {qxl.datagrid.binding.Bindings} childrenChangeListener Binding object for the change listener of the node's children
     *
     * @type{RowMetaData[]} array of objects for each visible row*/
    __rowMetaDatas: null,

    /** @type{Map<String,RowMetaData>} map of row metadatas for all visible rows, indexed by hash code of the node */
    __rowMetaDataByNode: null,

    /** @type{Promise[]?} queue of promises of background actions, eg loading nodes */
    __queue: null,

    /** @type{Promise} resolves when the queue empties, is null if the queue is already empty */
    __promiseQueueEmpty: null,

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
          this.__rowMetaDataByNode[value.toHashCode()] = row;
          row.canHaveChildren = inspector.canHaveChildren(value);
          if (!row.canHaveChildren) throw new Error("Root must be able to have children!");
          if (!row.childrenChangeBinding) row.childrenChangeBinding = inspector.createChildrenChangeBinding(value, () => this.refreshNodeChildren(value));
          await this._insertChildRows(value);
        });
      }
      this.fireDataEvent("changeSize", this.getSize());
    },
    async _insertChildRows(node) {
      let inspector = this.getNodeInspectorFactory()(node);
      let rowMd = this._getNodeMetaData(node);
      rowMd.childRows = [];
      this.__rowMetaDataByNode[node.toHashCode()] = rowMd;
      for (let i = 0, nodes = await inspector.getChildrenOf(node); i < nodes.length; i++) {
        let node = nodes.getItem(i);
        let childRow = this.__createRowMetaData(node, 0);
        let childInspector = this.getNodeInspectorFactory()(node);

        childRow.canHaveChildren = childInspector.canHaveChildren(node);
        this.__rowMetaDatas.push(childRow);
        this.__rowMetaDataByNode[node.toHashCode()] = childRow;
        rowMd.childRows.push(childRow);
      }
      this.fireDataEvent("changeSize", this.getSize());
    },

    /**
     * Refreshes node's children. Does not preserve expanded descendants.
     * @param {*} node
     */
    async refreshNodeChildren(node) {
      await this.queue(async () => {
        await this._collapseNode(node);
        await this._expandNode(node);
        this.fireDataEvent("changeSize", this.getSize());
      });
    },

    getShownChildren(node) {
      return this._getNodeMetaData(node).childRows.map(md => md.node);
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
        childrenChangeBinding: undefined
      };
    },

    /**
     * Returns node metadata for the node object
     */
    _getNodeMetaData(node) {
      return this.__rowMetaDataByNode[node.toHashCode()];
    },

    /**@override */
    async expandNode(node) {
      await this.queue(() => this._expandNode(node));
    },
    /**
     * Expands given node.
     * Is called inside of this class, so its operation is not queued.
     * @param {*} node
     */
    async _expandNode(node) {
      let inspector = this.getNodeInspectorFactory()(node);
      console.log("treebug: expandnode start");
      let children = await inspector.getChildrenOf(node);
      let rowMetadata = this._getNodeMetaData(node);
      if (!rowMetadata) {
        throw new Error(`Cannot find ${node} in rows`);
      }
      if (rowMetadata.childRows || !rowMetadata.canHaveChildren) {
        return;
      }
      rowMetadata.childrenChangeBinding = inspector.createChildrenChangeBinding(node, () => this.refreshNodeChildren(node));
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
      console.log("treebug: expandnode end");
    },

    /**
     * Reveals node in tree, even if it's not currently shown.
     * All ancestors of node are expanded.
     * @param {qx.data.Object} node
     */
    async revealNode(node) {
      /**
       * returns the path to a node (target) in the tree;
       * @param {qx.data.Object} node The node to return the path for
       * @returns {qx.data.Array} The path. It does not include the root and the node itself.
       */
      const getPathToNode = node => {
        let path = new qx.data.Array();
        let inspector = this.getNodeInspectorFactory()();
        var parent = inspector.getParentOf(node);
        while (inspector.getParentOf(parent)) {
          path.insertAt(0, parent);
          parent = inspector.getParentOf(parent);
        }
        return path;
      };
      await this.queue(async () => {
        let ancestors = getPathToNode(node);
        if (!ancestors) throw new Error("Cannot find node in tree");
        for (var a = 0; a < ancestors.length; a++) {
          await this._expandNode(ancestors.getItem(a));
        }
      });
    },

    /**
     * @override
     */
    async collapseNode(node) {
      await this.queue(this._collapseNode.bind(this, node));
    },

    async _collapseNode(node) {
      let row = this.__rowMetaDataByNode[node.toHashCode()];
      if (!row) {
        throw new Error(`Cannot find ${node} in rows`);
      }
      if (!row.childRows) {
        return;
      }
      if (row.childrenChangeBinding) {
        row.childrenChangeBinding.dispose();
        delete row.childrenChangeBinding;
      }
      this._removeChildRows(row);
      this.fireDataEvent("changeSize", this.getSize());
    },

    /**
     * Performs a full update of the nodes in the tree,
     * such that all the children of the expanded nodes are shown
     */
    async updateNodes() {
      return this.refreshNodeChildren(this.getRoot());
    },

    /**
     * Recursively removes metatdats of children of specified row, from this.__rowMetaDatas
     * @param {JavaScript Object} row Metadata for row for which to remove children
     */
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
      this.__queue.push(fn);
      if (this.__queue.length == 1) {
        await this.__executeNextQueue();
      }
    },

    /**
     * Executes the next function in the queue
     */
    async __executeNextQueue() {
      if (this.__queue.length == 0) {
        if (this.__promiseQueueEmpty) {
          this.__promiseQueueEmpty.resolve();
          this.__promiseQueueEmpty = null;
        }
        return;
      }
      let fn = this.__queue[0];
      // await qx.Promise.resolve(fn());
      await fn();
      this.__queue.shift();
      await this.__executeNextQueue();
    },

    /**
     * Called to flush the queue and wait for all the promises to be complete
     */
    async flushQueue() {
      if (this.__promiseQueueEmpty) {
        await this.__promiseQueueEmpty;
      } else if (this.__queue.length) {
        this.__promiseQueueEmpty = new qx.Promise();
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
