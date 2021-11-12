import { ModelStore } from "./model-store.js";

/**
 * This is a dummy store that gets used as replacement for
 * filesystem-store.js in browser context by all bundlers
 * that respect the package.json "browsers" property when
 * set to a mapping object rather than a single entry
 * point string.
 *
 * See https://docs.npmjs.com/cli/v7/configuring-npm/package-json#browser
 */
class DummyStore extends ModelStore {
  constructor() {}
  ready() {
    return false;
  }
  async loadRecord(schema, recordName) {
    return undefined;
  }
  async saveRecord(schema, instance, recordName) {
    return false;
  }
  async deleteRecord(schema, recordName) {
    return false;
  }
  async loadSchema(schema) {
    return undefined;
  }
  async saveSchema(schema) {
    return false;
  }
  async saveMigration(schema1, schema2, migration) {
    return false;
  }
}

export { DummyStore, DummyStore as FileSystemStore };
