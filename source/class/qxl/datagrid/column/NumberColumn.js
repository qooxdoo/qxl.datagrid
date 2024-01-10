/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2020 Zenesis Ltd, https://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * John Spackman (https://githuib.com/johnspackman, john.spackman@zenesis.com)

************************************************************************ */

/**
 * Displays a value as a number with 2 decimal places
 */
qx.Class.define("qxl.datagrid.column.NumberColumn", {
  extend: qxl.datagrid.column.Column,

  construct() {
    super();
    this.setBindingOptions((widget, model) => {
      converter: value => (value ? value.toFixed(2) : "");
    });
  }
});
