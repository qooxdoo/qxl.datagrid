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
    const genres = qxl.datagrid.demo.array.DummyModel.GENRES;
    this.set({
      title: this._randomTitle(),
      author: this._randomAuthor(),
      date: this._randomDate(),
      price: Math.round(Math.random() * 5000) / 100,
      inStock: Math.random() < 0.7,
      genre: genres[Math.floor(Math.random() * genres.length)]
    });
  },

  statics: {
    /** @type {String[]} the choices for `genre` */
    GENRES: ["Novel", "Poetry", "Biography", "Science", "Travel", "Children"]
  },

  properties: {
    /** Price, empty if not known */
    price: {
      nullable: true,
      init: null,
      check: "Number",
      event: "changePrice"
    },
    inStock: {
      init: false,
      check: "Boolean",
      event: "changeInStock"
    },
    genre: {
      nullable: true,
      init: null,
      check: "String",
      event: "changeGenre"
    },
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
      let nouns = [
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
        "Penguin"
      ];

      return nouns[Math.floor(Math.random() * nouns.length)];
    },

    _randomTitle() {
      let noun1 = this._randomNoun();
      let noun2 = this._randomNoun();
      let title = [`The ${noun1} and The ${noun2}`, `The ${noun1}'s ${noun2}`, `The ${noun1}`][Math.floor(Math.random() * 3)];
      return title;
    },

    _randomSurname() {
      let surnames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas"];
      return surnames[Math.floor(Math.random() * surnames.length)];
    },

    _randomAuthor() {
      let forenameInitial = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
      let surname = this._randomSurname();
      let title = ["Mr", "Mrs", "Dr", "Prof"][Math.floor(Math.random() * 4)];
      return `${title} ${forenameInitial}. ${surname}`;
    },

    _randomDate() {
      let now = new Date();
      let then = new Date(now.getTime() - Math.floor(Math.random() * 15 * 365 * 24 * 60 * 60 * 1000));
      return then;
    }
  }
});
