qx.Class.define("qxl.datagrid.source.tree.TreeDataSource", {
  extend: qxl.datagrid.source.AbstractDataSource,

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

  members: {
    /** @type{Object} array of objects for each row */
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
            let row = this.__createRow(node);
            this.__rows.push(row);
            this.__rowsByNode[node.toHashCode()] = row;
          }
        });
      }
      this.fireEvent("change");
    },

    /**
     * Creates a row entry object
     *
     * @param {*} node
     * @returns
     */
    __createRow(node) {
      return {
        node: node
      };
    },

    /**
     * Expands a node
     *
     * @param {*} node
     */
    async expandNode(node) {
      let row = this.__rowsByNode[node.toHashCode()];
      if (!row) {
        throw new Error(`Cannot find ${node} in rows`);
      }
      if (node.childRows) {
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
          let row = this.__createRow(childNode);
          childRows.push(row);
          this.__rowsByNode[node.toHashCode()] = row;
        }
        let before = parentRowIndex == 0 ? [] : this.__rows.slice(0, parentRowIndex + 1);
        let after = parentRowIndex == this.__rows.length - 1 ? [] : this.__rows.slice(parentRowIndex + 1);
        qx.lang.Array.append(before, childRows);
        qx.lang.Array.append(before, after);
        row.childRows = childRows;
        this.__rows = before;
        this.fireEvent("change");
      });
    },

    /**
     * Collapses a node
     *
     * @param {*} node
     */
    async collapseNode(node) {
      let row = this.__rowsByNode[node.toHashCode()];
      if (!row) {
        throw new Error(`Cannot find ${node} in rows`);
      }
      if (!node.childRows) {
        return;
      }
      for (let childRow of node.childRows) {
        delete this.__rowsByNode[childRow.node.toHashCode()];
        qx.lang.Array.remove(this.__rows, childRow);
      }
      this.fireEvent("change");
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
    getValueAt(pos) {
      let node = this.getNode(pos.getRow());
      if (node == null) {
        return null;
      }

      let columnIndex = pos.getColumn();
      let columns = this.getColumns();
      if (columnIndex == -1) {
        return node;
      }
      if (columns == null || columnIndex >= columns.getLength()) {
        return null;
      }

      let column = columns.getColumn(columnIndex);
      let value = node["get" + qx.lang.String.firstUp(column.getPath())]();
      return value;
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
      return this.__rows?.length || 0;
    }
  }
});
