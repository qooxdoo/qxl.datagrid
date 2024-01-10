/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de
     2023 Zenesis Limited https://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)
     * John Spackman (@johnspackman)

************************************************************************ */

/**
 * A fixed layout, based on the Qooxdoo `qx.ui.layout.Basic` layout, but supporting
 * `width` and `height` instead of `right` and `bottom`.
 */
qx.Class.define("qxl.datagrid.ui.layout.Fixed", {
  extend: qx.ui.layout.Abstract,

  members: {
    /**
     * @override
     */
    verifyLayoutProperty: qx.core.Environment.select("qx.debug", {
      true(item, name, value) {
        this.assert(name == "left" || name == "top" || name == "width" || name == "height", "The property '" + name + "' is not supported by the Fixed layout!");
        this.assertInteger(value);
      },

      false: null
    }),

    /**
     * @override
     */
    renderLayout(availWidth, availHeight, padding) {
      let children = this._getLayoutChildren();

      // Render children
      for (let i = 0, l = children.length; i < l; i++) {
        let child = children[i];
        let props = child.getLayoutProperties();

        let left = padding.left + (props.left || 0) + child.getMarginLeft();
        let top = padding.top + (props.top || 0) + child.getMarginTop();

        child.renderLayout(left, top, props.width || 0, props.height || 0);
      }
    },

    /**
     * @override
     */
    _computeSizeHint() {
      var children = this._getLayoutChildren();
      var neededWidth = 0;
      var neededHeight = 0;
      var localWidth, localHeight;

      // Iterate over children
      for (var i = 0, l = children.length; i < l; i++) {
        let child = children[i];
        let props = child.getLayoutProperties();

        localWidth = props.width + (props.left || 0) + child.getMarginLeft() + child.getMarginRight();
        localHeight = props.height + (props.top || 0) + child.getMarginTop() + child.getMarginBottom();

        if (localWidth > neededWidth) {
          neededWidth = localWidth;
        }

        if (localHeight > neededHeight) {
          neededHeight = localHeight;
        }
      }

      // Return hint
      return {
        width: neededWidth,
        height: neededHeight
      };
    }
  }
});
