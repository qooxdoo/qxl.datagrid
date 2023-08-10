# qxl.datagrid

DataGrid is a Qooxdoo UI component that provides a virtual, scrolling, spreadsheet-like and tree-like control; the main features are:

- Virtual, unlimited data source - supports millions (or billions) of rows, loaded only as needed, on demand and asynchronously
- Rich columns - define columns which determine the name and presentation of data (eg a date column etc)
- Grid or Tree style - operates as a spreadsheet-like control of rows and columns of data, or as a tree of data where each node
  in the tree is row and can have multiple columns
- Fully stylable using Qooxdoo themes

NOTE:: This is beta release, but will be in active use and development over he next few months.

### Coming Soon (tm)

- The current version is read only, but it will be possible to add edit cells inline in the near future.

## Trying the Demos

Included in this repo is a demo application - it's running live at http://qooxdoo.org/qxl-datagrid.qooxdoo.github.io/

The included demo application will create a tabview showing both styles of DataGrid usage (ie spreadsheet or tree); if you would like
to try it out on your own computer, check out this repo and run it:

```
$ git clone https://github.com/qooxdoo/qxl.datagrid.git
$ cd qxl.datagrid
$ qx serve
```

and browse to http://localhost:8080

## Getting Started

To create and use a DataGrid, you must:

- create a list of one or more columns - these will be instances of classes in `qxl.datagrid.column.*`
- create an instance of `qxl.datagrid.DataGrid` and give it your list of columns
- provide a DataSource (see below) for the DataGrid to get your data from

There are two styles of grid - spreadsheet-style and tree-style; which you have depends on the type of DataSource you choose
(although if you have a tree-style, you will probably want to use the special `qxl.datagrid.column.tree.ExpansionColumn` as
your first column so that the user can click to expand/collapse parts of the tree).

For an example of a spreadsheet-like DataGrid, take a look at [qxl.datagrid.demo.biggrid.BigGridDemo](source/class/qxl/datagrid/demo/biggrid/BigGridDemo.js)

For an example of a tree-like DataGrid, take a look at [qxl.datagrid.demo.tree.TreeDemo](source/class/qxl/datagrid/demo/tree/TreeDemo.js)

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

## Key Concepts

### Data Sources

A key concept to get to grips with is the DataSource, which provides your data to the DataGrid in a two dimensional
array; this data is expected to be fetched asynchronously and on demand, which means that you can have truely massive
amounts of data stored on a slow server somewhere, and only spend time loading those parts of the data that are visible
to the user. The DataSource is expected to cache the data which is on display so that it can be obtained immediately
and synchronously - although whether the DataSource chooses to cache data which is _not_ on display is entirely up
to the implementation of the DataSource.

To create a DataSource, you have to write your own implementation of `qxl.datagrid.source.IDataSource` - but that's quite
straightforward and you can see an example in [qxl.datagrid.demo.biggrid.DummyDataSource](source/class/qxl/datagrid/demo/biggrid/DummyDataSource.js).

The TL;DR is that you provide an asynchronous method `makeAvailable` which will make sure that there is the required
range of data available; `isAvailable` is synchronous and tests whether a range is already available; and then methods
to say how big the data is and get values from your array.

One crucial point to note is that although `makeAvailable` is called with a range of columns & rows, your DataSource
MUST always also provide a model for column 0 (zero) for each row in that range - this is to allow selection by row.

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
