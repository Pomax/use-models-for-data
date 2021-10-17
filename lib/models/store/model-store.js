import { MissingImplementation } from "../../errors.js";

/**
 * <p>
 * This is the base class for model stores, which are used to give the
 * {@link Models} management class a data backend to work with, allowing
 * you to save and load {@link Model} instances.
 * </p>
 *
 * <p>
 * For an example of a ModelStore implementation, see {@link FileSystemStore}.
 * </p>
 *
 * @hideconstructor
 */
export class ModelStore {
  /**
   * @return {boolean} whether this store is ready for use or not.
   */
  ready() {
    return false;
  }

  /**
   * This method must load a data object, keyed to both the indicated
   * <code>recordName</code> and schema. How your model store implementation
   * does that is up to you, and schemas could map to directories, or
   * database tables, or even database files, or completely different
   * disks or domains - all that matters is that given a schema and a
   * recordname, this method yields the data previously stored for that tuple.
   *
   * @param {schema} schema - The schema that this record conforms to.
   * @param {string} recordName - The key with which the record was previously saved.
   */
  async loadRecord(schema, recordName) {
    throw new MissingImplementation(
      `${this.__proto__.constructor.name}.loadRecord(schema, recordName)`
    );
  }

  /**
   * This method must save a data object, keyed to both the indicated
   * <code>recordName</code> and schema. How your model store implementation
   * does that is up to you, and schemas could map to directories, or
   * database tables, or even database files, or completely different
   * disks or domains - all that matters is that given a schema and a
   * recordname, this method saves data in a way that it can be loaded later.
   *
   * @param {schema} schema - The schema that this record conforms to.
   * @param {object} instance - The schema-conformant data that is to be saved.
   * @param {string} recordName - The key with which this data should be saved.
   */
  async saveRecord(schema, instance, recordName) {
    throw new MissingImplementation(
      `${this.__proto__.constructor.name}.saveRecord(schema, instance, recordName)`
    );
  }

  /**
   *
   * @param {*} schema
   */
  loadSchema(schema) {
    throw new MissingImplementation(
      `${this.__proto__.constructor.name}.loadSchema(schema)`
    );
  }

  /**
   *
   * @param {*} Model
   */
  saveSchema(Model) {
    throw new MissingImplementation(
      `${this.__proto__.constructor.name}.saveSchema(Model)`
    );
  }

  /**
   *
   * @param {*} schema1
   * @param {*} schema2
   * @param {*} migration
   */
  saveMigration(schema1, schema2, migration) {
    throw new MissingImplementation(
      `${this.__proto__.constructor.name}.saveMigration(schema1, schema2, migration)`
    );
  }
}
