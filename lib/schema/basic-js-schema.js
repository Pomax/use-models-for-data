import { conforms } from "./conforms.js";
import { fromSchemaToData } from "../models/models.js";
import { createDiff, applyDiff, makeChangeHandler } from "../diff/diff.js";
import { inflate } from "../models/utils.js";

/**
 * Get the
 * @param {*} schema
 * @param {*} instance
 * @returns
 */
export function getRecordNameFor(schema, instance) {
  const indicator = schema.__meta.recordname;

  if (!indicator) {
    throw new Error(
      `${schema.__proto__.constructor.name} model lacks a "__meta.recordname" binding for auto-saving model instances.`
    );
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
 * @param {*} dir
 * @param {*} obj
 * @param {*} getLatestSchema
 * @returns
 */
export function linkSchema(dir, obj, getLatestSchema) {
  const { __meta } = obj;

  // is this a schema'd property?
  if (__meta && __meta.schema && __meta.schemaName) {
    const subschema = getLatestSchema(__meta.schemaName, __meta.schema);
    obj.__meta = subschema.__meta;
    delete subschema.__meta;
    obj.shape = subschema;
    return;
  }

  // find all fields that we need to recurse through.
  Object.entries(obj).forEach(([key, value]) => {
    if (key === `__meta`) return;
    const recursionData = value.shape
      ? value.shape
      : value.__meta
      ? value
      : undefined;
    if (recursionData) linkSchema(dir, recursionData, getLatestSchema);
  });
}

/**
 * Validate an object against a schema.
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
 * Decompose a single schema into a set of linked schema, based
 * on the __meta.distinct property of modelfields with a .shape
 *
 * @param {*} schema
 * @returns array of linked schema
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

// Similar to unlinkSchema, without rewriting the parent
// when a child model is found. Instead, we get a list of
// all distinct Model classes.
export function getModelSet(Model) {
  const list = [Model];

  (function iterate(model) {
    const s = new model();
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
 * convert a schema object to a validator.
 */
export function createValidator(schema, strict = true) {
  return (object) => validate(schema, object, strict);
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

// fall-through for migrate(object, schema1, schema2)
function migrateWithSchema(object, schema1, schema2) {
  const operations = createDiff(schema1, schema2);
  return migrateDirectly(object, operations);
}

// fall-through for migrate(object, diff)
function migrateDirectly(object, changeOperations) {
  const changeHandler = makeSchemaChangeHandler();
  applyDiff(changeOperations, object, changeHandler);
}

/**
 * ...
 * @returns
 */
export function makeSchemaChangeHandler() {
  return makeChangeHandler(ignoreKey, filterKeyString, transformValue);
}

// ...
function ignoreKey(key, _type) {
  if (key.includes(`__meta`)) return true;
  if (key.includes(`.default`)) return true;
  if (key.includes(`.choices`)) return true;
}

// ...
function filterKeyString(key) {
  return key.replaceAll(`.shape`, ``);
}

// ...
function transformValue(key, value) {
  const copied = JSON.parse(JSON.stringify(value));
  const transformed = { [key]: copied };
  fromSchemaToData(transformed);
  return transformed[key];
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
