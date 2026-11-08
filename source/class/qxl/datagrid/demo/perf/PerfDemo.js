/**
 * Performance page: one grid per page load, configured by the URL, and a
 * measuring script at `window.perf`.
 *
 * URL parameters:
 * - `perf`  : "virtual" (default), "clipped" or "table" (qx.ui.table as baseline)
 * - `rows`  : number of rows (default 1000)
 * - `cells` : "label" (default: labels in the cells, typed columns, an editor opens on demand) or
 *             "editors" (an editor widget in every cell)
 * - `dyn`   : "1" for `dynamicSizing: "rows"`
 *
 * In the console: `await perf.runAll()` returns the results as an object; `perf.focusLatency()` and
 * `perf.editLatency()` measure keyboard focus and opening editors.
 */
qx.Class.define("qxl.datagrid.demo.perf.PerfDemo", {
  extend: qx.ui.container.Composite,

  construct() {
    super(new qx.ui.layout.VBox(4));
    const params = new URLSearchParams(window.location.search);
    this.__config = {
      grid: params.get("perf") || "virtual",
      rows: parseInt(params.get("rows") || "1000", 10),
      cells: params.get("cells") || "label",
      dyn: params.get("dyn") === "1"
    };
    this.__info = new qx.ui.basic.Label(JSON.stringify(this.__config));
    this.add(this.__info);
    window.perf = this;
  },

  statics: {
    /** Columns like the vehicle type dialog: [path, kind] */
    COLUMNS: [
      ["nr", "number"],
      ["strart", "text"],
      ["webfarbe", "text"],
      ["icon", "select"],
      ["wichtung", "number"],
      ["maxspeed", "number"],
      ["datacollectlaenge", "number"],
      ["inverkehrselemente", "bool"],
      ["inkfz", "bool"],
      ["inlkw", "bool"],
      ["inrad", "bool"],
      ["bemerkung", "text"],
      ["gezaehlt", "bool"]
    ]
  },

  members: {
    /** @type {Object} configuration from the URL */
    __config: null,

    /** @type {qx.ui.basic.Label} */
    __info: null,

    /** @type {qxl.datagrid.DataGrid|qx.ui.table.Table} */
    __grid: null,

    /** @type {qx.data.Array} */
    __model: null,

    /** @type {Object} results of the initial rendering */
    __initResult: null,

    /**
     * Builds the grid and the data and measures the initial rendering
     */
    async init() {
      const cfg = this.__config;
      this.__model = new qx.data.Array(Array.from({ length: cfg.rows }, (_, i) => new qxl.datagrid.demo.perf.PerfModel(i)));
      await this.__nextFrames(2);

      const t0 = performance.now();
      let tSize = t0;
      if (cfg.grid === "table") {
        this.__grid = this.__createTable();
        this.add(this.__grid, { flex: 1 });
        this.__grid.getTableModel().setData(this.__toRows(this.__model));
      } else {
        const columns = new qxl.datagrid.column.Columns();
        for (const [path, kind] of this.constructor.COLUMNS) {
          // "editors" puts an editor into every cell, otherwise the grid opens one on demand
          columns.add(cfg.cells === "editors" ? new qxl.datagrid.demo.perf.PerfColumn(path, kind, true) : this.__createColumn(path, kind));
        }
        const dataSource = new qxl.datagrid.source.ArrayDataSource();
        dataSource.setColumns(columns);
        const GridClass = cfg.grid === "clipped" ? qxl.datagrid.ClippedScrollDataGrid : qxl.datagrid.VirtualScrollDataGrid;
        this.__grid = new GridClass(columns).set({ editable: cfg.cells !== "editors" });
        if (cfg.dyn) {
          this.__grid.setDynamicSizing("rows");
        }
        this.__grid.setDataSource(dataSource);
        this.add(this.__grid, { flex: 1 });
        const sized = new Promise(resolve => dataSource.addListenerOnce("changeSize", resolve));
        dataSource.setModel(this.__model);
        await sized;
        tSize = performance.now();
      }
      await this.__settle();
      const tDone = performance.now();
      this.__initResult = {
        initMs: Math.round(tDone - t0),
        renderMs: Math.round(tDone - tSize),
        ...this.widgets()
      };
      this.__info.setValue(JSON.stringify(this.__config) + " init " + JSON.stringify(this.__initResult));
    },

    /**
     * Counts the cell widgets and all registered qooxdoo objects
     *
     * @return {{cellWidgets: Integer, objects: Integer, heapMB: Number}}
     */
    widgets() {
      let cellWidgets = null;
      if (this.__config.grid !== "table") {
        cellWidgets = this.__grid.getQxObject("widgetPane")._getChildren().length;
      }
      const objects = Object.keys(qx.core.ObjectRegistry.getRegistry()).length;
      const heapMB = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      return { cellWidgets, objects, heapMB };
    },

    /**
     * Scrolls row by row, one step per frame
     *
     * @param {Integer} steps number of steps
     * @return {Promise<Object>} statistics of JS work and frame time per step
     */
    async scrollLines(steps = 300) {
      this.__scrollToRow(0);
      await this.__settle();
      const work = [];
      const frames = [];
      let last = await this.__nextFrame();
      for (let i = 1; i <= steps; i++) {
        const t = performance.now();
        this.__scrollToRow(i);
        qx.ui.core.queue.Manager.flush();
        work.push(performance.now() - t);
        const now = await this.__nextFrame();
        frames.push(now - last);
        last = now;
      }
      return { workMs: this.__stats(work), frameMs: this.__stats(frames) };
    },

    /**
     * Jumps to random rows, like dragging the scrollbar
     *
     * @param {Integer} jumps number of jumps
     * @return {Promise<Object>} statistics of JS work per jump
     */
    async scrollJumps(jumps = 50) {
      const work = [];
      let seed = 1;
      for (let i = 0; i < jumps; i++) {
        seed = (seed * 16807) % 2147483647;
        const row = seed % Math.max(1, this.__config.rows - 30);
        const t = performance.now();
        this.__scrollToRow(row);
        qx.ui.core.queue.Manager.flush();
        work.push(performance.now() - t);
        await this.__nextFrame();
      }
      return { workMs: this.__stats(work) };
    },

    /**
     * Changes one visible value, then replaces all rows (like "cancel")
     *
     * @return {Promise<Object>} times in milliseconds
     */
    async changes() {
      this.__scrollToRow(0);
      await this.__settle();
      let t = performance.now();
      const first = this.__model.getItem(0);
      first.setStrart(first.getStrart() + " geändert");
      if (this.__config.grid === "table") {
        this.__grid.getTableModel().setValueById("strart", 0, first.getStrart());
      }
      qx.ui.core.queue.Manager.flush();
      const changeOneMs = performance.now() - t;

      const copies = this.__model.toArray().map((row, i) => new qxl.datagrid.demo.perf.PerfModel(i));
      t = performance.now();
      if (this.__config.grid === "table") {
        this.__grid.getTableModel().setData(this.__toRows(new qx.data.Array(copies)));
      } else {
        this.__model.replace(copies);
      }
      await this.__settle();
      const replaceAllMs = performance.now() - t;
      return { changeOneMs: this.__round(changeOneMs), replaceAllMs: Math.round(replaceAllMs) };
    },

    /**
     * Scrolls from top to bottom and back several times and reports the
     * objects and heap afterwards
     *
     * @param {Integer} passes number of passes
     * @return {Promise<Object>} counts after the passes
     */
    async passes(passes = 20) {
      const step = Math.max(1, Math.floor(this.__config.rows / 20));
      for (let p = 0; p < passes; p++) {
        for (let row = 0; row < this.__config.rows; row += step) {
          this.__scrollToRow(row);
          qx.ui.core.queue.Manager.flush();
          await this.__nextFrame();
        }
        this.__scrollToRow(0);
        qx.ui.core.queue.Manager.flush();
        await this.__nextFrame();
      }
      await this.__settle();
      return this.widgets();
    },

    /**
     * Runs all measurements
     *
     * @return {Promise<Object>} all results
     */
    async runAll() {
      const result = { config: this.__config, init: this.__initResult };
      result.lines = await this.scrollLines();
      result.jumps = await this.scrollJumps();
      if (this.__grid.getEditable?.()) {
        result.focus = await this.focusLatency();
        result.edit = await this.editLatency();
      }
      result.changes = await this.changes();
      result.afterPasses = await this.passes();
      // eslint-disable-next-line no-console
      console.log("PERF " + JSON.stringify(result));
      return result;
    },

    /**
     * Measures from an arrow key to the focus on the next cell, scrolling along beyond the rows on
     * display; the key events take the way of real key strokes
     *
     * @param {Integer} steps number of key strokes
     * @return {Promise<Object>} statistics of JS work and time to the next frame per key stroke
     */
    async focusLatency(steps = 60) {
      const grid = this.__grid;
      this.__scrollToRow(0);
      grid.focus();
      grid.setFocusedPosition(0, 0);
      await this.__settle();
      const work = [];
      const frames = [];
      for (let i = 0; i < steps; i++) {
        const t = performance.now();
        qxl.datagrid.test.util.InputHelper.press(i % 10 == 9 ? "Right" : "Down");
        work.push(performance.now() - t);
        frames.push((await this.__nextFrame()) - t);
      }
      return { workMs: this.__stats(work), frameMs: this.__stats(frames) };
    },

    /**
     * Measures from F2 to the editor on display, alternating text, number and select columns
     *
     * @param {Integer} steps number of editors opened
     * @return {Promise<Object>} statistics of JS work and time to the next frame per editor
     */
    async editLatency(steps = 30) {
      const grid = this.__grid;
      const helper = qxl.datagrid.test.util.InputHelper;
      this.__scrollToRow(0);
      grid.focus();
      await this.__settle();
      const work = [];
      const frames = [];
      const columns = [1, 5, 3];
      for (let i = 0; i < steps; i++) {
        grid.setFocusedPosition(i % 20, columns[i % columns.length]);
        await this.__nextFrame();
        const t = performance.now();
        helper.press("F2");
        work.push(performance.now() - t);
        frames.push((await this.__nextFrame()) - t);
        if (!grid.isEditing()) {
          throw new Error("No editor after F2");
        }
        helper.press("Escape");
      }
      return { workMs: this.__stats(work), frameMs: this.__stats(frames) };
    },

    /**
     * Creates a column for a kind of value, with the editor the column brings along
     *
     * @param {String} path property of the row model
     * @param {"text"|"number"|"bool"|"select"} kind kind of value
     * @return {qxl.datagrid.column.Column}
     */
    __createColumn(path, kind) {
      let column;
      if (kind == "number") {
        column = new qxl.datagrid.column.NumberColumn(path);
      } else if (kind == "bool") {
        column = new qxl.datagrid.column.BooleanColumn(path);
      } else if (kind == "select") {
        column = new qxl.datagrid.column.SelectColumn(
          path,
          qxl.datagrid.demo.perf.PerfModel.ICONS.map(name => ({ label: name, model: name }))
        );
      } else {
        column = new qxl.datagrid.column.TextColumn(path);
      }
      return column.set({ caption: path, minWidth: kind == "bool" ? 60 : 110 });
    },

    /**
     * Scrolls the grid so that the given row is the first one on display
     *
     * @param {Integer} row
     */
    __scrollToRow(row) {
      const grid = this.__grid;
      if (this.__config.grid === "table") {
        grid.getPaneScroller(0).setScrollY(row * grid.getRowHeight());
      } else if (this.__config.grid === "clipped") {
        grid.scrollToY(row * grid.getStyling().getMinRowHeight());
      } else {
        grid.setStartRowIndex(Math.min(row, Math.max(0, this.__config.rows - 1)));
      }
    },

    /**
     * Creates the baseline table with the same columns
     *
     * @return {qx.ui.table.Table}
     */
    __createTable() {
      const columns = this.constructor.COLUMNS;
      const model = new qx.ui.table.model.Simple();
      model.setColumns(
        columns.map(([path]) => path),
        columns.map(([path]) => path)
      );
      const table = new qx.ui.table.Table(model);
      const columnModel = table.getTableColumnModel();
      columns.forEach((column, i) => {
        if (column[1] === "bool") {
          columnModel.setDataCellRenderer(i, new qx.ui.table.cellrenderer.Boolean());
        }
      });
      return table;
    },

    /**
     * @param {qx.data.Array} model
     * @return {Object[]} rows as maps for `qx.ui.table.model.Simple`
     */
    __toRows(model) {
      const paths = this.constructor.COLUMNS.map(([path]) => path);
      return model.toArray().map(row => paths.map(path => row.get(path)));
    },

    /**
     * Waits until the grid has finished updating and two frames are painted
     */
    async __settle() {
      for (let i = 0; i < 20; i++) {
        qx.ui.core.queue.Manager.flush();
        await this.__nextFrame();
        if (!this.__grid?._updatingPromise) {
          break;
        }
      }
      await this.__nextFrames(2);
    },

    /**
     * @return {Promise<Number>} timestamp of the next animation frame
     */
    __nextFrame() {
      return new Promise(resolve => window.requestAnimationFrame(resolve));
    },

    /**
     * @param {Integer} count number of frames to wait
     */
    async __nextFrames(count) {
      for (let i = 0; i < count; i++) {
        await this.__nextFrame();
      }
    },

    /**
     * @param {Number[]} values
     * @return {Object} p50, p95, max and the number of values above 16.7 and 50 ms
     */
    __stats(values) {
      const sorted = [...values].sort((a, b) => a - b);
      const at = q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
      return {
        p50: this.__round(at(0.5)),
        p95: this.__round(at(0.95)),
        max: this.__round(sorted[sorted.length - 1]),
        over16: values.filter(v => v > 16.7).length,
        over50: values.filter(v => v > 50).length
      };
    },

    /**
     * @param {Number} value
     * @return {Number} value with one decimal
     */
    __round(value) {
      return Math.round(value * 10) / 10;
    }
  }
});
