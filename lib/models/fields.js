import { Errors } from "../errors.js";
import { setDataFrom } from "./utils.js";
import * as basicSchema from "../schema/basic-js-schema.js";

/**
 * Generate correctly typed model fields, in the sense
 * that they are of a form that js-schema can work with.
 */
class ModelField {
  constructor(options = {}) {
    const defaultValue = options.default;
    const { type, choices, shape, ...rest } = options;
    delete rest.default;

    this.__meta = {};
    if (shape?.__meta) {
      this.__meta = shape.__meta;
      delete shape.__meta;
    }
    setDataFrom(rest, this.__meta);

    if (type !== undefined) this.type = type;
    if (defaultValue !== undefined) this.default = defaultValue;
    if (choices !== undefined) this.choices = choices;
    if (shape !== undefined) this.shape = shape;
  }
}

/**
 * Static field builder
 *
 * note: "one-or-more" is handled as `array: true` in
 *       the options, rather than being its own type of
 *       model field. (On the schema side this is the
 *       __meta.array:true property)
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

  static choice = function (choices, options = {}) {
    if (choices === undefined || !(choices instanceof Array)) {
      throw Errors.MISSING_CHOICES_ARRAY;
    }
    return new ModelField({ type: undefined, choices, ...options });
  };

  static model = function (Model, options = {}) {
    return new ModelField({ shape: new Model(this, Date.now()), ...options });
  };
}

function testChoiceDefault(type, options) {
  const v = options.default;
  if (v !== undefined && options.choices) {
    if (typeof v !== type && !options.choices.includes(v)) {
      throw Errors.TYPE_NOT_MATCHED_TO_CHOICES(type);
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
      throw Errors.FIELD_FAILED_CUSTOM_VALIDATION(key);
    }
    return { passed: true };
  } catch (err) {
    return { passed: false, errors: [err.message] };
  }
}
