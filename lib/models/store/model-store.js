import { MISSING_IMPLEMENTATION } from "../../errors.js";

/**
 * <p>To write a valid model store, extend this <code>ModelStore</code> class.</p>
 *
 * <p>For an example of a ModelStore implementation, see {@link FileSystemStore}.</p>
 *
 * @ignore
 */
export class ModelStore {
  /**
   * @return {boolean} whether this store is ready for use or not.
   */
  ready() {
    return false;
  }

  /**
   * ...
   * @param {*} schema
   * @param {*} recordName
   */
  async loadRecord(schema, recordName) {
    throw new MISSING_IMPLEMENTATION(
      `${this.__proto__.constructor.name}.loadRecord(schema, recordName)`
    );
  }

  /**
   *
   * @param {*} schema
   * @param {*} instance
   * @param {*} recordName
   */
  async saveRecord(schema, instance, recordName) {
    throw new MISSING_IMPLEMENTATION(
      `${this.__proto__.constructor.name}.saveRecord(schema, instance, recordName)`
    );
  }

  /**
   *
   * @param {*} schema
   */
  loadSchema(schema) {
    throw new MISSING_IMPLEMENTATION(
      `${this.__proto__.constructor.name}.loadSchema(schema)`
    );
  }

  /**
   *
   * @param {*} Model
   */
  saveSchema(Model) {
    throw new MISSING_IMPLEMENTATION(
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
    throw new MISSING_IMPLEMENTATION(
      `${this.__proto__.constructor.name}.saveMigration(schema1, schema2, migration)`
    );
  }
}
