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
 * A vertical layout for the datagrid, which supports layering via a `layer` layout property
 */
qx.Class.define("qxl.datagrid.ui.layout.Layered", {
  extend: qx.ui.layout.Abstract,

  members: {
    /**
     * @override
     */
    verifyLayoutProperty: qx.core.Environment.select("qx.debug", {
      true(item, name, value) {
        this.assert(name == "layer", "The property '" + name + "' is not supported by the Fixed layout!");
        this.assertInteger(value);
      },

      false: null
    }),

    /**
     * Gets the children, grouped by layer
     *
     * @typedef LayerData
     * @property {Widget[]} children
     *
     * @returns {LayerData[]}
     */
    __getChildrenInLayers() {
      let layers = [];

      let maxLayerId = 0;
      this._getLayoutChildren().forEach(child => {
        let props = child.getLayoutProperties();
        let layerId = props.layer || 0;
        if (layerId > maxLayerId) {
          maxLayerId = layerId;
        }
        let layer = layers[layerId];
        if (!layer) {
          layer = layers[layerId] = { layerId: layerId, children: [] };
        }
        layer.children.push(child);
      });
      layers.forEach(layer => (layer.zIndex = maxLayerId - layer.layerId));

      return layers;
    },

    /**
     * @override
     */
    renderLayout(availWidth, availHeight, padding) {
      let layers = this.__getChildrenInLayers();

      for (let layerId in layers) {
        let top = padding.top;
        let layer = layers[layerId];
        layer.children.forEach((child, index) => {
          let hint = child.getSizeHint();
          let height = 0;

          if (index == layer.children.length - 1) {
            height = availHeight - top - child.getMarginTop() - child.getMarginBottom();
          } else {
            height = hint.height;

            // Limit computed value
            if (hint.minHeight !== null && height < hint.minHeight) {
              height = hint.minHeight;
            } else if (hint.maxHeight !== null && height > hint.maxHeight) {
              height = hint.maxHeight;
            }
          }

          let left = padding.left + child.getMarginLeft();

          let elem = child.getContentElement();
          elem.setStyle("zIndex", layer.zIndex);

          child.renderLayout(left, top + child.getMarginTop(), availWidth, height);
          top += child.getMarginTop() + height + child.getMarginBottom();
        });
      }
    },

    /**
     * @override
     */
    _computeSizeHint() {
      return {
        width: 10,
        height: 10
      };
    }
  }
});
