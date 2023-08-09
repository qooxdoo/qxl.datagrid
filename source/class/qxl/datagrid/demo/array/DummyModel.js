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
 *      * Will Johnson (willsterjohnson)
 *
 * *********************************************************************** */

qx.Class.define("qxl.datagrid.demo.array.DummyModel", {
  extend: qx.core.Object,

  construct() {
    super();
    this.set({
      title: this._randomTitle(),
      author: this._randomAuthor(),
      date: this._randomDate()
    });
  },

  properties: {
    title: {
      nullable: false,
      check: "String",
      event: "changeTitle"
    },
    author: {
      nullable: false,
      check: "String",
      event: "changeAuthor"
    },
    date: {
      nullable: false,
      check: "Date",
      event: "changeDate"
    }
  },

  members: {
    _randomNoun() {
      const nouns = [
        "Cat",
        "Dog",
        "Mouse",
        "Horse",
        "Cow",
        "Pig",
        "Chicken",
        "Duck",
        "Goose",
        "Sheep",
        "Goat",
        "Rabbit",
        "Hamster",
        "Gerbil",
        "Rat",
        "Parrot",
        "Cockatoo",
        "Canary",
        "Finch",
        "Goldfish",
        "Tropical Fish",
        "Frog",
        "Toad",
        "Newt",
        "Salamander",
        "Lizard",
        "Snake",
        "Turtle",
        "Tortoise",
        "Crocodile",
        "Alligator",
        "Dinosaur",
        "Pterodactyl",
        "Tyrannosaurus Rex",
        "Robin",
        "Blue Jay",
        "Sparrow",
        "Owl",
        "Eagle",
        "Hawk",
        "Falcon",
        "Vulture",
        "Penguin",
      ];
      return nouns[Math.floor(Math.random() * nouns.length)];
    },

    _randomTitle() {
      const noun1 = this._randomNoun();
      const noun2 = this._randomNoun();
      const title = [`The ${noun1} and The ${noun2}`, `The ${noun1}'s ${noun2}`, `The ${noun1}`][Math.floor(Math.random() * 3)];
      return title;
    },

    _randomSurname() {
      const surnames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas"];
      return surnames[Math.floor(Math.random() * surnames.length)];
    },

    _randomAuthor() {
      const forenameInitial = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
      const surname = this._randomSurname();
      const title = ["Mr", "Mrs", "Dr", "Prof"][Math.floor(Math.random() * 4)];
      return `${title} ${forenameInitial}. ${surname}`;
    },

    _randomDate() {
      const now = new Date();
      const then = new Date(now.getTime() - Math.floor(Math.random() * 15 * 365 * 24 * 60 * 60 * 1000));
      return then;
    }
  }
});
