import {
  ModelFromMissingData,
  DoNotUseModelConstructor,
  UndefinedKey,
  IncompleteModelSave,
  BadModelDataSubmission,
} from "../errors.js";
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
 * @class Model
 * @hideconstructor
 */
export class Model {
  /**
   * This symbol can be used to create models with missing
   * "required" fields. Note that this value is inherited,
   * and so can be referenced from your own model's name
   * rather than using Model.ALLOW_INCOMPLETE.
   *
   * E.g.
   *
   * <pre><code>
   *   class Something extends Model {
   *     // ...
   *   }
   *
   *   Something.create(undefined, Something.ALLOW_INCOMPLETE);
   * </code></pre>
   */
  static ALLOW_INCOMPLETE = Symbol();

  /**
   * Create an instance of this model, with an optional data
   * object that will be used to bootstrap the model's fields.
   *
   * Note that this data must be schema-conformant or the
   * create function will throw.
   *
   * @param {Object} [data] - an optional data object to bootstrap the model instance with.
   * @param {Symbol} [allowIncomplete] - allows models to be created without specifying all required data, if set to {@link Model.ALLOW_INCOMPLETE}.
   * @returns {Model} an instance of this model
   * @throws See {@link Models.create} for pass-through throws.
   */
  static create(data = undefined, allowIncomplete) {
    return Models.create(
      this,
      data,
      allowIncomplete === Model.ALLOW_INCOMPLETE
    );
  }

  /**
   * Similar to {@link create()}, except that a data object is <em>required</em>.
   *
   * If no data is provided, this method will throw.
   *
   * @param {Object} data - a data object to bootstrap the model instance with.
   * @param {Symbol} [allowIncomplete] - allows models to be created without specifying all required data, if set to {@link Model.ALLOW_INCOMPLETE}.
   * @returns {Model} data, an instance of this model, populated with the data from <code>data</code>.
   * @throws {@link Errors.ModelFromMissingData}
   * @throws See {@link Models.create} for pass-through throws.
   */
  static from(data, allowIncomplete) {
    if (!data || typeof data !== `object`) {
      throw new ModelFromMissingData(this.name);
    }
    return this.create(data, allowIncomplete);
  }

  /**
   * Load a stored record that uses this model from the back end.
   *
   * Note that this will throw if:
   *
   *  - there is no stored record to load
   *  - the stored record is not valid JSON
   *  - the stored record is not schema-conformant
   *
   * @param {*} recordName
   * @returns {*} a stored model instance
   * @throws {*} one of several errors
   */
  static async load(recordName) {
    return Models.loadModel(this, recordName);
  }

  /**
   * Save this model instance to the backend. Note that this
   * requires the model class to specify a <code>__meta.filename</code>
   * field, which must indicate which key path to use as
   * "primary key" equivalent, or be a function that, given a
   * model, yields a string to be used as record key.
   *
   * @throws {*} one of several errors
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
      throw new IncompleteModelSave(name, errors);
    }
  }

  /**
   * Delete this model from the backend.
   *
   * @throws {*} one of several errors
   */
  async delete() {
    await Models.deleteModel(this);
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
      throw new DoNotUseModelConstructor(name);
    }
  }

  /**
   * get a value by pathkey, rather than direct assignment
   *
   * @param {*} pathkey
   * @return {*} the pathkey-associated value
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
   * @throws {*} one of several errors
   */
  updateFromSubmission(data) {
    const Model = this.__proto__.constructor;
    const schema = Model.schema;
    const strictValidation = false; // we want the data to be coerced during validation
    const result = basicSchema.validate(schema, data, strictValidation);
    if (result.passed) return setDataFrom(data, this);

    // If we get here, there were problems, so let's be super clear about that and throw.
    throw new BadModelDataSubmission(Model.name, result.errors);
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
   * Generate a <form> element for viewing/updating this model.
   * See {@link html.createFormHTML} for details on what the
   * available <code>options</code> are.
   *
   * @param {object} options - a configuration object
   * @returns {String} form HTML string data
   * @see html.createFormHTML
   */
  toHTMLForm(options) {
    const schema = this.__proto__.constructor.schema;
    return html.createFormHTML(schema, this, options);
  }

  /**
   * Generate a <table> with form fields for this model.
   * See {@link html.createTableHTML} for details on what the
   * available <code>options</code> are.
   *
   * @param {object} options - a configuration object
   * @returns {String} table HTML string data
   * @see html.createTableHTML
   */
  toHTMLTable(options) {
    const schema = this.__proto__.constructor.schema;
    return html.createTableHTML(schema, this, options);
  }

  /**
   * Generate an array of <tr> elements with form fields for this model.
   * See {@link html.createTableRowHTML} for details on what the
   * available <code>options</code> are.
   *
   * @param {object} options - a configuration object
   * @returns {String} table rows HTML string data
   * @see html.createTableRowHTML
   */
  toHTMLTableRows(options) {
    const schema = this.__proto__.constructor.schema;
    return html.createTableRowHTML(schema, this, options);
  }

  // Form builders: Tree based data

  /**
   * <p>
   * Generate a node tree for working with this model's data
   * in some non-HTML context. By default, this yields the
   * (P)React equivalent of a <form>, with options.onSubmit
   * being used for submission handling.
   * </p>
   *
   * <p>
   * See {@link tree.createFormTree} for details on what the
   * available <code>options</code> are.
   * </p>
   *
   * @param {object} options - a configuration object
   * @returns {*} a JS object tree representing a form
   * @see tree.createFormTree
   */
  toForm(options = {}) {
    const schema = this.__proto__.constructor.schema;
    return tree.createFormTree(schema, this, options);
  }

  /**
   * <p>
   * Generate a node tree for working with this model's data
   * in some non-HTML context. By default, this yields the
   * (P)React equivalent of a <table> for templating into a
   * component render.
   * </p>
   *
   * <p>
   * See {@link tree.createTableTree} for details on what the
   * available <code>options</code> are.
   * </p>
   *
   * @param {object} options - a configuration object
   * @returns {*} a JS object tree representing a table
   * @see tree.createTableTree
   */
  toTable(options = {}) {
    const schema = this.__proto__.constructor.schema;
    return tree.createTableTree(schema, this, options);
  }

  /**
   * <p>
   * Generate an array of table rows for working with this
   * model's data in some non-HTML context. By default, this
   * yields an array of the (P)React equivalent of <tr>,
   * for templating into a component render.
   * </p>
   *
   * <p>
   * See {@link tree.createTableTree} for details on what the
   * available <code>options</code> are.
   * </p>
   *
   * @param {object} options - a configuration object
   * @returns {*} a JS array representing a set of table rows
   * @see tree.createTableTreeRows
   */
  toTableRows(options = {}) {
    const schema = this.__proto__.constructor.schema;
    return tree.createTableTreeRows(schema, this, options);
  }

  /**
   * Yield a fully qualified plain object, with default values included.
   *
   * @returns {*} a plain JS object
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
   * @returns {*} a JSON string with sorted keys
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
    throw new UndefinedKey(pathkey, name);
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
