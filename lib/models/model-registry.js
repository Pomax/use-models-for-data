import { createDiff } from "../diff/diff.js";
import * as migrations from "../migration/make-migration.js";
import * as basicSchema from "../schema/basic-js-schema.js";

/**
 * The model registry contains the list of current model-associated schema objects.
 */
class ModelRegistry {
  constructor() {
    this.store = undefined;
    this.resetRegistrations();
  }

  setStore(store) {
    this.store = store;
  }

  resetRegistrations() {
    this.REGISTER = {};
  }

  /**
   * Get a previously registered schema, or throw because
   * the calling code assumes a registration already happened,
   * so if we can't find it, that's a true error.
   * @param {*} modelName
   * @returns
   */
  getRegisteredSchema(modelName) {
    const schema = this.REGISTER[modelName];
    if (!schema) {
      throw new Error(
        `Could not retrieve schema for Model ${modelName}, did you forget to register() it?`
      );
    }
    return schema;
  }

  /**
   * Record the model singleton for schema-related work,
   * and try to tie this into the associated schema known
   * to the storage backend.
   */
  recordModelClass(BaseModel) {
    // If we have a store to work with, record the model and perform
    // change management if needed. If not, only record the schema
    // without performing any of the fancy things.
    const { REGISTER } = this;
    if (this.store) {
      this.recordModelClassWithStoreBacking(BaseModel);
    } else {
      const modelSet = basicSchema.getModelSet(BaseModel);
      modelSet.forEach((Model) => {
        REGISTER[Model.name] = Model.schema = new Model(this, Date.now());
      });
    }
    return REGISTER[BaseModel.name];
  }

  /**
   * Record the model singleton for schema-related work,
   * and tie this into the associated schema known to the
   * storage backend.
   *
   * - If no saved schema, save one.
   * - If saved schema matches, nice.
   * - If it does not, save a version-bumped schema
   *   and create a migration file.
   */
  recordModelClassWithStoreBacking(BaseModel) {
    const { store, REGISTER } = this;

    // How many distinct models are involved here?
    const modelSet = basicSchema.getModelSet(BaseModel);

    // Run through each of them, and generate migrations, if
    // needed, for each model that has a schema-mismatch with its
    // previously stored schema (if there was one, of course).
    const diffList = [];

    // Run in smallest-to-largest order, with the base model last.
    modelSet.reverse().forEach((Model) => {
      const modelName = Model.name;
      const schema = new Model(this, Date.now());

      // Is this the same schema as was previously stored?
      let stored = REGISTER[modelName];

      // Is this a schema that may be stored at some backend? If so,
      // see if there are differences compared to the stored version.
      if (schema.__meta.distinct) {
        if (!stored) stored = store.loadSchema(schema);
        if (stored) {
          if (stored.__meta.version === undefined) {
            Object.defineProperty(stored.__meta, `version`, {
              enumerable: false,
              value: 1,
            });
          }
          Object.defineProperty(schema.__meta, `version`, {
            enumerable: false,
            value: stored.__meta.version + 1,
          });
        }

        if (stored) {
          const diffs = createDiff(stored, schema);

          if (diffs.length > 0) {
            // It is not! Someone's going to have to run data migrations
            // before this model can be safely used with preexisting data.
            // So let's be nice: save the new schema to file and create a
            // migration runner so that the data can be uplifted.
            diffList.push({ Model, stored, schema });
          }
        } else store.saveSchema(Model);
      }

      REGISTER[modelName] = Model.schema = schema;
    });

    // Process all "diffs" we accumulated.
    if (diffList.length > 0) {
      // first, generate all migration files
      diffList.forEach(({ stored, schema }) =>
        this.generateMigrationFile(stored, schema)
      );

      // Then save the updated schema files. We do things in this order because if
      // we save the updated schema files first, subsequent generateMigrationFile
      // calls don't see a "missing schema", and so don't write anything.
      diffList.forEach(({ Model }) => store.saveSchema(Model));

      // And then error we out.
      throw new Error(
        `Schema mismatch for ${modelName} model, please migrate your data first.`
      );

      // TODO: make these migrations "call each other" in some smartypants fashion instead.
    }
  }

  /**
   * Generate a migration file that can be run with Node to uplift
   * data files from one schema to another.
   *
   * FIXME: TODO: where do we house this? Should this go in storage-backend?
   */
  generateMigrationFile(schema1, schema2) {
    // FIXME: TODO: the fact that this returns a script string is not great...
    const migration = migrations.makeMigration(schema1, schema2);
    this.store.saveMigration(schema1, schema2, migration);
  }
}

const registry = new ModelRegistry();
export { registry };
