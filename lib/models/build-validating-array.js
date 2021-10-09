import { Model } from "./model.js";

/**
 * A special proxy for dealing with lists-of-submodels, acting
 * like a native Array, but letting us make sure that any
 * assignments or addition operations are wrapped by validation.
 */
export function buildValidatingArray(schema, definition) {
  const proxy = new Proxy([], {
    set: (array, property, value) => {
      __validate(value);
      array[property] = value;
      return true;
    },
    push: (array, ...additions) => {
      additions = additions.map((v) => __validate(v));
      return array.push(...additions);
    },
    pop: (array) => {
      return array.pop();
    },
    unshift: (array, ...additions) => {
      additions = additions.map((v) => __validate(v));
      return array.unshift(...additions);
    },
    splice: (array, pos, numberToRemove, ...additions) => {
      additions = additions.map((v) => __validate(v));
      return array.splice(pos, numberToRemove, ...additions);
    },
    concat: (array, other) => {
      const concatenated = buildValidatingArray(schema, definition);
      concatenated.push(...array, ...other);
      return concatenated;
    },
    forEach: (array, fn) => {
      return array.forEach(fn);
    },
    map: (array, fn) => {
      const mapped = buildValidatingArray(schema, definition);
      mapped.push(...array.map(fn));
      return mapped;
    },
    slice: (array, start, end) => {
      const mapped = buildValidatingArray(schema, definition);
      mapped.push(...array.slice(start, end));
      return mapped;
    },
    valueOf: (array) => {
      return array.valueOf();
    },
    toString: (array) => {
      return array.toString();
    },
  });

  const __validate = (data) => {
    if (definition instanceof Model) {
      const model = definition.__proto__.constructor;
      return model.create(data);
    }
    const result = basicSchema.validate(schema, data);
    if (result.passed) return data;
    else {
      const err = new Error(`Assignment violates property schema.`);
      err.errors = result.errors;
      throw err;
    }
  };

  return proxy;
}
