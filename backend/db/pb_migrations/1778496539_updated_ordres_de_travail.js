/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2660531072")

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text4286007220",
    "max": 0,
    "min": 0,
    "name": "titre",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select2363381545",
    "maxSelect": 0,
    "name": "type",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "correctif",
      "preventif",
      "amelioratif",
      "urgent"
    ]
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3488873247",
    "help": "",
    "hidden": false,
    "id": "relation3098855155",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "equipement",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1637308079",
    "help": "",
    "hidden": false,
    "id": "relation2985134570",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "panne_liee",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(6, new Field({
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
      "brouillon",
      "planifie",
      "en_cours",
      "en_attente",
      "termine",
      "annule"
    ]
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "select1990688872",
    "maxSelect": 0,
    "name": "priorite",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "basse",
      "moyenne",
      "haute",
      "critique"
    ]
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "date2497440978",
    "max": "",
    "min": "",
    "name": "date_creation",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "date1391193845",
    "max": "",
    "min": "",
    "name": "date_debut",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "date472036676",
    "max": "",
    "min": "",
    "name": "date_fin",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2519215180",
    "max": 0,
    "min": 0,
    "name": "technicien",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1843675174",
    "max": 0,
    "min": 0,
    "name": "description",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2575139115",
    "max": 0,
    "min": 0,
    "name": "instructions",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2660531072")

  // remove field
  collection.fields.removeById("text4286007220")

  // remove field
  collection.fields.removeById("select2363381545")

  // remove field
  collection.fields.removeById("relation3098855155")

  // remove field
  collection.fields.removeById("relation2985134570")

  // remove field
  collection.fields.removeById("select3848597695")

  // remove field
  collection.fields.removeById("select1990688872")

  // remove field
  collection.fields.removeById("date2497440978")

  // remove field
  collection.fields.removeById("date1391193845")

  // remove field
  collection.fields.removeById("date472036676")

  // remove field
  collection.fields.removeById("text2519215180")

  // remove field
  collection.fields.removeById("text1843675174")

  // remove field
  collection.fields.removeById("text2575139115")

  return app.save(collection)
})
