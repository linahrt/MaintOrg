/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2386430268")

  // update field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "select3848597695",
    "maxSelect": 0,
    "name": "statut",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "rupture_de_stock",
      "stock_faible",
      "stock_disponible"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2386430268")

  // update field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "select3848597695",
    "maxSelect": 0,
    "name": "statut",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "rupture-de-stock",
      "stock-faible",
      "stock-disponible"
    ]
  }))

  return app.save(collection)
})
