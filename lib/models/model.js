import { Errors } from "../errors.js";
import { setDataFrom, sortedObjectKeys } from "./utils.js";
import * as basicSchema from "../schema/basic-js-schema.js";
import * as html from "../forms/create-html.js";
import * as tree from "../forms/create-tree.js";
import { Models, setupReferenceHandler } from "./models.js";

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
 * and always want to use either Model.create(), or
 * Model.load(), both of which fall through to the Models
 * class, which is essentially a factory class with
 * additional functionality bolted on.
 *
 * @class
 */
export class Model {
  // This flag lets folks create models with missing
  // "required" fields, provided those fields are marked
  // as "configurable: false" in the schema.
  static ALLOW_INCOMPLETE = Symbol();

  /**
   * Create an instance of this model, with an optional
   * data object that will be used to bootstrap the model's
   * fields.
   *
   * Note that this data must be schema-conformant or the
   * create function will throw.
   *
   * @static
   * @param {*} data
   * @param {*} allowIncomplete (must be Model.ALLOW_INCOMPLETE to do anything)
   * @returns a model instance
   * @throws one of several errors
   */
  static create = function (data = undefined, allowIncomplete) {
    return Models.create(
      this,
      data,
      allowIncomplete === Model.ALLOW_INCOMPLETE
    );
  };

  /**
   * Similar to .create(), except that a data object is expected
   * with which to boostrap the model instance. If no data is provided,
   * this method will throw.
   *
   * @static
   * @returns a model instance
   * @throws one of several errors
   */
  static from = function (data, ...args) {
    if (!data || typeof data !== `object`) {
      throw Errors.MODEL_FROM_MISSING_DATA(this);
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
   * @static
   * @param {*} recordName
   * @returns a stored model instance
   * @throws one of several errors
   */
  static load = async function (recordName) {
    return Models.loadModel(this, recordName);
  };

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
   *
   * @throws one of several errors
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
      const { name } = this.__proto__.constructor;
      const err = Errors.INCOMPLETE_MODEL_SAVE(name);
      err.errors = errors;
      throw err;
    }
  }

  /**
   * We don't want folks to call new Model(), so we make sure that
   * there's a few required arguments that library code uses,
   * but folks won't know to use themselves, giving them a nice
   * error that tells them to use Model.create or Model.from instead.
   *
   * @ignore
   */
  constructor(caller, when) {
    if (!caller || typeof when !== "number") {
      const { name } = this.__proto__.constructor;
      throw Errors.DO_NOT_USE_MODEL_CONSTRUCTOR(name);
    }
  }

  /**
   * get a value by pathkey, rather than direct assignment
   *
   * @param {*} pathkey
   * @return the pathkey-associated value
   */
  get(pathkey) {
    return getSetLevel(this, pathkey);
  }

  /**
   * set a value by pathkey, rather than direct assignment
   *
   * @param {*} pathkey
   * @param {*} value
   */
  set(pathkey, value) {
    getSetLevel(this, pathkey, value);
  }

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
   * @throws one of several errors
   */
  updateFromSubmission(data) {
    const Model = this.__proto__.constructor;
    const schema = Model.schema;
    const strictValidation = false; // we want the data to be coerced during validation
    const result = basicSchema.validate(schema, data, strictValidation);
    if (result.passed) return setDataFrom(data, this);

    // If we get here, there were problems, so let's be super clear about that and throw.
    const err = Errors.BAD_MODEL_DATA_SUBMISSION(Model.name);
    err.errors = result.errors;
    throw err;
  }

  /**
   * Recursively reset this model to default values, for any
   * value that has a default set in its associated schema.
   *
   * @param {*} postResetPayload the data with which to bootstrap this model after resetting.
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

  // Form builders: plain HTML

  /**
   * Generate a <form> element for viewing/updating this model
   *
   * @param {*} options
   * @returns form HTML string data
   */
  toHTMLForm(options) {
    const schema = this.__proto__.constructor.schema;
    return html.createFormHTML(schema, this, options);
  }

  /**
   * Generate a <table> with form fields for this model.
   *
   * @param {*} options
   * @returns table HTML string data
   */
  toHTMLTable(options) {
    const schema = this.__proto__.constructor.schema;
    return html.createTableHTML(schema, this, options);
  }

  /**
   * Generate an array of <tr> elements with form fields for this model.
   *
   * @param {*} options
   * @returns table rows HTML string data
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
   * @returns a JS object tree representing a form
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
   * @returns a JS object tree representing a table
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
   * @returns a JS array representing a set of table rows
   */
  toTableRows(options = {}) {
    const schema = this.__proto__.constructor.schema;
    return tree.createTableTreeRows(schema, this, options);
  }

  /**
   * Yield a fully qualified plain object, with default values included.
   *
   * @returns a plain JS object
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
   *
   * @returns a JSON string with sorted keys
   */
  toString() {
    return JSON.stringify(this, sortedObjectKeys, 2);
  }
}

/**
 * @ignore
 */
function testLevel(model, level, pathkey, terms) {
  const term = terms.shift();
  if (level[term] === undefined) {
    const { name } = model.__proto__.constructor;
    throw Errors.UNDEFINED_KEY(pathkey, name);
  }
  return term;
}

/**
 * @ignore
 */
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
