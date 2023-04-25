/**
 * Instead of just an opaque "binding id" as returned by `qx.core.Object.bind`, which can only be
 * used to unbind one thing provided that you know the correct object to unbind from, the contract of an
 * `qxl.datagrid.binding.BindingS` is that it must be capable of unbinding multiple bindinds with
 * nothing more than a call to `dispose()`
 */
qx.Class.define("qxl.datagrid.binding.Bindings", {
  extend: qx.core.Object,
  implement: [qx.core.IDisposable],

  construct(model, bindingId) {
    super();
    this.__bindingData = [];
    if (model && bindingId) {
      this.add(model, bindingId);
    }
  },

  destruct() {
    this.__bindingData.forEach(data => {
      if (!data.model.isDisposed() && !data.model.isDisposing()) {
        data.model.removeBinding(data.bindingId);
      }
    });
  },

  members: {
    /**
     * @typedef BindingData
     * @property {qx.core.Object} model the object with a binding
     * @property {*} bindingId the binding ID to release
     *
     * @type{BindingData[]} binding data
     */
    __bindingData: null,

    /**
     *
     * @param {qx.core.Object} model the object with a binding
     * @param {*} bindingId the binding ID to release
     */
    add(model, bindingId) {
      this.__bindingData.push({
        model,
        bindingId
      });
    }
  }
});
