/* ************************************************************************
 *
 *    Qooxdoo DataGrid
 *
 *    https://github.com/qooxdoo/qooxdoo
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 * *********************************************************************** */

/**
 * Sends synthetic native keyboard and pointer events, so that they take the same way through
 * qooxdoo's event handlers as real input; used by the tests and the performance page
 *
 * @ignore(PointerEvent)
 * @ignore(KeyboardEvent)
 */
qx.Class.define("qxl.datagrid.test.util.InputHelper", {
  type: "static",

  statics: {
    /** @type {Record<String, Integer>} key codes by qooxdoo key identifier */
    KEY_CODES: {
      Up: 38,
      Down: 40,
      Left: 37,
      Right: 39,
      Tab: 9,
      Home: 36,
      End: 35,
      PageUp: 33,
      PageDown: 34,
      Enter: 13,
      Escape: 27,
      F2: 113,
      Space: 32,
      Backspace: 8,
      Delete: 46,
      Apps: 93,
      F10: 121,
      A: 65
    },

    /**
     * Presses and releases a key and flushes the qooxdoo queues
     *
     * @param {String} key qooxdoo key identifier, eg "Down" or "F2"
     * @param {Object?} modifiers modifier keys held down, `{shift, ctrl}`
     */
    press(key, modifiers) {
      let keyCode = qxl.datagrid.test.util.InputHelper.KEY_CODES[key];
      if (keyCode === undefined) {
        throw new Error("Unknown key " + key);
      }
      let send = qxl.datagrid.test.util.InputHelper.__send;
      send("keydown", keyCode, 0, modifiers);
      // like a browser, Enter and Space also send keypress with a character code
      if (key == "Enter" || key == "Space") {
        send("keypress", keyCode, keyCode, modifiers);
      }
      send("keyup", keyCode, 0, modifiers);
      qx.ui.core.queue.Manager.flush();
    },

    /**
     * Types a printable character (keydown, keypress with the character code, keyup) and flushes
     * the qooxdoo queues
     *
     * @param {String} char a single character
     */
    type(char) {
      let send = qxl.datagrid.test.util.InputHelper.__send;
      let keyCode = char.toUpperCase().charCodeAt(0);
      send("keydown", keyCode, 0, null);
      send("keypress", char.charCodeAt(0), char.charCodeAt(0), null);
      send("keyup", keyCode, 0, null);
      qx.ui.core.queue.Manager.flush();
    },

    /**
     * Taps (clicks) the middle of a widget with native pointer events and flushes the qooxdoo queues;
     * qooxdoo's gesture handler turns them into `tap`, a second call within a short time into `dbltap`
     *
     * @param {qx.ui.core.Widget} widget a rendered widget
     * @param {Object?} modifiers modifier keys held down, `{shift, ctrl}`
     */
    tap(widget, modifiers) {
      let element = widget.getContentElement().getDomElement();
      let rect = element.getBoundingClientRect();
      let init = qxl.datagrid.test.util.InputHelper.__pointerInit(rect.left + rect.width / 2, rect.top + rect.height / 2, modifiers);
      element.dispatchEvent(new PointerEvent("pointerdown", init));
      element.dispatchEvent(new PointerEvent("pointerup", { ...init, buttons: 0 }));
      qx.ui.core.queue.Manager.flush();
    },

    /**
     * Drags with the mouse within a widget, from one horizontal position to another, with native
     * pointer events, and flushes the qooxdoo queues
     *
     * @param {qx.ui.core.Widget} widget a rendered widget
     * @param {Number} fromX start, in pixels from the left edge of the widget
     * @param {Number} toX end, in pixels from the left edge of the widget
     */
    drag(widget, fromX, toX) {
      const pointerInit = qxl.datagrid.test.util.InputHelper.__pointerInit;
      let element = widget.getContentElement().getDomElement();
      let rect = element.getBoundingClientRect();
      let y = rect.top + rect.height / 2;
      element.dispatchEvent(new PointerEvent("pointerdown", pointerInit(rect.left + fromX, y)));
      element.dispatchEvent(new PointerEvent("pointermove", pointerInit(rect.left + (fromX + toX) / 2, y)));
      element.dispatchEvent(new PointerEvent("pointermove", pointerInit(rect.left + toX, y)));
      element.dispatchEvent(new PointerEvent("pointerup", { ...pointerInit(rect.left + toX, y), buttons: 0 }));
      qx.ui.core.queue.Manager.flush();
    },

    /**
     * Returns the init dictionary of a native pointer event with the left mouse button
     *
     * @param {Number} clientX
     * @param {Number} clientY
     * @param {Object?} modifiers modifier keys held down, `{shift, ctrl}`
     * @return {Object}
     */
    __pointerInit(clientX, clientY, modifiers) {
      return {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 1,
        shiftKey: !!modifiers?.shift,
        ctrlKey: !!modifiers?.ctrl
      };
    },

    /**
     * Dispatches one native keyboard event to the focused element
     *
     * @param {String} type native event type
     * @param {Integer} keyCode key code
     * @param {Integer} charCode character code, 0 for keydown and keyup
     * @param {Object?} modifiers modifier keys held down, `{shift, ctrl}`
     */
    __send(type, keyCode, charCode, modifiers) {
      let evt = new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        shiftKey: !!modifiers?.shift,
        ctrlKey: !!modifiers?.ctrl
      });
      // keyCode, charCode and which cannot be passed to the constructor, qooxdoo reads them
      Object.defineProperty(evt, "keyCode", { get: () => keyCode });
      Object.defineProperty(evt, "charCode", { get: () => charCode });
      Object.defineProperty(evt, "which", { get: () => charCode || keyCode });
      (document.activeElement || document.body).dispatchEvent(evt);
    }
  }
});
