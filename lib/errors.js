/**
 * This is the only file that is permitted to create new Error objects.
 * Everything that wants to throw must get its error objects here.
 */
export class Errors {
  static get MISSING_CREATE_FUNCTION() {
    return new Error(`No create(tag, props) function provided.`);
  }

  static get NOTHING_TO_MIGRATE() {
    return new Error(`nothing to migrate.`);
  }

  static get PROPERTY_SCHEMA_VIOLATION() {
    return new Error(`Assignment violates property schema.`);
  }

  static get MISSING_CHOICES_ARRAY() {
    return new Error(`Missing choices array for choice field.`);
  }

  static TYPE_NOT_MATCHED_TO_CHOICES(type) {
    return new Error(
      `Cannot declare ${type} field with non-${type} value unless that value is exists in options.choices`
    );
  }

  static FIELD_FAILED_CUSTOM_VALIDATION(key) {
    return new Error(`${key} value failed custom validation`);
  }

  static COULD_NOT_FIND_MODEL(modelName) {
    return new Error(
      `Could not retrieve schema for Model ${modelName}, did you forget to register() it?`
    );
  }

  static SCHEMA_MISMATCH_FOR_MODEL(modelName) {
    return new Error(
      `Schema mismatch for ${modelName} model, please migrate your data first.`
    );
  }

  static MODEL_FROM_MISSING_DATA(Model) {
    return new Error(`${Model.name}.from() must be called with a data object.`);
  }

  static INCOMPLETE_MODEL_SAVE(name) {
    new Error(
      `Cannot save incomplete ${name} model (created with ALLOW_INCOMPLETE)`
    );
  }

  static DO_NOT_USE_MODEL_CONSTRUCTOR(name) {
    return new Error(
      `Use ${name}.create() or ${name}.from(data) to build model instances.`
    );
  }

  static BAD_MODEL_DATA_SUBMISSION(name) {
    return new Error(
      `Submitted data did not pass validation for ${name} schema`
    );
  }

  static UNDEFINED_KEY(key, name) {
    return new Error(`Property [${key}] is not defined for model ${name}.`);
  }

  static get NO_STORE_FOUND() {
    return new Error(
      `Cannot register models until after Models.setStore(store) has been called.`
    );
  }

  static REQUIRED_FIELDS_MISSING(modelName) {
    return new Error(
      `Cannot create ${modelName}: missing required fields (without schema-defined default).`
    );
  }

  static get ASSIGNMENT_MUST_BE_ARRAY() {
    return new Error(`Assignment must be an array.`);
  }

  static get ASSIGNMENT_VIOLATES_SCHEMA() {
    return new Error(`Assignment violates property schema.`);
  }

  static INVALID_ASSIGNMENT(key, value) {
    return new Error(`${key} could not be assigned value [${value}].`);
  }

  static FILE_DOES_NOT_EXIST(path) {
    return new Error(`File ${path} does not exist.`);
  }

  static FILE_READ_ERROR(path) {
    return new Error(`Could not read file ${path}.`);
  }

  static FILE_PARSE_ERROR(path) {
    return new Error(`Could not parse ${path}.`);
  }

  static MISSING_RECORD_NAME_BINDING(name) {
    return new Error(
      `${name} model lacks a "__meta.recordname" binding for auto-saving model instances.`
    );
  }

  static MISSING_IMPLEMENTATION(desc) {
    return new Error(`Missing implementation for ${desc}`);
  }
}
