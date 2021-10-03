import { copyFromSource, setDataFrom } from "./utils.js";
import * as basicSchema from "../schema/basic-js-schema.js";
import { registry } from "./model-registry.js";
import { Model } from "./model.js";
import * as fields from "./fields.js";
const { Fields } = fields;

/**
 * This is, effectively, the Model manager and factory.
 */
export class Models {
  /**
   * Used by save/load functions.
   */
  static setStore = function (store) {
    Models.store = store;
    registry.setStore(store);
    return this;
  };

  /**
   * Forget all registered models
   */
  static resetRegistrations() {
    registry.resetRegistrations();
  }

  /**
   * Async dynamic import, so that we don't end up bundling `fs` related
   * filestorage during a client-bundling operation.
   */
  static async useDefaultStore(path) {
    const { FileSystemStore } = await import("./store/filesystem-store.js");
    const store = new FileSystemStore(path);
    Models.setStore(store);
  }

  /**
   * Make sure that the store is ready for load/save operations.
   */
  static verifyStore() {
    if (!Models.store.ready()) {
      throw new Error(
        `Cannot register models until after Models.setStore(store) has been called.`
      );
    }
  }

  /**
   * register all model classes so that we know whether or not
   * they still match their previously stored schema. If not,
   * this will throw and you should run a schema migration before
   * your model-related code will run without errors.
   */
  static register(...models) {
    models.forEach((Model) => registry.recordModelClass(Model));
  }

  /**
   * Create a model instance, making sure its schema is known.
   */
  static create = function (Model, data, allowIncomplete) {
    registry.recordModelClass(Model);

    const { name, schema } = Model;
    const instance = new Model();
    fromSchemaToData(instance);

    // Assign this model's initial data. This will throw if any values do not
    // conform to the model's schema.
    if (data !== undefined) setDataFrom(data, instance);

    // Then, post-validate the instance.
    const result = basicSchema.validate(
      schema,
      instance,
      false,
      allowIncomplete
    );
    if (!result.passed) {
      const err = new Error(
        `Cannot create ${name}: missing required fields (without schema-defined default).`
      );
      err.errors = result.errors;
      throw err;
    }

    return instance;
  };

  /**
   * Load a model from file (i.e. create a model, then assign values to it based on
   * stored data. We do it in this order to ensure data validation runs)
   */
  static load = function (Model, recordName) {
    this.verifyStore();
    const schema = registry.recordModelClass(Model);

    // Preallocate our data variable, and see if we can assign and use it.
    // Which can fail. In quite a few ways. All of them will throw =)
    let fileData = undefined;

    if (recordName) {
      fileData = Models.store.loadRecord(schema, recordName);
    }

    try {
      return this.create(Model, fileData);
    } catch (e) {
      // And this is where things get interesting: schema mismatch, what do we do?
      console.error(
        `Data for stored record ${recordName} is not schema-conformant.`
      );
      throw e;
    }
  };

  /**
   * Save a model to file, but skip any default values because models are
   * bootstrapped with the model's default values before data gets loaded in.
   */
  static saveModel = function (instance) {
    this.verifyStore();
    const modelName = instance.__proto__.constructor.name;
    const schema = registry.getRegisteredSchema(modelName);
    const recordName = basicSchema.getRecordNameFor(schema, instance);
    Models.store.saveRecord(schema, instance, recordName);
  };

  // And some convenience "static exports"
  static fields = Fields;
}

/**
 * Rewrite a model from its initial "schema" layout
 * to the actually usable "controlled data" layout.
 */
export function fromSchemaToData(model) {
  if (model.__converted) return model;

  const props = Object.entries(model);
  props.forEach(([key, definition]) => {
    const { shape } = definition;
    if (shape) {
      definition = shape;
    }

    // we don't need to retain metadata, this is instead
    // kept around in the Models.modelTrees dictionary.
    if (key === `__meta`) {
      delete model.__meta;
    }

    // non-model subtrees
    else if (!!shape || definition.__meta?.name) {
      let schema;

      // If this is a proper model, we should already have its associated
      // schema stored both in the registry and on the model class (set
      // as part of the registry.recordModelClass() code path)
      if (definition instanceof Model) {
        schema = definition.__proto__.constructor.schema;
      }

      // If not, treat the definition as the schema.
      else {
        schema = copyFromSource(definition);
      }

      // We can then set up the getter/setter logic for this value:
      Object.defineProperty(model, key, {
        configurable: false,
        get: () => definition,
        set: (data) => {
          const result = basicSchema.validate(schema, data);
          if (result.passed) setDataFrom(data, definition);
          else {
            const err = new Error(`Assignment violates property schema.`);
            err.errors = result.errors;
            throw err;
          }
        },
      });

      // And then we recurse.
      fromSchemaToData(definition);
    }

    // everything else is a simple (validation-controlled) property
    else setupReferenceHandler(model, key, definition);
  });

  Object.defineProperty(model, `__converted`, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: true,
  });

  return model;
}

/**
 * Set up the property to initially be undefined and non-enumerable.
 * When the property is assigned a value that is not the default,
 * we toggle the field to enumerable so that it "shows up" when
 * using Object.keys/values/entries and JSON serialization.
 *
 * @param {*} model
 * @param {*} key
 * @param {*} definition
 */
export function setupReferenceHandler(model, key, definition) {
  const defaultValue = definition.default;
  let __proxy = defaultValue;

  Object.defineProperty(model, key, {
    configurable: true, // defaults to false, so needs to explicitly be set to true
    enumerable: false, // hide this key for object iteration purposes by default
    get: () => __proxy,
    set: (value) => {
      const result = fields.validate(key, value, definition);
      if (result.passed) {
        __proxy = value;
        // For non default values, include this key when iterating over the object,
        // but default values exclude this key for iteration purposes.
        Object.defineProperty(model, key, {
          enumerable: value !== defaultValue,
        });
      } else {
        const err = new Error(
          `Could not assign key "${key}" value "${value}".`
        );
        err.errors = result.errors;
        throw err;
      }
    },
  });
}
