/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1637308079")

  // update field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "select3848597695",
    "maxSelect": 0,
    "name": "statut",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "nouvelle",
      "en_cours",
      "en_attente",
      "résolue",
      "non_reparable"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1637308079")

  // update field
  collection.fields.addAt(4, new Field({
    "help": "",
    "hidden": false,
    "id": "select3848597695",
    "maxSelect": 0,
    "name": "statut",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "nouvelle",
      "en_cours",
      "en_attente",
      "resolue",
      "non_reparable"
    ]
  }))

  return app.save(collection)
})
