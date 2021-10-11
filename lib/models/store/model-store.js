import { Errors } from "../../errors.js";

export class ModelStore {
  ready() {
    return false;
  }

  async loadRecord(schema, recordName) {
    throw Errors.MISSING_IMPLEMENTATION(
      `${this.__proto__.constructor.name}.loadRecord(schema, recordName)`
    );
  }

  async saveRecord(schema, instance, recordName) {
    throw Errors.MISSING_IMPLEMENTATION(
      `${this.__proto__.constructor.name}.saveRecord(schema, instance, recordName)`
    );
  }

  loadSchema(schema) {
    throw Errors.MISSING_IMPLEMENTATION(
      `${this.__proto__.constructor.name}.loadSchema(schema)`
    );
  }

  saveSchema(Model) {
    throw Errors.MISSING_IMPLEMENTATION(
      `${this.__proto__.constructor.name}.saveSchema(Model)`
    );
  }

  saveMigration(schema1, schema2, migration) {
    throw Errors.MISSING_IMPLEMENTATION(
      `${this.__proto__.constructor.name}.saveMigration(schema1, schema2, migration)`
    );
  }
}
