import fs from "fs";
import path from "path";
import {
  RecordAccessError,
  RecordParseError,
  RecordDoesNotExist,
} from "../../errors.js";
import { ModelStore } from "./model-store.js";
import { equals } from "../../equals/equals.js";
import * as basicSchema from "../../schema/basic-js-schema.js";
import * as migrations from "../../migration/make-migration.js";

/**
 * A simple storage backend for use with Node.js, using the filesystem.
 * @extends ModelStore
 */
export class FileSystemStore extends ModelStore {
  /**
   *
   * @param {*} path
   */
  constructor(path) {
    super();
    fs.mkdirSync(path, { recursive: true });
    this.storePath = path;
  }

  /**
   *
   * @returns {boolean} True if the file system store is ready to read/write files.
   */
  ready() {
    return !!this.storePath;
  }

  /**
   * Load a model record's data from the model schema's data directory
   * @param {*} schema
   * @param {*} recordName
   * @returns {object} A plain JS data object
   */
  async loadRecord(schema, recordName) {
    let fileData = undefined;
    const filepath = `${this.storePath}/${schema.__meta.name}/${recordName}.json`;

    // Can we read this file?
    try {
      fileData = await fs.promises.readFile(filepath);
    } catch (e) {
      throw new RecordAccessError(filepath);
    }

    // Can we *parse* this file?
    try {
      fileData = JSON.parse(fileData);
    } catch (e) {
      throw new RecordParseError(filepath);
    }

    return fileData;
  }

  /**
   * Save a model instance to the model schema's data directory.
   * @param {*} schema
   * @param {*} instance
   * @param {*} recordName
   */
  async saveRecord(schema, instance, recordName) {
    const filepath = `${this.storePath}/${schema.__meta.name}/${recordName}.json`;
    await fs.promises.writeFile(filepath, instance.toString());
  }

  /**
   * Delete a model instance from the model schema's data directory.
   * @param {*} schema
   * @param {*} recordName
   */
  async deleteRecord(schema, recordName) {
    const filepath = `${this.storePath}/${schema.__meta.name}/${recordName}.json`;
    if (!fs.existsSync(filepath)) {
      throw new RecordDoesNotExist(filepath);
    }
    try {
      return fs.promises.unlink(filepath);
    } catch (err) {
      throw new RecordAccessError(filepath);
    }
  }

  /**
   * Save a model's schema to disk
   * @param {*} Model
   */
  async saveSchema(Model) {
    // Turn monolithic schema into a set of linked schema
    const schema = new Model(this, Date.now());

    // how many distinct schema are we actually working with?
    const schemaSet = basicSchema.unlinkSchema(schema);

    // generate new files for the updated schema.
    while (schemaSet.length) {
      const { schema, __meta } = schemaSet.shift();
      schema.__meta = __meta;
      const schemaName = schema.__proto__.constructor.name;

      // Make sure we have a dir to write to
      const dir = `${this.storePath}/${__meta.name}/.schema`;
      fs.mkdirSync(dir, { recursive: true });

      // Is this (sub)schema the same as the previous version?
      // Because it's possible a change in the overall schema does
      // not actually change anything in a distinct subschema, or vice
      // versa, and there's no point in a new, but "the same", file.

      let newVersion = 1;
      const stored = await this.getLatestSchemaFilePath(dir, schemaName);

      if (stored.version) {
        newVersion = stored.version + 1;
        const { filepath } = stored;
        const s1 = fs.readFileSync(filepath).toString();
        const s2 = schema.toString();
        if (equals(s1, s2)) return;
      }

      // This is not the same data as the previously stored version.
      const newschemafile = `${schemaName}.${newVersion}.json`;
      const newfilepath = `${dir}/${newschemafile}`;

      // Write the schema to file, iF it doesn't already exist, because
      // linked schema might already have a stored schema file.
      if (!fs.existsSync(newfilepath)) {
        fs.writeFileSync(newfilepath, schema.toString());
      }
    }
  }

  /**
   * Load a schema by name, automatically making sure to load the latest
   * version if there are multiple versions in the schema's `.schema` dir.
   * @param {*} schema
   * @returns {schema} The latest version of this schema as found in the file system.
   */
  async loadSchema(schema) {
    const { name } = schema.__proto__.constructor;
    return this.getLatestSchema(name);
  }

  /**
   * Get the latest schema, loaded from the relevant schema dir.
   * @param {*} dir
   * @param {*} schemaName
   * @returns {schema} The latest version of this schema as found in the file system.
   * @ignore
   */
  async getLatestSchema(schemaName) {
    const dir = `${this.storePath}/${schemaName}/.schema/`;
    if (!fs.existsSync(dir)) return;

    const { filepath, version } = await this.getLatestSchemaFilePath(
      dir,
      schemaName
    );
    if (!fs.existsSync(filepath)) return;

    const schema = await this.loadSchemaFromFilePath(filepath);
    Object.defineProperty(schema.__meta, `version`, {
      configurable: false,
      enumerable: false,
      value: version,
    });
    return schema;
  }

  /**
   * determine the latest schema file, based on version number
   * @param {*} dir
   * @param {*} schemaName
   * @returns {filepath} The file path for the latest version of the named schema as found in the file system.
   * @ignore
   */
  async getLatestSchemaFilePath(dir, schemaName) {
    const re = new RegExp(`${schemaName}\\.(\\d+)\\.json`);
    const versions = fs
      .readdirSync(dir)
      .filter((n) => n.match(re))
      .map((n) => {
        const s = n.replace(re, `$1`);
        return parseInt(s);
      });
    const version = versions.sort((a, b) => b - a)[0];
    return {
      filepath: `${dir}/${schemaName}.${version}.json`,
      version,
    };
  }

  /**
   * @param {*} schemaPath
   * @returns {schema} a schema object
   * @ignore
   */
  async loadSchemaFromFilePath(schemaPath) {
    if (!fs.existsSync(schemaPath)) {
      throw new RecordDoesNotExist(schemaPath);
    }
    const data = fs.readFileSync(schemaPath);
    // the following two lines may throw:
    const parsed = JSON.parse(data);
    basicSchema.linkSchema(parsed, await this.getLatestSchema);
    return parsed;
  }

  /**
   * ...
   * @param {*} schema1
   * @param {*} schema2
   * @param {*} migration
   */
  async saveMigration(schema1, schema2, migration) {
    const from = schema1.__meta.version;
    const filename = `${schema2.__proto__.constructor.name}.v${from}.to.v${
      from + 1
    }.js`;
    let filepath = `${this.storePath}/${schema2.__meta.name}/${filename}`;
    filepath = path.posix.normalize(filepath);
    const script = migrations.finalizeMigration(migration);
    fs.writeFileSync(filepath, script, `utf-8`);
  }
}
