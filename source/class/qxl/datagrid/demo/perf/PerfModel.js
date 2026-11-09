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
      number: index + 1,
      name: "Vehicle type " + (index + 1),
      webColor: "#" + ((index * 2654435761) >>> 8).toString(16).padStart(6, "0").slice(-6),
      icon: icons[index % icons.length],
      weight: (index % 25) / 10,
      maxSpeed: 30 + (index % 12) * 10,
      collectLength: index % 7,
      inTraffic: index % 2 === 0,
      inMotorVehicles: index % 3 !== 0,
      inTrucks: index % 5 === 0,
      inBicycles: index % 7 === 0,
      remark: index % 4 === 0 ? "Remark on row " + (index + 1) : "",
      counted: index % 3 === 0
    });
  },

  statics: {
    /** Choices for the icon column */
    ICONS: [
      "car",
      "truck",
      "bus",
      "bicycle",
      "motorcycle",
      "pedestrian",
      "tram",
      "train",
      "van",
      "semitrailer",
      "tractor",
      "scooter",
      "cargoBike",
      "taxi",
      "camper",
      "trailer",
      "sweeper",
      "garbageTruck",
      "ambulance",
      "police"
    ]
  },

  properties: {
    number: { check: "Integer", init: 0, event: "changeNumber" },
    name: { check: "String", init: "", event: "changeName" },
    webColor: { check: "String", init: "", event: "changeWebColor" },
    icon: { check: "String", init: "", event: "changeIcon" },
    weight: { check: "Number", init: 0, event: "changeWeight" },
    maxSpeed: { check: "Integer", init: 0, event: "changeMaxSpeed" },
    collectLength: { check: "Integer", init: 0, event: "changeCollectLength" },
    inTraffic: { check: "Boolean", init: false, event: "changeInTraffic" },
    inMotorVehicles: { check: "Boolean", init: false, event: "changeInMotorVehicles" },
    inTrucks: { check: "Boolean", init: false, event: "changeInTrucks" },
    inBicycles: { check: "Boolean", init: false, event: "changeInBicycles" },
    remark: { check: "String", init: "", event: "changeRemark" },
    counted: { check: "Boolean", init: false, event: "changeCounted" }
  }
});
