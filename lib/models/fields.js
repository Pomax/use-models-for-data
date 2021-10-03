import { setDataFrom } from "./utils.js";
import * as basicSchema from "../schema/basic-js-schema.js";

/**
 * Generate correctly typed model fields, in the sense
 * that they are of a form that js-schema can work with.
 */
class ModelField {
  constructor(options = {}) {
    const dflt = options.default;
    const { type, choices, shape, ...rest } = options;
    delete rest.default;

    this.__meta = {};
    if (shape?.__meta) {
      this.__meta = shape.__meta;
      delete shape.__meta;
    }
    setDataFrom(rest, this.__meta);

    if (type !== undefined) this.type = type;
    if (dflt !== undefined) this.default = dflt;
    if (choices !== undefined) this.choices = choices;
    if (shape !== undefined) this.shape = shape;
  }
}

/**
 * Static field builder
 */
export class Fields {
  static boolean = function (options = {}) {
    return new ModelField({ type: `boolean`, ...options });
  };

  static string = function (options = {}) {
    const type = `string`;
    testChoiceDefault(type, options);
    return new ModelField({ type, ...options });
  };

  static number = function (options = {}) {
    const type = `number`;
    testChoiceDefault(type, options);
    return new ModelField({ type, ...options });
  };

  // TODO: add dedicated choice field, for when there is no strict "type"

  static model = function (model) {
    return new ModelField({ shape: model });
  };
}

function testChoiceDefault(type, options) {
  const v = options.default;
  if (v !== undefined && options.choices) {
    if (typeof v !== type && !options.choices.includes(v)) {
      throw new Error(
        `Cannot declare ${type} field with non-${type} value unless that value is exists in options.choices`
      );
    }
  }
}

/**
 * Validate a model field
 */
export function validate(key, value, definition, strict = false) {
  const schema = {
    [key]: {
      __meta: definition.__meta,
      type: definition.type,
      default: definition.default,
    },
  };

  [`choices`].forEach((k) => {
    const v = definition[k];
    if (v !== undefined) schema[key][k] = v;
  });

  const customValidate = definition.__meta.validate;
  const basic = basicSchema.validate(schema, { [key]: value }, strict);
  if (!customValidate || !basic.passed) return basic;

  try {
    if (customValidate(value) === false) {
      throw new Error(`${key} failed custom validation.`);
    }
    return { passed: true };
  } catch (err) {
    return { passed: false, errors: [err.toString().replace(`Error: `, ``)] };
  }
}
