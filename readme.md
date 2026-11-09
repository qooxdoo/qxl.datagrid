# qxl.datagrid

DataGrid is a Qooxdoo UI component that provides a virtual, scrolling, spreadsheet-like and tree-like control; the main features are:

- Virtual, unlimited data source - supports millions (or billions) of rows, loaded only as needed, on demand and asynchronously
- Rich columns - define columns which determine the name and presentation of data (eg a date column etc)
- Grid or Tree style - operates as a spreadsheet-like control of rows and columns of data, or as a tree of data where each node
  in the tree is row and can have multiple columns
- Inline editing - editors on demand, validation, per cell locking, copy and paste
- Keyboard operation like `qx.ui.table` - moving, selecting, editing, sorting and resizing columns without a mouse
- Selection by row, by cell or by area, in the modes single, one, multi and additive
- Sorting in three states (ascending, descending, unsorted) and by several columns, also in trees
- Columns the user can show, hide and resize
- Screen reader support (ARIA)
- Fully stylable using Qooxdoo themes, including states for rows and cells set by the application

NOTE:: This is beta release, but will be in active use and development over the next few months.

## Trying the Demos

Included in this repo is a demo application - it's running live at https://qooxdoo.org/qxl.datagrid/

The included demo application will create a tabview showing several styles of DataGrid usage; if you would like
to try it out on your own computer, check out this repo and run it:

```
$ git clone https://github.com/qooxdoo/qxl.datagrid.git
$ cd qxl.datagrid
$ qx serve
```

and browse to http://localhost:8080

Currently the following demos are included:

- Array - an editable list of model objects using [qxl.datagrid.source.ArrayDataSource](source/class/qxl/datagrid/source/ArrayDataSource.js):
  text, number, boolean and select columns, validation, cells locked per row, changed rows and cells marked with
  `rowStates`/`cellStates`, sorting, the column menu and a context menu
- Tree - displays the file system at `./source` using [qxl.datagrid.source.tree.TreeDataSource](source/class/qxl/datagrid/source/tree/TreeDataSource.js),
  sorted on each level and opened and closed with the keys of `qx.ui.tree.Tree`
- Big Grid - displays a large (10 billion entry) grid of data using a custom [qxl.datagrid.source.IDataSource](source/class/qxl/datagrid/source/IDataSource.js)
  implementation, with all selection styles and modes

## Getting Started

To create and use a DataGrid, you must:

- create a list of one or more columns - these will be instances of classes in `qxl.datagrid.column.*`
- create an instance of `qxl.datagrid.DataGrid` and give it your list of columns
- provide a DataSource (see below) for the DataGrid to get your data from

There are two styles of grid - spreadsheet-style and tree-style; which you have depends on the type of DataSource you choose
(although if you have a tree-style, you will probably want to use the special `qxl.datagrid.column.tree.ExpansionColumn` as
your first column so that the user can click to expand/collapse parts of the tree).

For an example of a spreadsheet-like DataGrid, take a look at [qxl.datagrid.demo.array.ArrayDemo](source/class/qxl/datagrid/demo/array/ArrayDemo.js)
(one model per row) or [qxl.datagrid.demo.biggrid.BigGridDemo](source/class/qxl/datagrid/demo/biggrid/BigGridDemo.js) (one model per cell)

For an example of a tree-like DataGrid, take a look at [qxl.datagrid.demo.tree.TreeDemo](source/class/qxl/datagrid/demo/tree/TreeDemo.js)

### Coming from qx.ui.table

The DataGrid is operated like `qx.ui.table` on purpose, so users find their way around:

- the keyboard: moving the focus, Shift and Ctrl with the selection, F2/Enter to edit and Escape to cancel
- the selection modes (see the table below)
- the column menu behind a button at the right end of the header; the button takes the appearance `table/column-button`
  of your theme, like the one of `qx.ui.table`
- sorting with a click on a header, and changing the width of a column by dragging the edge of its header (a flexible
  column then gets a fixed width)

| `qx.ui.table.selection.Model`        | `selectionMode` of the DataGrid |
| ------------------------------------ | ------------------------------- |
| `SINGLE_SELECTION`                   | `single`                        |
| `MULTIPLE_INTERVAL_SELECTION`        | `multi`                         |
| `MULTIPLE_INTERVAL_SELECTION_TOGGLE` | `additive`                      |

The mode `one` (exactly one row, cannot be emptied) has no counterpart in `qx.ui.table`; `NO_SELECTION` and
`SINGLE_INTERVAL_SELECTION` have none in the DataGrid.

The API is a different one though, the DataGrid is not a drop-in replacement:

- columns (`qxl.datagrid.column.*`) and a DataSource instead of a `TableModel`, a `TableColumnModel` and cell renderers;
  every cell is a widget
- the selection holds model objects instead of row indexes, so it stays with its rows when they are sorted or inserted
- data is loaded asynchronously and on demand
- there is a tree style, and sorting has three states and may use several columns

### Theming

The DataGrid needs some custom appearances, decorators, and colours - these are defined in `qxl.datagrid.theme.*` and can be included
into your own application's theme. For example, if you app is called `myapp`, you might make this change to your Appearance:

```
qx.Theme.define("myapp.theme.Appearance", {
  extend: qx.theme.tangible.Appearance,

  include: [qxl.datagrid.theme.tangible.MAppearance]
});
```

Currently, the following themes are supported:

- Tangible (light & dark) - use `qxl.datagrid.theme.tangible.*` mixins
- Indigo & Indigo Dark - use `qxl.datagrid.theme.indigo.*` mixins
- Simple - use `qxl.datagrid.theme.simple.*` mixins

For each theme, there are three available mixins; `*.MAppearance`, `*.MColor`, and `*.MDecoration`.

Rows and cells use the appearances `qxl-datagrid-row` and `qxl-datagrid-cell`, with the states described under
[Row and Cell States](#row-and-cell-states); the column button uses `table/column-button` of your theme.
The cells and the header cell of a `NumberColumn` have the state `number`, which the themes align to the right
(`textAlign` of `qxl-datagrid-cell` and `qxl-datagrid-header-cell/label`); a column names such states in
`getWidgetStates()`.

## Key Concepts

### Data Sources

A key concept to get to grips with is the DataSource, which provides your data to the DataGrid in a two dimensional
array; this data is expected to be fetched asynchronously and on demand, which means that you can have truly massive
amounts of data stored on a slow server somewhere, and only spend time loading those parts of the data that are visible
to the user. The DataSource is expected to cache the data which is on display so that it can be obtained immediately
and synchronously - although whether the DataSource chooses to cache data which is _not_ on display is entirely up
to the implementation of the DataSource.

To create a DataSource, you have to write your own implementation of `qxl.datagrid.source.IDataSource` - but that's quite
straightforward and you can see an example in [qxl.datagrid.demo.biggrid.DummyDataSource](source/class/qxl/datagrid/demo/biggrid/DummyDataSource.js).

The TL;DR is that you provide an asynchronous method `makeAvailable` which will make sure that there is the required
range of data available; `isAvailable` is synchronous and tests whether a range is already available; and then methods
to say how big the data is and get values from your array. `isAvailable` also decides whether a large range can be
selected (see [Selection](#selection)).

One crucial point to note is that although `makeAvailable` is called with a range of columns & rows, your DataSource
MUST always also provide a model for column 0 (zero) for each row in that range - this is to allow selection by row.

### Array Data Sources

Array data sources use a simple one-dimensional array of model objects, with each model in the array representing one
row of data. This same model is then passed to each column of the corresponding row in the DataGrid, satisfying the
requirement for two-dimensional data. Each column will display some property of that object as configured, allowing for
a simplified list-like or table-like presentation.

For most use cases, it will be sufficient to instantiate [qxl.datagrid.source.ArrayDataSource](source/class/qxl/datagrid/source/ArrayDataSource.js) and
set it's `model` property to your array of model objects. However some cases with larger datasets may prefer to make
trips to the server; typically this can be handled by extending [qxl.datagrid.source.ArrayDataSource](source/class/qxl/datagrid/source/ArrayDataSource.js) and overriding
the `IsAvailable`, `makeAvailable`, and `getSize` members.

For the former use case, the implementation is quite simple. Below is a snippet containing a very basic example of how
to use an ArrayDataSource with a DataGrid - bear in mind this snippet is intended to be illustrative, not effective.

```js
const myColumns = new qxl.datagrid.column.Columns();            // create a new columns object
myColumns.add(/* ... */);                                       // add columns to the columns object as required

const myGrid = new qxl.datagrid.DataGrid(myColumns);            // create a new datagrid

const myDataSource = new qxl.datagrid.source.ArrayDataSource(); // create a new array data source
myGrid.set({ dataSource: myDataSource });                       // set the data source on the grid

const myDataArray = myapp.model.MyModel.getAll();               // generate/fetch some `qx.data.Array` of model objects
myDataSource.setModel(myDataArray);                             // set the model on the data source

                                                                // Done!
```

For a more purpose-built example, take a look at [qxl.datagrid.demo.array.ArrayDemo](source/class/qxl/datagrid/demo/array/ArrayDemo.js)

### Tree Data Sources

For a spreadsheet-style datagrid, your data is already in a two-dimensional array, but tree-style datagrid has a heirarchy
that needs to be navigated; the DataGrid still needs the data to be provided as a two-dimensional array, so the datasource
needs to be able to manipulate the tree data into that two-dimensional array.

For most use cases, the `qxl.datagrid.source.tree.TreeDataSource` data source will do all the hard work for you, provided that
you have a class that has some kind of `children` property - `qxl.datagrid.source.tree.NodeInspector` can provide all the
information that the TreeDataSource needs to navigate most structures.

However, you may need to derive from the `NodeInspector` to fine tune the presentation.

### Models

When using a spreadsheet-style DataGrid, then every cell can have it's own model object; this is easy to implement, and the
example `DummyDataSource` uses this concept. It is not always necessary (or practical) however to go down to this much
detail - the other possibility is that you have one model object per row, and use bindings to choose the values which are
displayed in each column for that row.

The TreeDataSource enforces exactly this kind of "one model per row" style of data.

### Columns

Every datagrid has at least one column, each of which is derived from `qxl.datagrid.column.Column` and controls the heading,
the sizing, the binding, and display of individual cells.

The column is able to choose how to display and bind the widgets, so you can easily provide a uniform experience for the
whole grid.

### Selection

The selection is configured on the selection manager, `grid.getSelectionManager()`:

- `selectionStyle` - `row` selects whole rows, `cell` single cells, `area` a rectangle of cells
- `selectionMode` - `single` (one row, a click on it unselects it), `one` (always exactly one), `multi` (ranges with
  Shift, more with Ctrl) or `additive` (every click or Space switches a row)

`grid.getSelection()` returns the selected model objects, `changeSelection` reports changes. Because the selection holds
every selected model, Ctrl+A and Shift ranges only select cells the DataSource has loaded (`isAvailable`); on a DataSource
loading on demand, like the big grid demo, a range reaching beyond the loaded data only moves the focus.

### Keyboard

The grid takes the keyboard focus as a whole and moves a focused cell:

| Keys                                | Effect                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Arrows, Page Up/Down, Home/End      | move the focus (Ctrl+Home/End to the first/last cell); Tab and Shift+Tab move cell by cell |
| Space                               | selects the focused row (`additive` switches it), Ctrl+Space switches it; in an editable boolean cell it switches the value |
| Shift+arrows, Shift+click           | select a range from the anchor (`multi`); Ctrl+arrows only move the focus              |
| Ctrl+A                              | selects everything (`multi` and `additive`)                                             |
| Escape                              | clears the selection (`multi` and `additive`)                                           |
| F2, Enter, a typed character        | open the editor (`editable`); a double click does as well                               |
| Enter / Tab / Escape in the editor  | keep the value and edit the cell below / the next cell, or cancel                       |
| Delete, Backspace                   | empty the focused cell                                                                  |
| Ctrl+C, Ctrl+V                      | copy the focused cell, paste into it                                                    |
| Menu key, Shift+F10                 | open the context menu of the focused cell                                               |
| Right, Left, Enter in a tree        | open a node, close it (or go to its parent), switch it                                  |
| Up in the first row                 | goes into the header: Left/Right move, Enter/Space sort (Shift adds the column), Shift+Left/Right change the width, the menu key opens the column menu, Down goes back |

### Editing

Cells can be changed when `editable` is set on the grid; a column with `readOnly` stays read only. On top of that:

- `cellEditable` - `(model, column) => Boolean`, locks single cells (eg depending on another value of the row)
- `cellValidator` - `(model, column, value, oldValue) => String?`, returns an error message to reject a value; the
  editor stays open and the cell shows the message. `setCellError`/`getCellError` report errors from elsewhere
- the event `cellValueChanged` - `{model, column, row, columnIndex, value, oldValue}`, after a value has been written

The grid creates an editor only for the cell being edited: a text field by default (`TextColumn`, `NumberColumn` with
parsing), a select box for `SelectColumn` (`options`); a `BooleanColumn` has no editor, Space or a click switches it.
`DateColumn` edits the text in its `dateFormat`. For other editors, see below.

#### Custom Editors

The editor belongs to the column, so a custom editor is a subclass of `qxl.datagrid.column.Column` (or of one of the
existing columns) which overrides three methods:

- `createWidgetForEdit()` - returns the editor, any widget; it is created only for the cell being edited and disposed
  when editing ends
- `setEditorValue(editor, value)` - puts the value of the model into the editor
- `getEditorValue(editor)` - returns the value for the model; an `Error` thrown here becomes the error of the cell and
  the editor stays open

```js
qx.Class.define("myapp.ColorColumn", {
  extend: qxl.datagrid.column.Column,

  members: {
    createWidgetForEdit() {
      let box = new qx.ui.form.ComboBox();
      ["#ff0000", "#00ff00", "#0000ff"].forEach(color => box.add(new qx.ui.form.ListItem(color)));
      return box;
    },

    setEditorValue(editor, value) {
      editor.setValue(value ?? "");
    },

    getEditorValue(editor) {
      let value = editor.getValue()?.trim();
      if (value && !/^#[0-9a-f]{6}$/i.test(value)) {
        throw new Error("Not a color: " + value);
      }
      return value || null;
    }
  }
});
```

The column is then added like any other, and the grid must be `editable`; `readOnly`, `cellEditable` and
`cellValidator` apply as for the built-in columns:

```js
const columns = new qxl.datagrid.column.Columns();
columns.add(new qxl.datagrid.column.TextColumn("name").set({ caption: "Name" }));
columns.add(new myapp.ColorColumn("color").set({ caption: "Color" }));

const grid = new qxl.datagrid.DataGrid(columns).set({ dataSource: myDataSource, editable: true });
```

Shortcuts and related methods:

- if the editor stays a text field, overriding `_formatForEdit(value)` and `_parseFromEditor(text)` is enough, like
  `NumberColumn` and `DateColumn` do; Ctrl+C and Ctrl+V use them as well
- `formatForClipboard(value)` and `parseFromClipboard(text)` change only what Ctrl+C and Ctrl+V do
- a column whose value is switched directly, like `BooleanColumn`, returns `null` from `createWidgetForEdit()` and the
  new value from `getToggledValue(value)`
- the cell on display still comes from `createWidgetForDisplay()` and `bindingOptions`

The grid knows only one kind of popup: while the list of a select box or combo box (`qx.ui.form.AbstractSelectBox`) is
open, Enter chooses in the list. With an editor that has another popup, such as a `DateField`, Enter takes the value
and ends editing.

### Row and Cell States

The application can set states on row and cell widgets for its theme, eg to mark changed rows:

- `rowStates` - `(model) => String[]?`, states for the row widget
- `cellStates` - `(model, column) => String[]?`, states for the cell widget

When the result changes, call `scheduleUpdateWidgets()`. The grid sets `selected`, `focused`, `even` and `odd` on rows
and `selected`, `focused` and `invalid` on cells itself. To style an own state without copying the appearance of the
grid, extend your appearance with `base: true`, like [the demo theme](source/class/qxl/datagrid/demo/theme/tangible/DemoAppearance.js):

```js
"qxl-datagrid-row": {
  base: true,
  style(states) {
    return states.changed && !states.selected ? { backgroundColor: "my-changed-row" } : {};
  }
}
```

### Sorting

A column with `sortable` is sorted by a click on its header (or Enter in the header): ascending, descending, unsorted;
with Shift the column is added to the sorted columns. In code, `grid.toggleSort(column, add)` does the same, and
`sortOrder` of a column can be set directly. Before the user sorts, the grid fires `beforeSort`, which can be cancelled;
`Columns` fires `changeSort` afterwards and `getSortColumns()` returns the sorted columns in their order.

A column sorts by `getSortValue(model)`, compared with `qxl.datagrid.column.Columns.compareValues`. `ArrayDataSource`
sorts a list of references and leaves your array as it is; `TreeDataSource` sorts the children of every node. A DataSource
of your own sorts when `Columns` fires `changeSort`.

### Showing, Hiding and Resizing Columns

With `columnVisibilityButtonVisible`, a button at the right end of the header opens the column menu, where the user shows
and hides columns; the menu also opens with a right click on the header. Each column has `visible`, and `hideable: false`
keeps it out of the menu.

The user changes the width of a column by dragging the right edge of its header or with Shift+Left/Right in the header,
within `minWidth` and `maxWidth`; `Column.resize(width)` does the same in code.

### Context Menu

`widgetsContextMenu` is the context menu of the cells; it also opens with the menu key and Shift+F10, for the focused cell.

### Accessibility

The grid has the role `grid` and tells screen readers its size, the focused cell (`aria-activedescendant`), the selection
(`aria-selected`, `aria-multiselectable`), locked cells (`aria-readonly`), the sort order of the headers (`aria-sort`) and
the error messages of invalid cells (`aria-invalid`, `aria-describedby`).

## Internal Concepts

### Widget Factories

The DataGrid display is divided into a header area and a "widget pane" - the header has a widgets for each of the column
headers, and the widget pane has widgets for each cell in the spreadsheet.

When adding data to the header and the pane, these widgets are created via an instance of `qxl.datagrid.ui.factory.IWidgetFactory` -
typically, you can use the defaults which are `qxl.datagrid.ui.factory.HeaderWidgetFactory` for headers and
`qxl.datagrid.ui.factory.SimpleWidgetFactory` for the widget pane

### Layers

The DataGrid has multiple layers of widgets, one for the widgets in the pane itself (ie the widgets for each of the cells) and
also a layer of row widgets - this is how the rows backgrounds are styled. When you customise the appearance of cells, leave
the background transparent unless you are specifically applying indicators such as coloring to show selection.
