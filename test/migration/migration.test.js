import fs from "fs";
import path from "path";
import { Models } from "use-models-for-data";
import { User as SimpleUser } from "./user.model.v1.js";
import { User as ComplexUser } from "./user.model.v2.js";

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

  beforeEach(async () => {
    Models.resetRegistrations();
    await Models.useDefaultStore(storePath);
  });

  afterEach(() => {
    fs.rmSync(storePath, { recursive: true });
  });

  // ╔══════════════════════╗
  // ║ THE TESTS START HERE ║
  // ╚══════════════════════╝

  test(`Simple -> Complex User model uplift leads to migration`, async () => {
    await Models.register(SimpleUser);

    const user = await SimpleUser.create({
      name: `bob`,
      password: `bob`,
    });

    try {
      await user.save();
    } catch (e) {
      expect(e).not.toBeDefined();
    }

    try {
      await user.delete();
    } catch (e) {
      console.error(e);
      expect(e).not.toBeDefined();
    }

    let error;
    try {
      await Models.register(ComplexUser);
    } catch (e) {
      error = e;
    }

    expect(() => {
      throw error;
    }).toThrow(
      `Schema mismatch for User model, please migrate your data first.`
    );
  });

  test(`Migration file contains the correct operations`, async () => {
    let error;
    try {
      await Models.register(SimpleUser);
      await Models.register(ComplexUser);
    } catch (e) {
      error = e;
    }

    expect(() => {
      throw error;
    }).toThrow(
      `Schema mismatch for User model, please migrate your data first.`
    );

    const migrationFile = `${storePath}/users/User.v1.to.v2.js`;
    expect(fs.existsSync(migrationFile)).toBe(true);

    const migration = await import(migrationFile);
    expect(migration.operations).toStrictEqual([
      {
        type: "remove",
        key: "name",
        value: {
          __meta: {
            required: true,
          },
          type: "string",
        },
        fn: "removeName",
        rollback: "rollbackName",
      },
      {
        type: "remove",
        key: "password",
        value: {
          __meta: {
            required: true,
          },
          type: "string",
        },
        fn: "removePassword",
        rollback: "rollbackPassword",
      },
      {
        type: "add",
        key: "admin",
        value: {
          __meta: {},
          type: "boolean",
          default: false,
        },
        fn: "addAdmin",
        rollback: "rollbackAdmin",
      },
      {
        type: "add",
        key: "profile",
        value: {
          __meta: {
            name: "profiles",
            distinct: false,
          },
          shape: {
            name: {
              __meta: {
                required: true,
              },
              type: "string",
            },
            password: {
              __meta: {
                required: true,
              },
              type: "string",
            },
          },
        },
        fn: "addProfile",
        rollback: "rollbackProfile",
      },
    ]);
  });

  test(`A direct Config schema update (add) leads to correct migration behaviour`, async () => {
    // Register the original user model, which saves the config schema...
    const { User } = await import("../models/user.model.js");
    await Models.register(User);

    // ...and then try to register the updated config model, which should
    // cause a schema mismatch to get flagged, as config.v2 introduces
    // a new field called "allow_cat".
    const { Config } = await import("../models/config.model.v2.js");
    try {
      await Models.register(Config);
    } catch (e) {
      expect(e).toBeDefined();
    }

    const schemaPath = `${storePath}/config/.schema/Config.2.json`;
    expect(fs.existsSync(schemaPath)).toBe(true);

    const migrationPath = `${storePath}/config/Config.v1.to.v2.js`;
    expect(fs.existsSync(migrationPath)).toBe(true);

    const { operations } = await import(migrationPath);
    expect(operations).toStrictEqual([
      {
        type: "add",
        key: "allow_cat",
        value: {
          __meta: {
            description:
              "Determines whether or not to allow cats during a game.",
            icon: "🐈",
          },
          default: true,
          type: "boolean",
        },
        fn: "addAllowCat",
        rollback: "rollbackAllowCat",
      },
    ]);
  });

  test(`A direct Config schema update (rename) leads to correct migration behaviour`, async () => {
    const { User } = await import("../models/user.model.js");
    await Models.register(User);

    // config.v3 renames "allow_chat" to "allow_chats"
    const { Config } = await import("../models/config.model.v3.js");

    try {
      await Models.register(Config);
    } catch (e) {
      expect(e).toBeDefined();
    }

    const schemaPath = `${storePath}/config/.schema/Config.2.json`;
    expect(fs.existsSync(schemaPath)).toBe(true);

    const migrationPath = `${storePath}/config/Config.v1.to.v2.js`;
    expect(fs.existsSync(migrationPath)).toBe(true);

    // in order to not import the previously cached `v1.to.v2` file, we
    // need to rename this import so we can cleanly import it:
    const newMigrationPath = migrationPath.replace(`v1.to.v2`, `v1.to.v3`);
    fs.renameSync(migrationPath, newMigrationPath);

    const { operations } = await import(newMigrationPath);
    expect(operations).toStrictEqual([
      {
        fn: "renameAllowChatAllowChats",
        key: "allow_chats",
        oldKey: "allow_chat",
        rollback: "rollbackAllowChatAllowChats",
        type: "rename",
      },
    ]);
  });

  test(`A double model uplift should yield two migrations`, async () => {
    // Register the original user model, which saves the config schema...
    const { User } = await import("../models/user.model.js");
    await Models.register(User);

    // As before, this introduces the "allow_cat" property
    const { Config: ConfigV2 } = await import("../models/config.model.v2.js");
    try {
      await Models.register(ConfigV2);
    } catch (e) {
      expect(e).toBeDefined();
    }

    const schemaPath1 = `${storePath}/config/.schema/Config.2.json`;
    expect(fs.existsSync(schemaPath1)).toBe(true);

    const migrationPath1 = `${storePath}/config/Config.v1.to.v2.js`;
    expect(fs.existsSync(migrationPath1)).toBe(true);

    const { operations: operations1 } = await import(migrationPath1);
    expect(operations1).toStrictEqual([
      {
        type: "add",
        key: "allow_cat",
        value: {
          __meta: {
            description:
              "Determines whether or not to allow cats during a game.",
            icon: "🐈",
          },
          default: true,
          type: "boolean",
        },
        fn: "addAllowCat",
        rollback: "rollbackAllowCat",
      },
    ]);

    // However, in addition to renaming "allow_chat" to "allow_chats",
    // this sequence also means that "allow_cat" should get removed.

    const { Config: ConfigV3 } = await import("../models/config.model.v3.js");
    try {
      await Models.register(ConfigV3);
    } catch (e) {
      expect(e).toBeDefined();
    }

    const schemaPath2 = `${storePath}/config/.schema/Config.3.json`;
    expect(fs.existsSync(schemaPath2)).toBe(true);

    const migrationPath2 = `${storePath}/config/Config.v2.to.v3.js`;
    expect(fs.existsSync(migrationPath2)).toBe(true);

    const { operations: operations2 } = await import(migrationPath2);
    expect(operations2).toStrictEqual([
      {
        fn: "removeAllowCat",
        key: "allow_cat",
        rollback: "rollbackAllowCat",
        type: "remove",
        value: {
          __meta: {
            description:
              "Determines whether or not to allow cats during a game.",
            icon: "🐈",
          },
          default: true,
          type: "boolean",
        },
      },
      {
        fn: "renameAllowChatAllowChats",
        key: "allow_chats",
        oldKey: "allow_chat",
        rollback: "rollbackAllowChatAllowChats",
        type: "rename",
      },
    ]);
  });
});
