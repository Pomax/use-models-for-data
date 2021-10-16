/**
 * This is the only file that is permitted to create new Error objects.
 * Everything that wants to throw must get its error objects here.
 *
 * @namespace Errors
 */

export class MISSING_CREATE_FUNCTION extends Error {
  /**
   * Used by the form building code to warn the user that they forgot to provide a create() function for transforming tag/props tuples into nodes.
   * @name Errors.MISSING_CREATE_FUNCTION
   * @constructor
   * @ignore
   */
  constructor() {
    super();
    this.message = `No create(tag, props) function provided.`;
  }
}

export class NOTHING_TO_MIGRATE extends Error {
  /**
   * Used in migration code to signal that there are no actual diffs to migrate, despite being in a codepath that assumes that there are.
   * @name Errors.NOTHING_TO_MIGRATE
   * @constructor
   * @ignore
   */
  constructor() {
    super();
    this.message = `Nothing to migrate.`;
  }
}

export class PROPERTY_SCHEMA_VIOLATION extends Error {
  /**
   * Used in schema validation code, specifically the array wrapper, to signal an illegal value assignment.
   * @name Errors.PROPERTY_SCHEMA_VIOLATION
   * @constructor
   * @ignore
   */
  constructor(errors) {
    super();
    this.message = `Assignment violates property schema.`;
    this.errors = errors;
  }
}

export class MISSING_CHOICES_ARRAY extends Error {
  /**
   * Used in the model fields code to signal that an expected <code>choices</code> array is missing from the field properties.
   * @name Errors.MISSING_CHOICES_ARRAY
   * @constructor
   * @ignore
   */
  constructor() {
    super();
    this.message = `Missing choices array for choice field.`;
  }
}

export class NO_STORE_FOUND extends Error {
  /**
   * Used in the {@link Models} code when a code path assumes that there is a store available when there isn't.
   * @name Errors.NO_STORE_FOUND
   * @constructor
   * @ignore
   */
  constructor() {
    super();
    this.message = `Cannot register models until after Models.setStore(store) has been called.`;
  }
}

export class TYPE_NOT_MATCHED_TO_CHOICES extends Error {
  /**
   * Used in the model fields code when a choice field with a <code>default</code> value does not contain that value in the available choices.
   * @name Errors.TYPE_NOT_MATCHED_TO_CHOICES
   * @constructor
   * @ignore
   * @param {String} type - Field type for model field.
   */
  constructor(type) {
    super();
    this.message = `Cannot declare ${type} field with non-${type} value unless that value is exists in [options.choices].`;
  }
}

export class FIELD_FAILED_CUSTOM_VALIDATION extends Error {
  /**
   * Used in the model field code to signal that a value did not pass custom validation (even if it passed basic validation).
   * @name Errors.FIELD_FAILED_CUSTOM_VALIDATION
   * @constructor
   * @ignore
   * @param {String} key - Model field name.
   */
  constructor(key) {
    super();
    this.message = `${key} value failed custom validation.`;
  }
}

export class COULD_NOT_FIND_MODEL extends Error {
  /**
   * Used in the {@link ModelRegistry} to signal that the code tried to access an unknown schema.
   * @name Errors.COULD_NOT_FIND_MODEL
   * @constructor
   * @ignore
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `Could not retrieve schema for Model ${modelName}, did you forget to register() it?`;
  }
}

export class SCHEMA_MISMATCH_FOR_MODEL extends Error {
  /**
   * Used in the {@link ModelRegistry} to signal that the currently loaded version of a schema does not match the stored version of that same schema.
   * @name Errors.SCHEMA_MISMATCH_FOR_MODEL
   * @constructor
   * @ignore
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `Schema mismatch for ${modelName} model, please migrate your data first.`;
  }
}

export class MODEL_FROM_MISSING_DATA extends Error {
  /**
   * Used in {@link Model} to signal that .from(data) was called without a data payload.
   * @name Errors.MODEL_FROM_MISSING_DATA
   * @constructor
   * @ignore
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `${modelName}.from() must be called with a data object.`;
  }
}

export class INCOMPLETE_MODEL_SAVE extends Error {
  /**
   * Used in {@link Model} to signal that the user tried to save a model that is missing required values (something which can only be the case if the model was built using the ALLOW_INCOMPLETE symbol)
   * @name Errors.INCOMPLETE_MODEL_SAVE
   * @constructor
   * @ignore
   * @param {String} modelName - Model class name.
   * @param {String[]} errors - Array of error strings describing all problems found.
   */
  constructor(modelName, errors) {
    super();
    this.message = `Cannot save incomplete ${modelName} model (created with ALLOW_INCOMPLETE).`;
    this.errors = errors;
  }
}

export class DO_NOT_USE_MODEL_CONSTRUCTOR extends Error {
  /**
   * Thrown when code tries to construct a model using the <code>new</code> keyword, rather than the <code>create()</code> function.
   * @name Errors.DO_NOT_USE_MODEL_CONSTRUCTOR
   * @constructor
   * @ignore
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `Use ${modelName}.create() or ${modelName}.from(data) to build model instances.`;
  }
}

export class BAD_MODEL_DATA_SUBMISSION extends Error {
  /**
   * Used in {@link Model} to signal that a data update using a form submission object did not succeed due to validation failure.
   * @name Errors.BAD_MODEL_DATA_SUBMISSION
   * @constructor
   * @ignore
   * @param {String} modelName - Model class name.
   * @param {String[]} errors - Array of error strings describing all problems found.
   */
  constructor(modelName, errors) {
    super();
    this.message = `Submitted data did not pass validation for ${modelName} schema.`;
    this.errors = errors;
  }
}

export class UNDEFINED_KEY extends Error {
  /**
   * Used in {@link Model} to signal a missing object property that was expect to exist, based on the model schema.
   * @name Errors.UNDEFINED_KEY
   * @constructor
   * @ignore
   * @param {String} key - Model field name.
   * @param {String} modelName - Model class name.
   */
  constructor(key, modelName) {
    super();
    this.message = `Property [${key}] is not defined for model ${modelName}.`;
  }
}

export class REQUIRED_FIELDS_MISSING extends Error {
  /**
   * Used in {@link Models} to signal that something tried to build a {@link Model} without specifying values for all <code>required</code> properties in that model.
   * @name Errors.REQUIRED_FIELDS_MISSING
   * @constructor
   * @ignore
   * @param {String} modelName - Model class name.
   * @param {String[]} errors - Array of error strings describing all problems found.
   */
  constructor(modelName, errors) {
    super();
    this.message = `Cannot create ${modelName}: missing required fields (without schema-defined default).`;
    this.errors = errors;
  }
}

export class ASSIGNMENT_MUST_BE_ARRAY extends Error {
  /**
   * Used in {@link Models} to signal that an assignment to an <code>array</code> property was not an array.
   * @name Errors.ASSIGNMENT_MUST_BE_ARRAY
   * @constructor
   * @ignore
   * @param {String} key - Model field name.
   */
  constructor(key) {
    super();
    this.message = `Assignment for [${key}] must be an array.`;
  }
}

export class INVALID_ASSIGNMENT extends Error {
  /**
   * Used in {@Models} to signal that a property assignment was not permitted according to the model schema.
   * @name Errors.INVALID_ASSIGNMENT
   * @constructor
   * @ignore
   * @param {String} key - Model field name.
   * @param {*} value - Property value for model field.
   * @param {String[]} errors - Array of error strings describing all problems found.
   */
  constructor(key, value, errors) {
    super();
    this.message = `${key} could not be assigned value [${value}].`;
    this.errors = errors;
  }
}

export class FILE_DOES_NOT_EXIST extends Error {
  /**
   * Used to signal a filepath does not resolve to an actual file.
   * @name Errors.FILE_DOES_NOT_EXIST
   * @constructor
   * @ignore
   * @param {filepath} path - Path to a file in the filesystem.
   */
  constructor(path) {
    super();
    this.message = `File ${path} does not exist.`;
  }
}

export class FILE_READ_ERROR extends Error {
  /**
   * Used to signal a filepath resolves to a file, but that file could not be read in.
   * @name Errors.FILE_READ_ERROR
   * @constructor
   * @ignore
   * @param {filepath} path - Path to a file in the filesystem.
   */
  constructor(path) {
    super();
    this.message = `Could not read file ${path}.`;
  }
}

export class RECORD_PARSE_ERROR extends Error {
  /**
   * Used to signal a filepath resolves to a file, but its content could not be parse as model record data.
   * @name Errors.RECORD_PARSE_ERROR
   * @constructor
   * @ignore
   * @param {filepath} path - Path to a file in the filesystem.
   */
  constructor(path) {
    super();
    this.message = `Could not parse ${path}.`;
  }
}

export class MISSING_RECORD_NAME_BINDING extends Error {
  /**
   * Used by the schema code to signal that a model could not be saved using an unqualified <code>save()</code> call.
   * @name Errors.MISSING_RECORD_NAME_BINDING
   * @constructor
   * @ignore
   * @param {String} modelName - Model class name.
   */
  constructor(modelName) {
    super();
    this.message = `${modelName} model lacks a "__meta.recordname" binding for auto-saving model instances.`;
  }
}

export class MISSING_IMPLEMENTATION extends Error {
  /**
   * Thrown by anything that intends to be an abstract superclass, to make sure subclasses implement the necessary methods.
   * @name Errors.MISSING_IMPLEMENTATION
   * @constructor
   * @ignore
   * @param {String} classAndMethodName - String representation of a class.method(signature).
   */
  constructor(classAndMethodName) {
    super();
    this.message = `Missing implementation for ${classAndMethodName}`;
  }
}
