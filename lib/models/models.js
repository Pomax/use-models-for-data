import {
  NoStoreFound,
  StoreNotReady,
  AssignmentMustBeArray,
  InvalidAssignment,
  RequiredFieldsMissing,
} from "../errors.js";
import { copyFromSource, setDataFrom } from "./utils.js";
import { registry } from "./model-registry.js";
import { Model } from "./model.js";
import * as basicSchema from "../schema/basic-js-schema.js";
import { buildValidatingArray } from "./build-validating-array.js";
import * as fields from "./fields.js";
const { Fields } = fields;

/**
 * This is, effectively, the Model manager and factory.
 * @hideconstructor
 */
export class Models {
  /**
   * Used by save/load functions.
   * @param {*} store
   * @returns the static Models class, for call chaining purposes.
   */
  static setStore(store) {
    this.store = store;
    registry.setStore(store);
    return this;
  }

  /**
   * Async dynamic import, so that we don't end up bundling `fs` related
   * file storage during a client-bundling operation.
   * @param {*} path
   */
  static async useDefaultStore(path) {
    const { FileSystemStore } = await import("./store/filesystem-store.js");
    const store = new FileSystemStore(path);
    Models.setStore(store);
  }

  /**
   * Make sure that the store is ready for load/save operations.
   * @ignore
   */
  static verifyStore() {
    if (!this.store) {
      throw new NoStoreFound();
    }
    if (!this.store.ready()) {
      throw new StoreNotReady();
    }
  }

  /**
   * <p>register all model classes so that we know whether or not
   * they still match their previously stored schema. If not,
   * this will throw and you should run a schema migration before
   * your model-related code will run without errors.</p>
   *
   * <p>If a backend store is used, this function will run <code>async</code>,
   * returning a <code>Promise</code> that can be <code>await</code>ed,
   * or handled with <code>.then()</code></p>
   *
   * <p>When no backend is used, this function will run synchronously.</p>
   *
   * @param  {Model[]} models - one or more Model class instances
   * @returns {schema[]} A list of model-associated schemas, mapped per input model
   */
  static register(...models) {
    if (this.store) return this.__registerAsync(...models);
    return this.__registerSync(...models);
  }

  /** @ignore */
  static async __registerAsync(...models) {
    const list = models.slice();
    while (list.length) {
      await registry.recordModelClassAsync(list.shift());
    }
    return models.map((model) => registry.getRegisteredSchema(model.name));
  }

  /** @ignore */
  static __registerSync(...models) {
    return models.map((model) => registry.recordModelClassSync(model));
  }

  /**
   * Forget all registered models
   */
  static resetRegistrations() {
    registry.resetRegistrations();
  }

  /**
   * <p>Create a model instance.</p>
   *
   * @param {class} Model - The model class to instantiate.
   * @param {object} data - the data with which to bootstrap the new model instantiation.
   * @param {boolean} [allowIncomplete] - True if missing required fields should be allowed, false if not.
   * @returns {Model} an instance of the passed Model class.
   */
  static create(Model, data, allowIncomplete = false) {
    const { name, schema } = Model;

    // if we don't know this model, this will throw.
    registry.getRegisteredSchema(name);

    const instance = new Model(this, Date.now());
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
      throw new RequiredFieldsMissing(name, result.errors);
    }

    if (allowIncomplete === Model.ALLOW_INCOMPLETE) {
      Object.defineProperty(instance, `__incomplete`, {
        enumerable: false,
        configurable: true,
        value: true,
      });
    }

    return instance;
  }

  /**
   * Load a model from file (i.e. create a model, then assign values to it based on
   * stored data. We do it in this order to ensure data validation runs)
   * @param {class} Model - The model class to instantiate.
   * @param {String} recordName - The recordName associated with the required instance.
   * @returns {Model} a previously stored instance of the passed Model class.
   */
  static async loadModel(Model, recordName) {
    this.verifyStore();
    const schema = await registry.recordModelClassAsync(Model);

    // Preallocate our data variable, and see if we can assign and use it.
    // Which can fail. In quite a few ways. All of them will throw =)
    let fileData = undefined;

    if (recordName) {
      fileData = await this.store.loadRecord(schema, recordName);
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
  }

  /**
   * Save a model to the back end, but skip any default values
   * because models are bootstrapped with the model's default
   * values before data gets loaded in.
   * @param {Model} instance - A model instance.
   */
  static async saveModel(instance) {
    this.verifyStore();
    const modelName = instance.__proto__.constructor.name;
    const schema = registry.getRegisteredSchema(modelName);
    const recordName = basicSchema.getRecordNameFor(schema, instance);
    await this.store.saveRecord(schema, instance, recordName);
  }

  /**
   * Delete a model from the back end.
   * @param {Model} instance - A model instance.
   */
  static async deleteModel(instance) {
    this.verifyStore();
    const modelName = instance.__proto__.constructor.name;
    const schema = registry.getRegisteredSchema(modelName);
    const recordName = basicSchema.getRecordNameFor(schema, instance);
    await this.store.deleteRecord(schema, recordName);
  }

  // And some convenience "static exports"
  static fields = Fields;
}

/**
 * Rewrite a model from its initial "schema" layout
 * to the actually usable "controlled data" layout.
 * @ignore
 */
export function fromSchemaToData(model) {
  if (model.__converted) return model;

  const props = Object.entries(model);
  props.forEach(([key, definition]) => {
    const array = key !== `__meta` && definition.__meta.array;
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
      if (typeof Model !== `undefined` && definition instanceof Model) {
        schema = definition.__proto__.constructor.schema;
      }

      // If not, treat the definition as the schema.
      else {
        schema = copyFromSource(definition);
      }

      // If this is an array-of-[...], we need a special array that
      // can perform seemless data assignment/extraction.
      if (array) {
        const proxy = buildValidatingArray(schema, definition);
        Object.defineProperty(model, key, {
          configurable: false,
          get: () => proxy,
          set: (data) => {
            if (!(data instanceof Array)) {
              throw new AssignmentMustBeArray(key);
            }
            while (proxy.length > 0) proxy.pop();
            proxy.push(...data);
          },
        });
      }

      // Otherwise, we can set up "simple" get/set logic.
      else {
        Object.defineProperty(model, key, {
          configurable: false,
          get: () => definition,
          set: (data) => {
            const result = basicSchema.validate(schema, data);
            if (result.passed) setDataFrom(data, definition);
            else {
              throw new InvalidAssignment(key, data, result.errors);
            }
          },
        });
      }

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
 * @ignore
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
        throw new InvalidAssignment(key, value, result.errors);
      }
    },
  });
}
