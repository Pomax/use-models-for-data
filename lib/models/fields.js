import {
  MissingChoicesArray,
  TypeNotMatchedToChoices,
  FieldFailedCustomValidation,
} from "../errors.js";
import { setDataFrom } from "./utils.js";
import * as basicSchema from "../schema/basic-js-schema.js";

/**
 * Generate correctly typed model fields, in the sense
 * that they are of a form that js-schema can work with.
 *
 * @ignore
 */
class ModelField {
  /**
   * Construct a model field object, with unpacked options,
   * mimicking a schema definition that matches what the
   * basic-js-schema code works with.
   *
   * @constructor
   * @param {Object} options - an options object.
   * @ignore
   */
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
 * Static model field builder.
 *
 * <p><strong>note</strong>: "one-or-more" is handled as `array: true` in the options, rather than being its own type of model field. (On the schema side this is the __meta.array:true property)</p>
 *
 * <p>All fields can be passed an options object that supports arbitrary keywords, with some exceptions that are used by the schema system itself:</p>, see above.
 *
 * <pre><code>
 *   {
 *     required: boolean,
 *     default: any value,
 *     choices: array of possible values,
 *     configurable: boolean,
 *     debug: boolean,
 *   }
 * </code></pre>
 *
 * @class
 * @hideconstructor
 */
export class Fields {
  /**
   * Model field definition for boolean values.
   *
   * @param {Object} options - an options object, see above.
   * @returns {ModelField}
   */
  static boolean(options = {}) {
    return new ModelField({ type: `boolean`, ...options });
  }

  /**
   *
   * @param {Object} options - an options object, see above.
   * @returns {ModelField}
   */
  static string(options = {}) {
    const type = `string`;
    testChoiceDefault(type, options);
    return new ModelField({ type, ...options });
  }

  /**
   *
   * @param {Object} options - an options object, see above.
   * @returns {ModelField}
   */
  static number(options = {}) {
    const type = `number`;
    testChoiceDefault(type, options);
    return new ModelField({ type, ...options });
  }

  /**
   *
   * @param {any[]} choices - Array of valid values for this field.
   * @param {Object} options - an options object, see above.
   * @returns {ModelField}
   */
  static choice(choices, options = {}) {
    if (choices === undefined || !(choices instanceof Array)) {
      throw new MissingChoicesArray();
    }
    return new ModelField({ type: undefined, choices, ...options });
  }

  /**
   *
   * @param {Model} model
   * @param {Object} options - an options object, see above.
   * @returns {ModelField}
   */
  static model(Model, options = {}) {
    return new ModelField({ shape: new Model(this, Date.now()), ...options });
  }
}

/**
 * @ignore
 * @param {*} type
 * @param {Object} options - an options object, see above.
 */
function testChoiceDefault(type, options) {
  const v = options.default;
  if (v !== undefined && options.choices) {
    if (typeof v !== type && !options.choices.includes(v)) {
      throw new TypeNotMatchedToChoices(type);
    }
  }
}

/**
 * Validate a model field
 *
 * @param {*} key
 * @param {*} value
 * @param {*} definition
 * @param {*} strict
 * @returns {boolean} True is this key/value pair passed validation, false if it didn't. Note that the value may have been rewritten to fit the correct type if <code>strict=false</code> was used.
 * @ignore
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
      throw new FieldFailedCustomValidation(key);
    }
    return { passed: true };
  } catch (err) {
    return { passed: false, errors: [err.message] };
  }
}
