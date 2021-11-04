/**
 * <p>
 * This is the only file that is permitted to create new Error objects.
 * Any throw that occurs in this library will be one of the errors listed.
 * </p>
 *
 * <p>
 * As such, any try/catch code you write against this library should make
 * sure to not blind-catch, but catch intentionally:
 * <p>
 *
 * <pre><code>
 *   import { Errors } from "use-models-for-data";
 *   import { MyModel } from "./my-models.js";
 *
 *   try {
 *     MyModel.load(`someRecordName`);
 *   } catch (err) {
 *     const type = err.__proto__.constructor;
 *     switch(type) {
 *       case (Errors.RecordDoesNotExist): ...
 *       case (Errors.RecordAccessError): ...
 *       ...
 *       case (TypeError): ...
 *       default: throw err;
 *     }
 *   }
 * </code></pre>
 *
 *
 * @namespace Errors
 */

export class MissingCreateFunction extends Error {
  /**
   * Used by the form building code to warn the user that they forgot to provide a create() function for transforming tag/props tuples into nodes.
   * @name Errors.MissingCreateFunction
   * @member
   */
  constructor() {
    super();
    this.message = `No create(tag, props) function provided.`;
  }
}

export class NothingToMigrate extends Error {
  /**
   * Used in migration code to signal that there are no actual diffs to migrate, despite being in a codepath that assumes that there are.
   * @name Errors.NothingToMigrate
   * @member
   */
  constructor() {
    super();
    this.message = `Nothing to migrate.`;
  }
}

export class PropertySchemaViolation extends Error {
  /**
   * Used in schema validation code, specifically the array wrapper, to signal an illegal value assignment.
   * @name Errors.PropertySchemaViolation
   * @member
   */
  constructor(errors) {
    super();
    this.message = `Assignment violates property schema.`;
    this.errors = errors;
  }
}

export class MissingChoicesArray extends Error {
  /**
   * Used in the model fields code to signal that an expected <code>choices</code> array is missing from the field properties.
   * @name Errors.MissingChoicesArray
   * @member
   */
  constructor() {
    super();
    this.message = `Missing choices array for choice field.`;
  }
}

export class NoStoreFound extends Error {
  /**
   * Used in the {@link Models} code when a code path assumes that there is a store available when there isn't.
   * @name Errors.NoStoreFound
   * @member
   */
  constructor() {
    super();
    this.message = `Cannot register models until after Models.setStore(store) has been called.`;
  }
}

export class StoreNotReady extends Error {
  /**
   * Used in the {@link Models} code when a code path assumes that a store is ready for use when it isn't.
   * @name Errors.StoreNotReady
   * @member
   */
  constructor() {
    super();
    this.message = `Store is not ready for use yet.`;
  }
}

export class TypeNotMatchedToChoices extends Error {
  /**
   * Used in the model fields code when a choice field with a <code>default</code> value does not contain that value in the available choices.
   * @name Errors.TypeNotMatchedToChoices
   * @member
   * @param {String} type - Field type for model field.
   */
  constructor(type) {
    super();
    this.message = `Cannot declare ${type} field with non-${type} value unless that value is exists in [options.choices].`;
    this.type = type;
  }
}

export class FieldFailedCustomValidation extends Error {
  /**
   * Used in the model field code to signal that a value did not pass custom validation (even if it passed basic validation).
   * @name Errors.FieldFailedCustomValidation
   * @member
   * @param {String} key - Model field name.
   */
  constructor(key) {
    super();
    this.message = `${key} value failed custom validation.`;
    this.key = key;
  }
}

export class CouldNotFindModel extends Error {
  /**
   * Used in the {@link ModelRegistry} to signal that the code tried to access an unknown schema.
   * @name Errors.CouldNotFindModel
   * @member
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `Could not retrieve schema for Model ${modelName}, did you forget to register() it?`;
    this.modelName = modelName;
  }
}

export class SchemaMismatchForModel extends Error {
  /**
   * Used in the {@link ModelRegistry} to signal that the currently loaded version of a schema does not match the stored version of that same schema.
   * @name Errors.SchemaMismatchForModel
   * @member
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `Schema mismatch for ${modelName} model, please migrate your data first.`;
    this.modelName = modelName;
  }
}

export class ModelCreateWithData extends Error {
  /**
   * Used in {@link Model} to signal that .create() was erroneously called a data payload.
   * @name Errors.ModelCreateWithData
   * @member
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `${modelName}.create() does not take a payload, use ${modelName}.load(data) instead.`;
    this.modelName = modelName;
  }
}

export class ModelFromMissingData extends Error {
  /**
   * Used in {@link Model} to signal that .from(data) was called without a data payload.
   * @name Errors.ModelFromMissingData
   * @member
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `${modelName}.from() must be called with a data object.`;
    this.modelName = modelName;
  }
}

export class IncompleteModelSave extends Error {
  /**
   * Used in {@link Model} to signal that the user tried to save a model that is missing required values (something which can only be the case if the model was built using the ALLOW_INCOMPLETE symbol)
   * @name Errors.IncompleteModelSave
   * @member
   * @param {String} modelName - Model class name.
   * @param {String[]} errors - Array of error strings describing all problems found.
   */
  constructor(modelName, errors) {
    super();
    this.message = `Cannot save incomplete ${modelName} model (created with ALLOW_INCOMPLETE).`;
    this.modelName = modelName;

    this.errors = errors;
  }
}

export class DoNotUseModelConstructor extends Error {
  /**
   * Thrown when code tries to construct a model using the <code>new</code> keyword, rather than the <code>create()</code> function.
   * @name Errors.DoNotUseModelConstructor
   * @member
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `Use ${modelName}.create() or ${modelName}.from(data) to build model instances.`;
    this.modelName = modelName;
  }
}

export class BadModelDataSubmission extends Error {
  /**
   * Used in {@link Model} to signal that a data update using a form submission object did not succeed due to validation failure.
   * @name Errors.BadModelDataSubmission
   * @member
   * @param {String} modelName - Model class name.
   * @param {String[]} errors - Array of error strings describing all problems found.
   */
  constructor(modelName, errors) {
    super();
    this.message = `Submitted data did not pass validation for ${modelName} schema.`;
    this.modelName = modelName;
    this.errors = errors;
  }
}

export class UndefinedKey extends Error {
  /**
   * Used in {@link Model} to signal a missing object property that was expect to exist, based on the model schema.
   * @name Errors.UndefinedKey
   * @member
   * @param {String} key - Model field name.
   * @param {String} modelName - Model class name.
   */
  constructor(key, modelName) {
    super();
    this.message = `Property [${key}] is not defined for model ${modelName}.`;
    this.modelName = modelName;
  }
}

export class RequiredFieldsMissing extends Error {
  /**
   * Used in {@link Models} to signal that something tried to build a {@link Model} without specifying values for all <code>required</code> properties in that model.
   * @name Errors.RequiredFieldsMissing
   * @member
   * @param {String} modelName - Model class name.
   * @param {String[]} errors - Array of error strings describing all problems found.
   */
  constructor(modelName, errors) {
    super();
    this.message = `Cannot create ${modelName}: missing required fields (without schema-defined default).`;
    this.modelName = modelName;
    this.errors = errors;
  }
}

export class AssignmentMustBeArray extends Error {
  /**
   * Used in {@link Models} to signal that an assignment to an <code>array</code> property was not an array.
   * @name Errors.AssignmentMustBeArray
   * @member
   * @param {String} key - Model field name.
   */
  constructor(key) {
    super();
    this.message = `Assignment for [${key}] must be an array.`;
    this.key = key;
  }
}

export class InvalidAssignment extends Error {
  /**
   * Used in {@Models} to signal that a property assignment was not permitted according to the model schema.
   * @name Errors.InvalidAssignment
   * @member
   * @param {String} key - Model field name.
   * @param {*} value - Property value for model field.
   * @param {String[]} errors - Array of error strings describing all problems found.
   */
  constructor(key, value, errors) {
    super();
    this.message = `${key} could not be assigned value [${value}].`;
    this.key = key;
    this.value = value;
    this.errors = errors;
  }
}

export class RecordDoesNotExist extends Error {
  /**
   * Used to signal a record cannot be resolved by a backend
   * @name Errors.RecordDoesNotExist
   * @member
   * @param {String} recordIdentifier - The fully qualified name of the record in question.
   * @param {*} details - any number of additional arguments that will be captured as error.details[].
   */
  constructor(recordIdentifier, ...details) {
    super();
    this.message = `Record ${recordIdentifier} does not exist.`;
    this.recordIdentifier = recordIdentifier;
    this.details = details;
  }
}

export class RecordAccessError extends Error {
  /**
   * Used to signal that a backend can find a record, but can't access it.
   * @name Errors.RecordAccessError
   * @member
   * @param {String} recordIdentifier - The fully qualified name of the record in question.
   * @param {*} details - any number of additional arguments that will be captured as error.details[].
   */
  constructor(recordIdentifier, ...details) {
    super();
    this.message = `Could not read file ${recordIdentifier}.`;
    this.recordIdentifier = recordIdentifier;
    this.details = details;
  }
}

export class RecordParseError extends Error {
  /**
   * Used to signal a filepath resolves to a file, but its content could not be parse as model record data.
   * @name Errors.RecordParseError
   * @member
   * @param {filepath} path - Path to a file in the filesystem.
   */
  constructor(path) {
    super();
    this.message = `Could not parse ${path}.`;
    this.path = path;
  }
}

export class MissingRecordNameBinding extends Error {
  /**
   * Used by the schema code to signal that a model could not be saved using an unqualified <code>save()</code> call.
   * @name Errors.MissingRecordNameBinding
   * @member
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `${modelName} model lacks a "__meta.recordname" binding for auto-saving model instances.`;
    this.modelName = modelName;
  }
}

export class MissingImplementation extends Error {
  /**
   * Thrown by anything that intends to be an abstract superclass, to make sure subclasses implement the necessary methods.
   * @name Errors.MissingImplementation
   * @member
   * @param {String} classAndMethodName - String representation of a class.method(signature).
   */
  constructor(classAndMethodName) {
    super();
    this.message = `Missing implementation for ${classAndMethodName}`;
    this.classAndMethodName = classAndMethodName;
  }
}

export class IncorrectSyncType extends Error {
  /**
   * Thrown by anything that intends to be an abstract superclass, to make sure subclasses implement the necessary methods.
   * @name Errors.IncorrectSyncType
   * @member
   * @param {String} classAndMethodName - String representation of a class.method(signature).
   * @param {String} [syncType] - "AsyncFunction" if this is supposed to be an async function, otherwise undefined.
   */
  constructor(classAndMethodName, syncType) {
    super();
    const should = syncType === `AsyncFunction` ? `should` : `should not`;
    this.message = `${classAndMethodName} ${should} be marked async.`;
    this.classAndMethodName = classAndMethodName;
  }
}
