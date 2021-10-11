import { setDataFrom, sortedObjectKeys } from "./utils.js";
import * as basicSchema from "../schema/basic-js-schema.js";
import * as html from "../forms/create-html.js";
import * as tree from "../forms/create-tree.js";
import { Models, setupReferenceHandler } from "./models.js";

function testLevel(model, level, pathkey, terms) {
  const term = terms.shift();
  if (level[term] === undefined) {
    throw new Error(
      `Property [${pathkey}] is not defined for model ${model.__proto__.constructor.name}.`
    );
  }
  return term;
}

function getSetLevel(model, pathkey, value) {
  const terms = pathkey.split(`.`);
  let level = model;
  const getTerm = () => testLevel(model, level, pathkey, terms);
  while (terms.length > 1) level = level[getTerm()];
  const term = getTerm();
  if (value !== undefined) {
    level[term] = value;
  }
  return level[term];
}

/**
 * For the most part this is initially a js-schema object,
 * which gets transformed into a validation-controlled
 * data object.
 *
 * This conversion has to happen after the constructor
 * finishes, which means we can't do this as part of the
 * Model class's constructor, because that finishes before
 * the full class hierarchy instantiation has finished.
 *
 * As such, you never want to instantiate a model manually,
 * and always want to use either Models.create, or Models.load
 */
export class Model {
  // This flag lets folks create models with missing
  // "required" fields, provided those fields are marked
  // as "configurable: false" in the schema.
  static ALLOW_INCOMPLETE = true;

  /**
   * Create an instance of this model, with an optional
   * data object that will be used to bootstrap the model's
   * fields.
   *
   * Note that this data must be schema-conformant or the
   * create function will throw.
   *
   * @param {*} data
   * @param {*} allowIncomplete (defaults to false)
   * @returns
   * @throws
   */
  static create = function (data = undefined, allowIncomplete = false) {
    const instance = Models.create(this, data, allowIncomplete);
    if (allowIncomplete) {
      Object.defineProperty(instance, `__incomplete`, {
        enumerable: false,
        configurable: true,
        value: true,
      });
    }
    return instance;
  };

  /**
   * Similar to .create(), except that a data object is expected
   * with which to boostrap the model instance. If no data is provided,
   * this method will throw.
   *
   * @returns
   * @throws
   */
  static from = function (data, ...args) {
    if (!data || typeof data !== `object`) {
      throw new Error(`Model.from() must be called with a data object.`);
    }
    return this.create(data, ...args);
  };

  /**
   * Load a stored record that uses this model.
   *
   * Note that this will throw if:
   *
   *  - there is no stored record to load
   *  - the stored record is not valid JSON
   *  - the stored record is not schema-conformant
   *
   * @param {*} recordName
   * @returns
   * @throws
   */
  static load = async function (recordName) {
    return Models.load(this, recordName);
  };

  /**
   * We don't want folks to call new Model(), so we make sure that
   * there's a few required arguments that library code uses,
   * but folks won't know to use themselves, giving them a nice
   * error that tells them to use Model.create or Model.from instead.
   */
  constructor(caller, when) {
    if (!caller || typeof when !== "number") {
      const { name } = this.__proto__.constructor;
      throw new Error(
        `Use ${name}.create() or ${name}.from(data) to build model instances.`
      );
    }
  }

  /**
   * get a value by pathkey, rather than direct assignment
   * @param {*} pathkey
   * @param {*} value
   */
  get(pathkey) {
    return getSetLevel(this, pathkey);
  }

  /**
   * set a value by pathkey, rather than direct assignment
   * @param {*} pathkey
   * @param {*} value
   */
  set(pathkey, value) {
    getSetLevel(this, pathkey, value);
  }

  /**
   * Recursively reset this model to default values, for any
   * value that has a default set in its associated schema.
   */
  reset(postResetPayload) {
    Object.entries(this).forEach(([key, value]) => {
      const schema = this.__proto__.constructor.schema;
      if (value instanceof Model) {
        value.reset();
      } else {
        // Always try default value first
        if (schema[key].default) {
          this[key] = schema[key].default;
        }
        // If there's no default, and this field is not
        // required, we reset the field to its original
        // proxied getter/setter declaration.
        else if (!schema[key].__meta.required) {
          setupReferenceHandler(this, key, schema);
        }
        // If neither of those apply, then we can't
        // reset this value, and it stays what it is.
      }
    });

    if (postResetPayload) setDataFrom(postResetPayload, this);
  }

  /**
   * Save this model to file, either by explicitly specifying
   * a filename, or by relying on the Model's __meta.filename
   * attribute, which must indicate which key path to use as
   * "primary key" equivalent.
   *
   * Note that the filename is just the name, without any
   * directory or extension information. The directory will
   * be automatically determined based on the model name,
   * and all models are saved as json, using the .json extension.
   */
  async save() {
    let errors;
    if (this.__incomplete) {
      const schema = this.__proto__.constructor.schema;
      const result = basicSchema.validate(schema, this);
      if (result.passed) {
        delete this.__incomplete;
      } else {
        errors = result.errors;
      }
    }
    if (!this.__incomplete) {
      await Models.saveModel(this);
    } else {
      const err = new Error(
        `Cannot save incomplete model (created with ALLOW_INCOMPLETE)`
      );
      err.errors = errors;
      throw err;
    }
  }

  // Form builders: plain HTML

  /**
   * Generate a <form> element for viewing/updating this model
   *
   * @param {*} options
   * @returns
   */
  toHTMLForm(options) {
    const schema = this.__proto__.constructor.schema;
    return html.createFormHTML(schema, this, options);
  }

  /**
   * Generate a <table> with form fields for this model.
   *
   * @param {*} options
   * @returns
   */
  toHTMLTable(options) {
    const schema = this.__proto__.constructor.schema;
    return html.createTableHTML(schema, this, options);
  }

  /**
   * Geneate an array of <tr> elements with form fields for this model.
   *
   * @param {*} options
   * @returns
   */
  toHTMLTableRows(options) {
    const schema = this.__proto__.constructor.schema;
    return html.createTableRowHTML(schema, this, options);
  }

  // Form builders: Tree based data

  /**
   * Generate a node tree for working with this model's data
   * in some non-HTML context. By default, this yields the
   * (P)React equivalent of a <form>, with options.onSubmit
   * being used for submission handling.
   *
   * @param {*} options
   * @returns
   */
  toForm(options = {}) {
    const schema = this.__proto__.constructor.schema;
    return tree.createFormTree(schema, this, options);
  }

  /**
   * Generate a node tree for working with this model's data
   * in some non-HTML context. By default, this yields the
   * (P)React equivalent of a <table> for templating into a
   * component render.
   *
   * @param {*} options
   * @returns
   */
  toTable(options = {}) {
    const schema = this.__proto__.constructor.schema;
    return tree.createTableTree(schema, this, options);
  }

  /**
   * Generate an array of table rows for working with this
   * model's data in some non-HTML context. By default, this
   * yields an array of the (P)React equivalent of <tr>,
   * for templating into a component render.
   *
   * @param {*} options
   * @returns
   */
  toTableRows(options = {}) {
    const schema = this.__proto__.constructor.schema;
    return tree.createTableTreeRows(schema, this, options);
  }

  // Update this model from a (form) submission

  /**
   * Update this model from a form submission, or any data payload
   * that encodes the model data using a flat <keypath>:<string>
   * format, e.g. a format which encodes this object:
   *
   *    {
   *      prop1: val1,
   *      prop2: {
   *        prop3: val2,
   *        prop4: {
   *          prop5: val3
   *        }
   *      }
   *    }
   *
   * as this flat object:
   *
   *   {
   *     "prop1": "val1",
   *     "prop2.prop3": "val2",
   *     "prop2.prop4.prop5": "val3",
   *   }
   *
   * @param {*} data
   * @returns
   */
  updateFromSubmission(data) {
    const Model = this.__proto__.constructor;
    const schema = Model.schema;
    const strictValidation = false; // we want the data to be coerced during validation
    const result = basicSchema.validate(schema, data, strictValidation);
    if (result.passed) return setDataFrom(data, this);

    // If we get here, there were problems, so let's be super clear about that and throw.
    const msg = `Submitted data did not pass validation for ${Model.name} schema`;
    const err = new Error(msg);
    err.errors = result.errors;
    throw err;
  }

  /**
   * Yield a fully qualified plain object, with default values included.
   * @returns
   */
  valueOf() {
    const process = (model, output) => {
      const Model = model.__proto__.constructor;
      Object.entries(Model.schema).forEach(([key, value]) => {
        if (key === `__meta`) return;
        if (value.shape) {
          output[key] = {};
          return process(model[key], output[key]);
        }
        output[key] = model[key];
      });
      return output;
    };
    return process(this, {});
  }

  /**
   * Yield formatted JSON, with alphabetically sorted keys,
   * with all defaults omitted (as they are not enumerable).
   * @returns
   */
  toString() {
    return JSON.stringify(this, sortedObjectKeys, 2);
  }
}
