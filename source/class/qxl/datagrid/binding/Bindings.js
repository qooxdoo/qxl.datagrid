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
 * Instead of just an opaque "binding id" as returned by `qx.core.Object.bind`, which can only be
 * used to unbind one thing provided that you know the correct object to unbind from, the contract of an
 * `qxl.datagrid.binding.BindingS` is that it must be capable of unbinding multiple bindinds with
 * nothing more than a call to `dispose()`
 */
qx.Class.define("qxl.datagrid.binding.Bindings", {
  extend: qx.core.Object,
  implement: [qx.core.IDisposable],

  /**
   *
   * @param {qx.data.Object} model The model to add the binding to
   * @param {String} bindingId Id of binding
   * @param {String?"binding"} bindingType The type of the binding. Either "binding" or "listener". Defaults to binding. Set to "binding " if this is a binding to a property, or "listener" if it's for a listener added with "addListener".
   */
  construct(model, bindingId, bindingType) {
    super();
    if (bindingType === undefined) {
      bindingType = "binding";
    }
    this.__bindingData = [];
    if (model && bindingId) {
      this.add(model, bindingId, bindingType);
    }
  },

  destruct() {
    this.removeAll();
  },

  events: {
    removeAll: "qx.event.type.Event"
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
     * @param {String?"binding"} bindingType The type of the binding. Either "binding" or "listener". Defaults to binding. Set to "binding " if this is a binding to a property, or "listener" if it's for a listener added with "addListener".
     */
    add(model, bindingId, bindingType) {
      if (bindingType === undefined) {
        bindingType = "binding";
      }
      this.__bindingData.push({
        model,
        bindingId,
        bindingType
      });
    },

    /**
     * Removes a binding
     *
     * @param {*} bindingId the binding ID to release
     */
    remove(bindingId) {
      let index = this.__bindingData.find(data => data.bindingId === bindingId);
      if (index > -1) {
        let data = this.__bindingData[index];
        qx.lang.Array.removeAt(this.__bindingData, index);
        this.__releaseData(data);
      }
    },

    /**
     * Releases the data
     * @param {BindingData} data
     */
    __releaseData(data) {
      if (!data.model.isDisposed() && !data.model.isDisposing()) {
        switch (data.bindingType) {
          case "binding":
            data.model.removeBinding(data.bindingId);
            break;

          case "listener":
            data.model.removeListenerById(data.bindingId);
            break;

          case "callback":
            data.bindingId(data.model);
            break;

          default:
            throw new Error("Invalid binding type" + data.bindingType);
        }
      }
    },

    /**
     * Releases all bindings
     */
    removeAll() {
      let arr = this.__bindingData;
      this.__bindingData = [];
      arr.forEach(data => this.__releaseData(data));
      this.fireEvent("removeAll");
    }
  }
});
