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
     * @property {boolean} canHaveChildren whether the node might have children
     * @property {qxl.datagrid.binding.Bindings} childrenChangeBinding Binding object for the change listener of the node's children
     * @prop {RowMetaData[]} [childRowMetas] array of child row metadata
     */

    /** @type {RowMetaData[]} array of objects for each visible row */
    __rowMetaDatas: null,

    /** @type {Record<string, RowMetaData>} map of row metadatas for all visible rows, indexed by hash code of the node */
    __rowMetaDataByNode: null,

    /** @type {(() => Promise<void>)[] | null} queue of promises of background actions, eg loading nodes */
    __queue: null,

    /** @type {Promise<void>} resolves when the queue empties, is null if the queue is already empty */
    __promiseQueueEmpty: null,

    /**@type {boolean} */
    __hasExecution: false,

    /**
     * Apply for root
     */
    async __applyRoot(value, oldValue) {
      await this.queue(async () => {
        this._data = {};
        this.__rowMetaDatas = [];
        if (oldValue) {
          let oldRowMetaDatas = this.__rowMetaDatas;
          this.__rowMetaDataByNode = {};
          this.__rowMetaDatas = [];
          for (let rowMeta in oldRowMetaDatas) {
            this.__disposeRowMetaData(rowMeta);
          }
        }
        if (value) {
          let inspector = this.getNodeInspectorFactory()(value);

          let row = this.__createRowMetaData(value, -1);
          this.__rowMetaDataByNode[value.toHashCode()] = row;
          row.canHaveChildren = inspector.canHaveChildren(value);
          if (!row.canHaveChildren) {
            throw new Error("Root must be able to have children!");
          }
          if (!row.childrenChangeBinding) {
            row.childrenChangeBinding = inspector.createChildrenChangeBinding(value, () => this.refreshNodeChildren(value));
          }
          await this._insertChildRows(value);
        }
        this.fireDataEvent("changeSize", this.getSize());
      });
    },

    async _insertChildRows(node) {
      let inspector = this.getNodeInspectorFactory()(node);
      let rowMeta = this._getNodeMetaData(node);
      rowMeta.childRowMetas = [];
      this.__rowMetaDataByNode[node.toHashCode()] = rowMeta;
      for (let i = 0, nodes = await inspector.getChildrenOf(node); i < nodes.length; i++) {
        let node = nodes.getItem(i);
        let childRowMeta = this.__createRowMetaData(node, 0);
        let childInspector = this.getNodeInspectorFactory()(node);

        childRowMeta.canHaveChildren = childInspector.canHaveChildren(node);
        childRowMeta.parentMeta = rowMeta;
        this.__rowMetaDatas.push(childRowMeta);
        this.__rowMetaDataByNode[node.toHashCode()] = childRowMeta;
        rowMeta.childRowMetas.push(childRowMeta);
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

    /**
     * Returns an array of nodes which are on display
     * @param {*} node
     * @returns {Object[]?} Null if this node is not expanded
     */
    getShownChildren(node) {
      return this._getNodeMetaData(node).childRowMetas?.map(md => md.node) ?? null;
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
     * Disposes of a row meta data obect
     *
     * @param {RowMetaData} rowMeta
     */
    __disposeRowMetaData(rowMeta) {
      if (rowMeta.childrenChangeBinding) {
        rowMeta.childrenChangeBinding.dispose();
        delete rowMeta.childrenChangeBinding;
      }
    },

    /**
     * Returns node metadata for the node object
     */
    _getNodeMetaData(node) {
      return this.__rowMetaDataByNode[node.toHashCode()];
    },

    /**@override */
    async expandNode(node) {
      await this.queue(async () => {
        let rowMeta = this._getNodeMetaData(node);
        // Check that the node is in the tree - it might have been removed since we were queued
        if (rowMeta) {
          await this._expandNode(node);
        }
      });
    },

    /**
     * Expands given node.
     * Is called inside of this class, so its operation is not queued.
     * @param {*} node
     */
    async _expandNode(node) {
      let inspector = this.getNodeInspectorFactory()(node);
      let children = await inspector.getChildrenOf(node);
      let rowMeta = this._getNodeMetaData(node);
      if (!rowMeta) {
        this.error(`Cannot find ${node} in rows`);
        return null;
      }
      if (rowMeta.childRowMetas || !rowMeta.canHaveChildren) {
        return;
      }
      rowMeta.childrenChangeBinding = inspector.createChildrenChangeBinding(node, () => this.refreshNodeChildren(node));
      let parentRowIndex = this.__rowMetaDatas.indexOf(rowMeta);
      let childRowMetas = [];
      for (let childNode of children) {
        if (!childNode) {
          continue;
        }
        let childInspector = this.getNodeInspectorFactory()(childNode);
        let childRowMeta = this.__createRowMetaData(childNode, rowMeta.level + 1);
        childRowMeta.canHaveChildren = childInspector.canHaveChildren(childNode);
        childRowMetas.push(childRowMeta);
        childRowMeta.parentMeta = rowMeta;
        this.__rowMetaDataByNode[childNode.toHashCode()] = childRowMeta;
      }
      let before = this.__rowMetaDatas.slice(0, parentRowIndex + 1);
      let after = parentRowIndex == this.__rowMetaDatas.length - 1 ? [] : this.__rowMetaDatas.slice(parentRowIndex + 1);
      qx.lang.Array.append(before, childRowMetas);
      qx.lang.Array.append(before, after);
      rowMeta.childRowMetas = childRowMetas;
      this.__rowMetaDatas = before;
      this.fireDataEvent("changeSize", this.getSize());
    },

    /**
     * Reveals node in tree, even if it's not currently shown.
     * All ancestors of node are expanded.
     * @param {qx.core.Object} node
     */
    async revealNode(node) {
      /**
       * returns the path to a node (target) in the tree;
       * @param {qx.core.Object} node The node to return the path for
       * @returns {Promise<qx.data.Array>} The path. It does not include the root and the node itself.
       */
      const getPathToNode = async node => {
        let path = new qx.data.Array();
        let inspector = this.getNodeInspectorFactory()(node);
        var parent = await inspector.getParentOf(node);
        while (parent && (await inspector.getParentOf(parent))) {
          path.insertAt(0, parent);
          parent = await inspector.getParentOf(parent);
        }
        return path;
      };
      await this.queue(async () => {
        let ancestors = await getPathToNode(node);
        if (!ancestors) {
          this.error("Cannot find node in tree");
          return;
        }
        for (var a = 0; a < ancestors.length; a++) {
          await this._expandNode(ancestors.getItem(a));
        }
      });
    },

    /**
     * @override
     */
    async collapseNode(node) {
      await this.queue(() => {
        let rowMeta = this._getNodeMetaData(node);
        // Check that the node is in the tree - it might have been removed since we were queued
        if (rowMeta) {
          this._collapseNode(node);
        }
      });
    },

    /**
     * Collapses a given node; called inside of this class, so its operation is not queued.
     *
     * @param {*} node
     */
    async _collapseNode(node) {
      let rowMeta = this._getNodeMetaData(node);
      if (!rowMeta) {
        this.warn(`Cannot find ${node} in rows`);
        return;
      }
      if (!rowMeta.childRowMetas) {
        return;
      }
      if (rowMeta.childrenChangeBinding) {
        rowMeta.childrenChangeBinding.dispose();
        delete rowMeta.childrenChangeBinding;
      }
      this._removeChildRows(rowMeta);
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
     * @param {RowMetaData} rowMeta Metadata for row for which to remove children
     */
    _removeChildRows(rowMeta) {
      let toRemove = [];
      const removeChildRows = rowMeta => {
        if (rowMeta.childRowMetas) {
          for (let childRowMeta of rowMeta.childRowMetas) {
            toRemove.push(childRowMeta);
            removeChildRows(childRowMeta);
            this.__disposeRowMetaData(childRowMeta);
          }
        }
      };
      removeChildRows(rowMeta);
      delete rowMeta.childRowMetas;
      for (let childRowMeta of toRemove) {
        delete this.__rowMetaDataByNode[childRowMeta.node.toHashCode()];
        qx.lang.Array.remove(this.__rowMetaDatas, childRowMeta);
      }
    },

    /**
     * Calls a function which can return a promise (an async function) and keeps that
     * promise in a queue so that we can check later that all the async work has been
     * completed
     *
     * @param {Function} fn
     * @returns {Promise<void>}
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
      this.__hasExecution = true;
      if (this.__queue.length == 0) {
        if (this.__promiseQueueEmpty) {
          this.__promiseQueueEmpty.resolve();
          this.__promiseQueueEmpty = null;
        }
        this.__hasExecution = false;
        return;
      }
      let fn = this.__queue[0];
      await fn();
      this.__queue.shift();
      await this.__executeNextQueue();
    },

    /**
     * Called to flush the queue and wait for all the promises to be complete
     */
    async flushQueue() {
      if (!this.__hasExecution) {
        return;
      }
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
     * @Override
     */
    isModelValid(value) {
      return !!this.getPositionOfModel(value);
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
        state: row.canHaveChildren ? (row.childRowMetas ? "open" : "closed") : "none"
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
     *
     * @param {qx.core.Object} node
     * @returns {qx.core.Object}
     */
    getParentOf(node) {
      let meta = this.__rowMetaDataByNode[node.toHashCode()];
      if (!meta) {
        this.error("Cannot get parent of node. Node is not displayed in tree.");
        return null;
      }

      return meta.parentMeta?.node ?? null;
    },

    /**
     * @Override
     */
    getSize() {
      return new qxl.datagrid.source.Position(this.__rowMetaDatas?.length || 0, 1);
    }
  }
});
