qx.Class.define("qxl.datagrid.util.Labels", {
  extend: qx.core.Object,

  statics: {
    /**
     * Returns the columnIndex as a spreadsheet-style letters, eg 0 == A, 1 == B, 26 == AA, 27 == AB, etc
     *
     * @param {Integer} columnIndex
     * @return {String}
     */
    getColumnLetters(columnIndex) {
      columnIndex++;
      let letters = "";
      while (columnIndex > 0) {
        let temp = (columnIndex - 1) % 26;
        letters = String.fromCharCode(temp + 65) + letters;
        columnIndex = (columnIndex - temp - 1) / 26;
      }
      return letters;
    }
  }
});
