import { TYPES } from "../equals/types.js";

function createResultAggregator() {
  const results = {
    passed: true,
    warnings: [],
    errors: [],
    warn: function (msg) {
      results.warnings.push(msg);
    },
    error: function (msg) {
      results.errors.push(msg);
      results.passed = false;
    },
  };
  return results;
}

/**
 * Verify that an object conforms to a schema.
 *
 * The "strict"" flag determines whether, when there is a type
 * mismatch, to apply js type coercion or not. If this flag is false,
 * values will be forced to the correct datatype *in place* so after
 * this function finishes, the input object will have been updated
 * to fit the schema.
 */
export function conforms(
  schema,
  object,
  strict = true,
  allowIncomplete = false,
  results = createResultAggregator(),
  prefix = false
) {
  const objectKeys = Object.keys(object);
  const schemaKeys = Object.keys(schema);
  const { warn, error } = results;

  objectKeys.forEach((key) => {
    if (schemaKeys.indexOf(key) < 0) {
      warn(`${key}: not-in-schema property.`);
    }
  });

  schemaKeys
    .filter((v) => v !== `__meta`)
    .forEach((field_name) => {
      const args = {
        object,
        field_name,
        schema: schema[field_name],
        strict,
        allowIncomplete,
        prefix,
        results,
      };
      if (args.schema.__meta.array) {
        testArray(args);
      } else {
        testField(args);
      }
    });

  return results;
}

/**
 * Test an array of values to see whether all of them conform to the associated schema
 * @param {*} object
 * @param {*} field_name
 * @param {*} schema
 * @param {*} strict
 * @param {*} allowIncomplete
 * @param {*} prefix
 * @param {*} results
 */
function testArray({
  object,
  field_name,
  schema,
  strict,
  allowIncomplete,
  prefix,
  results,
}) {
  const { required } = schema.__meta;
  const { warn, error } = results;

  const field = `${prefix ? `${prefix}.` : ``}${field_name}`;
  const value = object[field_name];

  // if this field is required, it can't be undefined,
  // but even if it's defined, it can't be an empty array.
  if (required) {
    if (value === undefined) {
      return error(`${field}: required array field missing.`);
    }
    if (value instanceof Array && value.length === 0) {
      return error(`${field}: empty required array field found.`);
    }
    return error(`${field}: required field must be an array.`);
  }

  // if this is not a required field, and it's not defined,
  // then we're done: there is nothing to test.
  if (value === undefined) return;

  // If it *is* defined, we want to make sure that this is an array.
  if (value !== undefined && !(value instanceof Array)) {
    return error(`${field}: must be an array`);
  }

  value.forEach((_, position) => {
    testField({
      object: value,
      field_name: position,
      schema,
      strict,
      allowIncomplete,
      prefix: `${field}[]`,
      results,
    });
  });
}

/**
 * Test a value to see if it conforms to the associated schema
 * @param {*} object
 * @param {*} field_name
 * @param {*} schema
 * @param {*} strict
 * @param {*} allowIncomplete
 * @param {*} prefix
 * @param {*} results
 */
function testField({
  object,
  field_name,
  schema,
  strict,
  allowIncomplete,
  prefix,
  results,
}) {
  const { warn, error } = results;
  const { type, choices, shape } = schema;
  const { required, configurable } = schema.__meta;
  const field = `${prefix ? `${prefix}.` : ``}${field_name}`;
  const value = object[field_name];

  if (value === undefined) {
    if (required) {
      if (schema.default === undefined) {
        if (allowIncomplete && !configurable) {
          warn(
            `${field}: missing (required, permitted through ALLOW_INCOMPLETE)).`
          );
        } else {
          error(`${field}: required field missing.`);
        }
      } else {
        warn(`${field}: missing (required, but with default value specified).`);
      }
    } else {
      warn(`${field}: missing (but not required).`);
    }
    return;
  }

  if (value instanceof Array) {
    return error(
      `${field}: arrays are not allowed as unmarked field values (add __meta.array:true).`
    );
  }

  if (choices && TYPES.mixed(value, true, choices)) {
    return;
  }

  if (choices && !TYPES.mixed(value, true, choices)) {
    if (!strict && TYPES.mixed(value, false, choices)) {
      object[field_name] = coerce(value, type, choices);
    } else {
      return error(
        `${field}: value [${value}] is not in the list of permitted values [${choices.join(
          `,`
        )}]`
      );
    }
  }

  if (shape) {
    return conforms(shape, value, strict, allowIncomplete, results, field);
  }

  if (type && TYPES[type](value, true, choices)) {
    return;
  }

  if (type && !TYPES[type](value, true, choices)) {
    if (!strict && TYPES[type](value, false, choices)) {
      object[field_name] = coerce(value, type);
    } else {
      return error(`${field}: value is not a valid ${type}.`);
    }
  }
}

// Force values to fit the type they need to be, if possible
function coerce(value, type, choices) {
  if (type) {
    if (type === `boolean`) {
      if (typeof value === `number`) {
        if (value === 0) return false;
        if (value === 1) return true;
      }
      if (typeof value === `string`) {
        const lc = value.toLocaleLowerCase();
        if (lc === `true`) return true;
        if (lc === `false`) return false;
      }
    }

    if (type === `number`) {
      if (typeof value === `string`) {
        return parseFloat(value);
      }
    }

    if (type === `string`) {
      return `${value}`;
    }
  }

  if (choices) {
    return choices.find((e) => e == value);
  }
}
