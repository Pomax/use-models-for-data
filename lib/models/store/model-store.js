import { MissingImplementation, IncorrectSyncType } from "../../errors.js";

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
  constructor() {
    const prot = ModelStore.prototype;

    const subcon = this.constructor;
    const subprot = subcon.prototype;

    const names = Object.getOwnPropertyNames(prot);
    names.splice(names.indexOf(`constructor`), 1);
    names.forEach((name) => {
      const fn = prot[name];
      const fnstr = fn.toString();
      const argstr = fnstr.substring(fnstr.indexOf(`(`), fnstr.indexOf(`)`));

      const sfn = subprot[name] === prot[name] ? undefined : subprot[name];
      if (!sfn) {
        console.log(`${subcon.name} is missing ${name}?`, subprot);
        throw new MissingImplementation(
          `${this.constructor.name}.${name}(${argstr})`
        );
      }

      const syncType = fn[Symbol.toStringTag];
      if (sfn[Symbol.toStringTag] !== syncType) {
        throw new IncorrectSyncType(
          `${this.constructor.name}.${name}(${argstr})`,
          syncType
        );
      }
    });
  }

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
   * This method must delete a data record, keyed to both the indicated
   * <code>recordName</code> and schema.
   *
   * @param {schema} schema - The schema that this record conforms to.
   * @param {string} recordName - The key for this data.
   */
  async deleteRecord(schema, recordName) {
    throw new MissingImplementation(
      `${this.__proto__.constructor.name}.saveRecord(schema, instance, recordName)`
    );
  }

  /**
   *
   * @param {*} schema
   */
  async loadSchema(schema) {
    throw new MissingImplementation(
      `${this.__proto__.constructor.name}.loadSchema(schema)`
    );
  }

  /**
   *
   * @param {*} Model
   */
  async saveSchema(Model) {
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
  async saveMigration(schema1, schema2, migration) {
    throw new MissingImplementation(
      `${this.__proto__.constructor.name}.saveMigration(schema1, schema2, migration)`
    );
  }
}
