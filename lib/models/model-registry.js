import { CouldNotFindModel, SchemaMismatchForModel } from "../errors.js";
import { createDiff } from "../diff/diff.js";
import * as migrations from "../migration/make-migration.js";
import * as basicSchema from "../schema/basic-js-schema.js";
import { diff } from "../../index.js";

/**
 * The model registry contains the list of current model-associated schema objects.
 * @ignore
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
   * @returns {schema} The previously stored schema for a given model.
   */
  getRegisteredSchema(modelName) {
    const schema = this.REGISTER[modelName];
    if (!schema) {
      throw new CouldNotFindModel(modelName);
    }
    return schema;
  }

  /**
   * Record the model singleton for schema-related work,
   * and try to tie this into the associated schema known
   * to the storage backend.
   */
  recordModelClassSync(BaseModel) {
    const { REGISTER } = this;
    const modelSet = basicSchema.getModelSet(BaseModel);
    modelSet.forEach((Model) => {
      REGISTER[Model.name] = Model.schema = new Model(this, Date.now());
    });
    return REGISTER[BaseModel.name];
  }

  /**
   * Record the model singleton for schema-related work,
   * and try to tie this into the associated schema known
   * to the storage backend.
   */
  async recordModelClassAsync(BaseModel) {
    await this.recordModelClassWithStoreBacking(BaseModel);
    return this.REGISTER[BaseModel.name];
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
  async recordModelClassWithStoreBacking(BaseModel) {
    const { store, REGISTER } = this;

    // How many distinct models are involved here?
    const modelSet = basicSchema.getModelSet(BaseModel);

    // Run through each of them, and generate migrations, if
    // needed, for each model that has a schema-mismatch with its
    // previously stored schema (if there was one, of course).
    const diffList = [];

    // Run in smallest-to-largest order, with the base model last.
    const handleModel = async (Model) => {
      const modelName = Model.name;
      let schema = new Model(this, Date.now());

      // Is this the same schema as was previously stored?
      let stored = REGISTER[modelName];

      // Is this a schema that may be stored at some backend? If so,
      // see if there are differences compared to the stored version.
      if (schema.__meta.distinct) {
        if (!stored) {
          stored = await store.loadSchema(schema);
        }

        if (stored) {
          if (stored.__meta.version === undefined) {
            Object.defineProperty(stored.__meta, `version`, {
              enumerable: false,
              value: 1,
            });
          }

          const diffs = createDiff(stored, schema);

          if (diffs.length > 0) {
            Object.defineProperty(schema.__meta, `version`, {
              enumerable: false,
              value: stored.__meta.version + 1,
            });

            // It is not! Someone's going to have to run data migrations
            // before this model can be safely used with preexisting data.
            // So let's be nice: save the new schema to file and create a
            // migration runner so that the data can be uplifted.
            diffList.push({ Model, stored, schema, operations: diffs });
          } else {
            Object.defineProperty(schema.__meta, `version`, {
              enumerable: false,
              value: stored.__meta.version,
            });
          }
        } else {
          // Use a new schema, because the above code will have
          // added runtime properties that would cause a schema
          // mismatch to be flagged.
          const schema = new Model(this, Date.now());
          Object.defineProperty(schema.__meta, `version`, {
            enumerable: false,
            value: 1,
          });
          await store.saveSchema(schema);
        }
      }

      REGISTER[modelName] = Model.schema = schema;
    };

    // Run through each model, one by one, despite being async.
    while (modelSet.length) await handleModel(modelSet.pop());

    // Process all "diffs" we accumulated.
    if (diffList.length > 0) {
      // generate all migration files
      const mfList = diffList.slice();
      while (mfList.length > 0) {
        const { stored, schema, operations } = mfList.shift();
        await this.generateMigrationFile(stored, schema, operations);
      }

      // Then save the updated schema files. We do things in this order because if
      // we save the updated schema files first, subsequent generateMigrationFile
      // calls don't see a "missing schema", and so don't write anything.
      const modelList = diffList.map((e) => e.Model);
      while (modelList.length) {
        const Model = modelList.shift();
        const schema = new Model(this, Date.now());
        // Use a new schema, because the above code will have
        // added runtime properties that would cause a schema
        // mismatch to be flagged.
        await store.saveSchema(schema);
      }

      // And then error we out.
      throw new SchemaMismatchForModel(BaseModel.name);

      // TODO: make these migrations "call each other" in some smartypants fashion instead.
    }
  }

  /**
   * Generate a migration file that can be run with Node to uplift
   * data files from one schema to another.
   *
   * FIXME: TODO: where do we house this? Should this go in storage-backend?
   */
  async generateMigrationFile(schema1, schema2, operations) {
    const migration = migrations.makeMigration(
      schema1,
      schema2,
      undefined,
      operations
    );
    await this.store.saveMigration(schema1, schema2, migration);
  }
}

const registry = new ModelRegistry();
export { registry };
