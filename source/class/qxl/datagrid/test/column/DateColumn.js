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

qx.Class.define("qxl.datagrid.test.column.DateColumn", {
  extend: qx.dev.unit.TestCase,

  members: {
    testEditsTextInDateFormat() {
      let column = new qxl.datagrid.column.DateColumn("date").set({ dateFormat: new qx.util.format.DateFormat("yyyy-MM-dd") });
      let date = new Date(2026, 10, 9, 14, 30);

      // display, editor and clipboard share the format; texts and milliseconds in the model are shown too
      this.assertEquals("2026-11-09", column.formatForClipboard(date));
      this.assertEquals("2026-11-09", column.formatForClipboard(date.getTime()));
      this.assertEquals("", column.formatForClipboard(null));
      let parsed = column.parseFromClipboard(" 2026-11-09 ");
      this.assertEquals(new Date(2026, 10, 9).getTime(), parsed.getTime());
      this.assertNull(column.parseFromClipboard(""), "an empty text empties the cell");
      this.assertException(() => column.parseFromClipboard("tomorrow"), Error, "Not a date");

      // an unchanged text gives back the value of the model with its time of day, a changed one a new date
      let editor = column.createWidgetForEdit();
      column.setEditorValue(editor, date);
      this.assertIdentical(date, column.getEditorValue(editor));
      editor.setValue("2026-12-24");
      this.assertEquals(new Date(2026, 11, 24).getTime(), column.getEditorValue(editor).getTime());
      editor.dispose();
    }
  }
});
