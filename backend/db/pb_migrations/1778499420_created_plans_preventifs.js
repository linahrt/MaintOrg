/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1819170229",
        "max": 0,
        "min": 0,
        "name": "nom",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3488873247",
        "help": "",
        "hidden": false,
        "id": "relation3098855155",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "equipement",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select847176796",
        "maxSelect": 0,
        "name": "frequence",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "quotidien",
          "hebdomadaire",
          "mensuel",
          "trimestriel",
          "semestriel",
          "annuel"
        ]
      },
      {
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
          "actif",
          "inactif",
          "pause"
        ]
      },
      {
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
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1381108999",
        "max": 0,
        "min": 0,
        "name": "responsable",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number230470084",
        "max": null,
        "min": null,
        "name": "duree_estimee",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
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
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_1867002266",
    "indexes": [],
    "listRule": null,
    "name": "plans_preventifs",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1867002266");

  return app.delete(collection);
})
