/**
 * Column for the performance page: shows a label, or (with `editors`) a real
 * editor widget per cell that is bound in both directions to the row model
 */
qx.Class.define("qxl.datagrid.demo.perf.PerfColumn", {
  extend: qxl.datagrid.column.Column,

  /**
   * @param {String} path property of the row model
   * @param {"text"|"number"|"bool"|"select"} kind kind of value
   * @param {Boolean} editors whether each cell gets an editor widget
   */
  construct(path, kind, editors) {
    super(path);
    this.__kind = kind;
    this.__editors = editors;
    this.setCaption(path);
    this.setMinWidth(kind === "bool" ? 60 : 110);
    if (kind === "bool") {
      this.setBindingOptions(() => ({ converter: value => (value ? "✓" : "") }));
    } else if (kind === "number") {
      this.setBindingOptions(() => ({ converter: value => String(value) }));
    }
  },

  members: {
    /** @type {String} */
    __kind: null,

    /** @type {Boolean} */
    __editors: false,

    /**
     * @override
     */
    createWidgetForDisplay() {
      if (!this.__editors) {
        return super.createWidgetForDisplay();
      }
      switch (this.__kind) {
        case "bool":
          return new qx.ui.form.CheckBox();

        case "select": {
          const box = new qx.ui.form.SelectBox();
          for (const name of qxl.datagrid.demo.perf.PerfModel.ICONS) {
            box.add(new qx.ui.form.ListItem(name, null, name));
          }
          return box;
        }

        default:
          return new qx.ui.form.TextField();
      }
    },

    /**
     * @override
     */
    bindWidget(widget, model, factory) {
      if (!this.__editors || !model) {
        return super.bindWidget(widget, model, factory);
      }
      const path = this.getPath();
      const bindings = new qxl.datagrid.binding.Bindings(model);
      switch (this.__kind) {
        case "bool":
          bindings.add(model, model.bind(path, widget, "value"));
          bindings.add(widget, widget.bind("value", model, path));
          break;

        case "select": {
          const event = "change" + qx.lang.String.firstUp(path);
          const show = () => widget.setModelSelection([model.get(path)]);
          show();
          bindings.add(model, model.addListener(event, show), "listener");
          bindings.add(
            widget,
            widget.addListener("changeSelection", evt => {
              const item = evt.getData()[0];
              if (item) {
                model.set(path, item.getModel());
              }
            }),
            "listener"
          );
          break;
        }

        case "number":
          bindings.add(model, model.bind(path, widget, "value", { converter: value => String(value) }));
          bindings.add(
            widget,
            widget.bind("value", model, path, {
              converter: value => {
                const num = Number(value);
                return isNaN(num) ? model.get(path) : num;
              }
            })
          );
          break;

        default:
          bindings.add(model, model.bind(path, widget, "value"));
          bindings.add(widget, widget.bind("value", model, path));
      }
      return bindings;
    }
  }
});
