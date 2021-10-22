Use models for data, by using a {@link Model} to wrap your data.


# {@link Model}

- static create(data?, Model.ALLOW_INCOMPLETE?)
- static from(data)
- static async load(recordName)
- async save()

- get(pathkey)
- set(pathkey, value)
- updateFromSubmission(data)
- reset(data?)

- toHTMLForm(options)
- toHTMLTable(options)
- toHTMLTableRows(options)

- toForm(options)
- toTable(options)
- toTableRows(options)

- valueOf()
- toString()

# {@link Fields }

- boolean(options?)
- string(options?)
- number(options?)
- choice(options?)
- model(Model, options?)

"array of" is done using the `array:true` flag in `options`

# {@link Models}

properties:

- static fields

functions

- static async useDefaultStore(filesystempath)

- setStore(store extends ModelStore)

- register(...models)
- resetRegistrations()

- static create(Model, data?, allowIncomplete?)
- static async loadModel(Model, recordname)
- static async saveModel(modelInstance)

exports

- fromSchemaToData

# Basic JS {@link schema}

You're almost certainly never going to need to work with this as a user, but as a developer you probably do.

- getRecordNameFor(schema, instance)
- linkSchema(schemaInstance, getLatestSchema)
- unlinkSchema(schema)
- getModelSet(Model)
- validate(schema, object, strict?, allowIncomplete?)
- createValidator(schema, strict?, allowIncomplete?)
- createDefault(schema)
- migrate(object, migrationOperations)
- migrate(object, schema1, schema2))

# JS {@link diff}

This should *probably* be its own library in the future.

- create / createDiff(object1, object2)
- apply / applyDiff(operations, object, changeHandler?)
- reverse / reverseDiff(operations)

- makeChangeHandler(ignoreKey?, filterKeyString?, transformValue?)

# {@link equals}

This should have been part of the `Object` prototype from day one, but it wasn't, so here's an deep equality implementation that can do a bit more than usual:

- equals(v1, v2, strict?)

if `strict` is false (default=true) this function will perform coercive equality testing, where things like `equals(2,"2",false)` evaluate to `true`.
