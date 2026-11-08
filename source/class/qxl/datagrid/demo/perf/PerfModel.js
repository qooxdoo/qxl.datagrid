/**
 * Row model for the performance page, shaped like a vehicle type record
 * (13 properties: numbers, texts, booleans, a colour and an icon name)
 */
qx.Class.define("qxl.datagrid.demo.perf.PerfModel", {
  extend: qx.core.Object,

  /**
   * @param {Integer} index row number, used to derive deterministic values
   */
  construct(index) {
    super();
    const icons = qxl.datagrid.demo.perf.PerfModel.ICONS;
    this.set({
      nr: index + 1,
      strart: "Fahrzeugart " + (index + 1),
      webfarbe: "#" + ((index * 2654435761) >>> 8).toString(16).padStart(6, "0").slice(-6),
      icon: icons[index % icons.length],
      wichtung: (index % 25) / 10,
      maxspeed: 30 + (index % 12) * 10,
      datacollectlaenge: index % 7,
      inverkehrselemente: index % 2 === 0,
      inkfz: index % 3 !== 0,
      inlkw: index % 5 === 0,
      inrad: index % 7 === 0,
      bemerkung: index % 4 === 0 ? "Bemerkung zu Zeile " + (index + 1) : "",
      gezaehlt: index % 3 === 0
    });
  },

  statics: {
    /** Choices for the icon column */
    ICONS: ["pkw", "lkw", "bus", "rad", "krad", "fuss", "tram", "zug", "lieferwagen", "sattelzug", "traktor", "roller", "lastenrad", "taxi", "wohnmobil", "anhaenger", "kehrmaschine", "muell", "notarzt", "polizei"]
  },

  properties: {
    nr: { check: "Integer", init: 0, event: "changeNr" },
    strart: { check: "String", init: "", event: "changeStrart" },
    webfarbe: { check: "String", init: "", event: "changeWebfarbe" },
    icon: { check: "String", init: "", event: "changeIcon" },
    wichtung: { check: "Number", init: 0, event: "changeWichtung" },
    maxspeed: { check: "Integer", init: 0, event: "changeMaxspeed" },
    datacollectlaenge: { check: "Integer", init: 0, event: "changeDatacollectlaenge" },
    inverkehrselemente: { check: "Boolean", init: false, event: "changeInverkehrselemente" },
    inkfz: { check: "Boolean", init: false, event: "changeInkfz" },
    inlkw: { check: "Boolean", init: false, event: "changeInlkw" },
    inrad: { check: "Boolean", init: false, event: "changeInrad" },
    bemerkung: { check: "String", init: "", event: "changeBemerkung" },
    gezaehlt: { check: "Boolean", init: false, event: "changeGezaehlt" }
  }
});
