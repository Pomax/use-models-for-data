import fs from "fs";
import path from "path";
import { Models } from "../../index.js";
import { User } from "../models/user.model.js";

// determine our store path
const moduleURL = new URL(import.meta.url);
const moduleDir = path.dirname(
  moduleURL.href.replace(`file:///`, process.platform === `win32` ? `` : `/`)
);

/**
 * Our battery of User tests
 */
describe(`Testing User model`, () => {
  const storePath = `${moduleDir}/store`;

  afterEach(() => {
    Models.resetRegistrations();
    fs.rmSync(storePath, { recursive: true });
  });

  // ╔══════════════════════╗
  // ║ THE TESTS START HERE ║
  // ╚══════════════════════╝

  test(`A direct User schema update leads to correct migration behaviour`, async () => {
    await Models.useDefaultStore(storePath);
    Models.register(User);

    // Register the original user model, then try to register the
    // updated user model, causing a schema mismatch.

    return import("../models/user.model.v2.js").then(async ({ User }) => {
      expect(() => Models.register(User)).toThrow();

      const schemaPath = `${storePath}/users/.schema/User.2.json`;
      expect(fs.existsSync(schemaPath)).toBe(true);

      const migrationPath = `${storePath}/users/User.v1.to.v2.js`;
      expect(fs.existsSync(migrationPath)).toBe(true);
    });
  });

  test(`A direct Config schema update leads to correct migration behaviour`, async () => {
    await Models.useDefaultStore(storePath);
    Models.register(User);

    // Register the original user model, which saves the config schema,
    // and then try to register the updated config model, which should
    // cause a schema mismatch to get flagged.

    return import("../models/config.model.v2.js").then(async ({ Config }) => {
      expect(() => Models.register(Config)).toThrow();

      const schemaPath = `${storePath}/config/.schema/Config.2.json`;
      expect(fs.existsSync(schemaPath)).toBe(true);

      const migrationPath = `${storePath}/config/Config.v1.to.v2.js`;
      expect(fs.existsSync(migrationPath)).toBe(true);
    });
  });

  test(`An indirect User schema update by changing Config leads to correct migration behaviour`, async () => {
    await Models.useDefaultStore(storePath);
    Models.register(User);

    // Same as before, except now the schema that triggers the mismatch is
    // User, but the schema that _causes_ the mismatch is Config, and so we
    // expect to see a new config schema file, with both a user migration
    // file, and a config migration file.

    return import("../models/user.model.v3.js").then(async ({ User }) => {
      expect(() => Models.register(User)).toThrow();

      const schemaPath = `${storePath}/config/.schema/Config.2.json`;
      expect(fs.existsSync(schemaPath)).toBe(true);

      let migrationPath = `${storePath}/config/Config.v1.to.v2.js`;
      expect(fs.existsSync(migrationPath)).toBe(true);

      migrationPath = `${storePath}/users/User.v1.to.v2.js`;
      expect(fs.existsSync(migrationPath)).toBe(true);
    });
  });

  test(`Two successive updates should lead to two migration files`, async () => {
    await Models.useDefaultStore(storePath);
    Models.register(User);

    return import("../models/user.model.v2.js").then(async ({ User }) => {
      expect(() => Models.register(User)).toThrow();
      const migrationPath1 = `${storePath}/users/User.v1.to.v2.js`;
      expect(fs.existsSync(migrationPath1)).toBe(true);

      return import("../models/user.model.v4").then(async ({ User }) => {
        expect(() => Models.register(User)).toThrow();
        const migrationPath2 = `${storePath}/users/User.v2.to.v3.js`;
        expect(fs.existsSync(migrationPath2)).toBe(true);
      });
    });
  });
});
