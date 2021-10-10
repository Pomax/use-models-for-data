export class ModelStore {
  ready() {
    return false;
  }

  async loadRecord(schema, recordName) {
    throw new Error(
      `Missing implementation for ${this.__proto__.constructor.name}.loadRecord(schema, recordName)`
    );
  }

  async saveRecord(schema, instance, recordName) {
    throw new Error(
      `Missing implementation for ${this.__proto__.constructor.name}.saveRecord(schema, instance, recordName)`
    );
  }

  loadSchema(schema) {
    throw new Error(
      `Missing implementation for ${this.__proto__.constructor.name}.loadSchema(schema)`
    );
  }

  saveSchema(Model) {
    throw new Error(
      `Missing implementation for ${this.__proto__.constructor.name}.saveSchema(Model)`
    );
  }

  saveMigration(schema1, schema2, migration) {
    throw new Error(
      `Missing implementation for ${this.__proto__.constructor.name}.saveMigration(schema1, schema2, migration)`
    );
  }
}
