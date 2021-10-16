/**
 * @namespace schema
 */

import { MISSING_RECORD_NAME_BINDING } from "../errors.js";
import { conforms } from "./conforms.js";
import { fromSchemaToData } from "../models/models.js";
import { createDiff, applyDiff, makeChangeHandler } from "../diff/diff.js";
import { inflate } from "../models/utils.js";

/**
 * Get the string identifier for this schema-conformant data object.
 * @name schema.getRecordNameFor
 * @function
 * @param {*} schema - A schema definition
 * @param {*} instance - A schema-conformant data object
 * @returns {String} the string identifier for this schema-conformant data object.
 */
export function getRecordNameFor(schema, instance) {
  const indicator = schema.__meta.recordname;

  if (!indicator) {
    throw new MISSING_RECORD_NAME_BINDING(schema.__proto__.constructor.name);
  }

  // If the recordname is a function, it will yield the record name given an instance.
  if (typeof indicator === `function`) {
    return indicator(instance);
  }

  // Otherwise, it's a keypath. Traverse the instance to find the key whose value should act as record name.
  return indicator.split(`.`).reduce((obj, e) => obj[e], instance);
}

/**
 * Fully quality a schema by linking in all external schema it depends on.
 * @name schema.linkSchema
 * @function
 * @param {*} schemaInstance - A schema instance with sub-schema link information.
 * @param {*} getLatestSchema - A resolver function for finding sub-schema definitions.
 * @returns {schema} The schema instance with all links replaced by fully qualified sub-schema.
 */
export function linkSchema(schemaInstance, getLatestSchema) {
  const { __meta } = schemaInstance;

  // is this a schema'd property?
  if (__meta && __meta.schema && __meta.schemaName) {
    const subschema = getLatestSchema(__meta.schemaName, __meta.schema);
    schemaInstance.__meta = subschema.__meta;
    delete subschema.__meta;
    schemaInstance.shape = subschema;
    return;
  }

  // find all fields that we need to recurse through.
  Object.entries(schemaInstance).forEach(([key, value]) => {
    if (key === `__meta`) return;
    const recursionData = value.shape
      ? value.shape
      : value.__meta
      ? value
      : undefined;
    if (recursionData) linkSchema(recursionData, getLatestSchema);
  });
}

/**
 * Decompose a single schema into a set of linked schema, based
 * on the __meta.distinct property of modelfields with a .shape
 *
 * @name schema.unlinkSchema
 * @function
 * @param {*} schema - A fully qualified schema
 * @returns {schema[]} An array consisting of all individual schema found by walking through the passed schema.
 */
export function unlinkSchema(schema) {
  const list = [{ schema, __meta: schema.__meta }];

  (function iterate(s) {
    Object.entries(s).forEach(([key, value]) => {
      const { __meta, shape } = value;
      if (shape) {
        if (__meta?.distinct) {
          list.push({ schema: shape, __meta });
          s[key] = {
            __meta: {
              schema: shape.__proto__.constructor.name,
              schemaName: __meta.name,
            },
          };
        } else {
          iterate(shape);
        }
      }
    });
  })(schema);

  return list;
}

/**
 * Similar to unlinkSchema, without rewriting the parent
 * when a child model is found. Instead, we get a list of
 * all distinct Model classes.
 *
 * @name schema.getModelSet
 * @function
 * @param {Model} Model - A fully qualified {@link Model}.
 * @returns {Model[]} - An array consisting of all individual models found by walking through the passed model.
 * @see schema.unlinkSchema
 */
export function getModelSet(Model) {
  const list = [Model];

  (function iterate(model) {
    const s = new model(getModelSet, Date.now());
    Object.entries(s).forEach(([key, value]) => {
      const { __meta, shape } = value;
      if (shape) {
        //if (__meta?.distinct) {
        list.push(shape.__proto__.constructor);
        //} else {
        iterate(shape.__proto__.constructor);
        //}
      }
    });
  })(Model);

  return list;
}

/**
 * <p>Validate an object against a schema. This function does not return
 * a boolean, but a result object that takes the following form:</p>
 *
 * <pre><code>
 *   {
 *     passed: boolean,
 *     warnings: string[],
 *     errors: string[],
 *   }
 * </code></pre>
 *
 * <p>As such, use this function in your own code as:</p>
 *
 * <pre><code>
 *   const strict = trueOrFalse;
 *   const allowIncomplete = trueOrFalse;
 *   const result = validate(someSchema, myObject, strict, allowIncomplete);
 *   if (result.passed) {
 *     // all good, although result.warnings may contain strict/incomplete related warnings
 *   } else {
 *     // tap into result.errors to find out why your object is invalid
 *   }
 * </code></pre>
 *
 * <p>Note that the <code>strict</code> flag determines whether or not
 * to perform coercive validation. If <code>strict=false</code> and the
 * code does need to perform coercion in order for validation to pass,
 * the object will be updated such that it will now pass strict validation.</p>
 *
 * @name schema.Validate
 * @function
 * @param {schema} schema - The schema that the object should conform to
 * @param {object} object - The object to check conformance for
 * @param {boolean} strict - True if strict type validation is required, false for coercive
 * @param {boolean} allowIncomplete - Do not fail validation if there are fields missing from this object
 * @returns {object} See description above
 */
export function validate(
  schema,
  object,
  strict = true,
  allowIncomplete = false
) {
  inflate(object);
  const results = conforms(schema, object, strict, allowIncomplete);
  if (!results.errors.length) {
    results.passed = true;
  }
  return results;
}

/**
 * Create a validator for convert a schema object to a validator.
 */
export function createValidator(
  schema,
  strict = true,
  allowIncomplete = false
) {
  return (object) => validate(schema, object, strict, allowIncomplete);
}

/**
 * Create an object that has all the "default" values as indicated by a schema.
 */
export function createDefault(schema) {
  return Object.fromEntries(
    Object.entries(schema)
      .map(([key, value]) => {
        if (key === `__meta`) return false;
        if (value.default !== undefined) return [key, value.default];
        if (value.shape) return [key, createDefault(value.shape)];
      })
      .filter(Boolean)
  );
}

/**
 * Migrate an object from being schema1-conformant to schema2-conformant.
 */
export function migrate(object, ...args) {
  const len = args.length;
  if (len === 1) {
    const [operations] = args;
    return migrateDirectly(object, operations);
  }
  if (len === 2) {
    const [schema1, schema2] = args;
    return migrateWithSchema(object, schema1, schema2);
  }
}

// fall-through for migrate(object, diff)
function migrateDirectly(object, changeOperations) {
  const changeHandler = makeSchemaChangeHandler();
  applyDiff(changeOperations, object, changeHandler);
}

// fall-through for migrate(object, schema1, schema2)
function migrateWithSchema(object, schema1, schema2) {
  const operations = createDiff(schema1, schema2);
  return migrateDirectly(object, operations);
}

/**
 * This generates a change handler to be used with {@link diff.applySchema}
 * in order to apply diffs between two schema definitions to objects that
 * should conform to those schema definitions.
 *
 * You should never need to invoke this function yourself.
 *
 * @returns the schema-conformant object diff changeHandler.
 * @ignore
 */
export function makeSchemaChangeHandler() {
  return makeChangeHandler(ignoreKey, filterKeyString, transformValue);
}

/**
 * @param {*} key - An operational-transform-associated key path
 * @param {*} type - operational transform type (add, update, move, remove)
 * @returns {boolean} True if this key/type tuple should be ignored for diff application purposes.
 * @ignore
 */
function ignoreKey(key, _type) {
  if (key.includes(`__meta`)) return true;
  if (key.includes(`.default`)) return true;
  if (key.includes(`.choices`)) return true;
}

/**
 * @param {String} key - A key path string for an operational transform operation.
 * @returns {String} A (possibly different) key path string.
 * @ignore
 */
function filterKeyString(key) {
  return key.replaceAll(`.shape`, ``);
}

/**
 * @param {String} key - A key path string for an operational transform operation.
 * @param {*} value - Any kind of JS data
 * @returns The key-path associated value after forcing "schema-to-data" conversion (which don't do anything if the value is already plain data)
 * @ignore
 */
function transformValue(key, value) {
  const copied = JSON.parse(JSON.stringify(value));
  const transformed = { [key]: copied };
  fromSchemaToData(transformed);
  return transformed[key];
}
