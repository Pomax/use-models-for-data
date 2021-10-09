import fs from "fs";
import path from "path";
import { Models } from "../../index.js";
import { User } from "./user.model.js";
import { registry } from "../../lib/models/model-registry.js";

const moduleURL = new URL(import.meta.url);
const moduleDir = path.dirname(
  moduleURL.href.replace(`file:///`, process.platform === `win32` ? `` : `/`)
);

describe(`Testing User model with store backing`, () => {
  const keepFiles = process.argv.includes(`--keep`);

  const storePath = `${moduleDir}/store`;

  let user = undefined;

  const testData = {
    admin: true,
    profile: {
      name: `TestUser`,
      password: `TestUser`,
      preferences: {
        avatar: `test-user.png`,
        config: {
          allow_chat: false,
          end_of_hand_timeout: 2147483647,
          hand_start_timeout: 0,
          play_once_ready: true,
          rotate_on_draw: false,
          rotate_on_east_win: false,
        },
        layout: `stacked`,
      },
    },
  };

  /**
   * Before we start the tests, set up a store path, and register our User
   * model so that the on-disk schema file(s) exist when the tests run.
   */
  beforeAll(async () => {
    await Models.useDefaultStore(storePath);
    Models.resetRegistrations();
    Models.register(User);
  });

  /**
   * Load our test user "afresh" before every test.
   */
  beforeEach(() => {
    try {
      user = User.load(`TestUser`);
    } catch (e) {
      // this will fail for the first test, which then builds this record.
    }
  });

  /**
   * Clean up the data store, unless the tests were run with
   * the `--keep` flag passed, to preserve the data store.
   */
  afterAll(() => {
    if (keepFiles) return;
    fs.rmSync(storePath, { recursive: true });
  });

  // ╔══════════════════════╗
  // ║ THE TESTS START HERE ║
  // ╚══════════════════════╝

  test(`beforeAll User model registration should have registered four schemas`, () => {
    expect(Object.keys(registry.REGISTER)).toStrictEqual([
      `Config`,
      `Preferences`,
      `Profile`,
      `User`,
    ]);
  });

  test(`beforeAll User model registration should only use two schema directories`, () => {
    const dirs = Array.from(fs.readdirSync(storePath));
    // Note that Array.from is because of a Jest bug: https://github.com/facebook/jest/issues/11923
    expect(dirs).toStrictEqual([`config`, `users`]);
  });

  test(`User.create without a payload is not an error`, () => {
    expect(() => User.create(undefined, true)).not.toThrow();
  });

  test(`User.from without a payload is an error`, () => {
    expect(() => User.from()).toThrow(
      `Model.from() must be called with a data object.`
    );
  });

  test(`Can create user TestUser`, () => {
    expect(() => {
      const user = User.from(testData);
      user.save();
    }).not.toThrow();
  });

  test(`User .valueOf is a fully qualified plain object`, () => {
    const data = user.valueOf();
    const parsed = JSON.parse(JSON.stringify(data));
    expect(parsed.profile.preferences.config.player_count).toBeDefined();
    expect(parsed.profile.preferences.config.player_count).toBe(
      user.profile.preferences.config.player_count
    );
  });

  test(`User .toString is a deltas-only string`, () => {
    const parsed = JSON.parse(user.toString());
    expect(parsed.profile.preferences.config.end_of_hand_timeout).toBeDefined();
    expect(parsed.profile.preferences.config.player_count).not.toBeDefined();
  });

  test(`User "TestUser" loads from file`, () => {
    expect(user).toBeDefined();
    expect(user.profile.preferences.config.end_of_hand_timeout).toBe(
      testData.profile.preferences.config.end_of_hand_timeout
    );
    const json = user.toString();
    expect(json).toBeDefined();
  });

  test(`Submodels work as standalone models`, () => {
    expect(user.toHTMLTable().slice(0, 6)).toBe(`<table`);
    expect(user.profile.toHTMLTable().slice(0, 6)).toBe(`<table`);
  });

  test(`Toggle "config.allow_chat" is permitted (direct)`, () => {
    const val = user.profile.preferences.config.allow_chat;
    expect(() => {
      user.profile.preferences.config.allow_chat = !val;
    }).not.toThrow();
  });

  test(`Toggle "config.allow_chat" is permitted (pathkey)`, () => {
    const val = user.profile.preferences.config.allow_chat;
    expect(() => {
      user.set(`profile.preferences.config.allow_chat`, !val);
    }).not.toThrow();

    expect(user.get(`profile.preferences.config.allow_chat`)).toBe(!val);
  });

  test(`Setting user avatar to non-png-file string is not permitted`, () => {
    // slight hack: if we comment off the validate function in the model,
    // this test will immediately pass instead of running anything.
    const preferences = User.schema.profile.shape.preferences.shape;
    const validate = preferences.avatar.__meta.validate;
    if (!validate) return;

    try {
      user.profile.preferences.avatar = "not-a-png-file-name";
    } catch (e) {
      expect(e.errors).toStrictEqual([`Avatar is not a .png file`]);
    }
  });

  test(`Saving user to file after changing value works`, () => {
    let val = !user.profile.preferences.config.allow_chat;

    expect(() => {
      user.profile.preferences.config.allow_chat = val;
      user.save();
    }).not.toThrow();

    user = User.load(`TestUser`);
    expect(user.profile.preferences.config.allow_chat).toBe(val);
  });

  test(`Setting values from flat objects works`, () => {
    expect(() => {
      user.updateFromSubmission({
        "profile.name": user.profile.name.toUpperCase(),
        "profile.password": user.profile.password.toUpperCase(),
        "profile.preferences.config.allow_chat": "true",
        "profile.preferences.config.end_of_hand_timeout": "10000",
        "profile.preferences.config.seat_rotation": "-1",
        "profile.preferences.layout": "traditional",
      });
    }).not.toThrow();
    expect(user.profile.preferences.config.end_of_hand_timeout).toBe(10000);
  });

  test(`Assigning subtrees works`, () => {
    expect(() => {
      user.profile = {
        name: user.profile.name.toLowerCase(),
        password: user.profile.password.toLowerCase(),
        preferences: {
          config: {
            allow_chat: false,
            end_of_hand_timeout: 100,
            seat_rotation: 1,
          },
          layout: `stacked`,
        },
      };
    }).not.toThrow();
  });

  test(`Model resetting works as expected`, () => {
    const { name, password } = user.profile;
    user.profile.preferences.config.end_of_hand_timeout = 0;
    user.profile.preferences.avatar = `empty.png`;
    user.profile.reset();

    // end_of_hand_timeout is not required, and has a default value to revert to.
    expect(user.profile.preferences.config.end_of_hand_timeout).toBe(10000);

    // avatar is not required, but has no default, so should become undefined.
    expect(user.profile.preferences.avatar).toBe(undefined);

    // The name and password fields are required, have no defaults, and may not be undefined.
    // As such, they should stay what they were before reset() was called.
    expect(user.profile.name).toBe(name);
    expect(user.profile.password).toBe(password);

    // and we should be able to save this user without errors, still
    expect(() => user.save()).not.toThrow();
  });

  test(`Model resetting with a post-reset payload works as expected`, () => {
    const { name, password } = user.profile;
    user.profile.preferences.config.end_of_hand_timeout = 0;
    user.profile.preferences.avatar = `empty.png`;
    user.profile.reset({
      preferences: {
        avatar: "New Avatar.png",
        config: {
          end_of_hand_timeout: 0,
        },
      },
    });
    expect(user.profile.preferences.config.end_of_hand_timeout).toBe(0);
    expect(user.profile.preferences.avatar).toBe(`New Avatar.png`);
    expect(user.profile.name).toBe(name);
    expect(user.profile.password).toBe(password);
    expect(() => user.save()).not.toThrow();
  });

  test(`Setting "config.player_count" to false is a validation error (direct)`, () => {
    expect(() => {
      user.profile.preferences.config.player_count = false;
    }).toThrow(`player_count could not be assigned value [false].`);
  });

  test(`Setting "config.player_count" to false is a validation error (pathkey)`, () => {
    expect(() => {
      user.set(`profile.preferences.config.player_count`, false);
    }).toThrow(`player_count could not be assigned value [false].`);
  });

  test(`Setting nonexistent pathkey is a validation error`, () => {
    expect(() => {
      user.set(`profile.preferences.config.unknown_setting`, 1);
    }).toThrow(
      `Property [profile.preferences.config.unknown_setting] is not defined for model User.`
    );
  });

  test(`Incomplete models can be created but not saved`, () => {
    let incomplete;
    expect(() => {
      incomplete = User.create(
        { "profile.name": `Just a name` },
        User.ALLOW_INCOMPLETE
      );
    }).not.toThrow();

    expect(() => {
      incomplete.save();
    }).toThrow(`Cannot save incomplete model (created with ALLOW_INCOMPLETE`);

    try {
      incomplete.save();
    } catch (err) {
      expect(err.errors).toStrictEqual([
        "profile.password: required field missing.",
      ]);
    }
  });

  test(`Assigning bad subtrees throws`, () => {
    try {
      user.profile = {
        // missing name and password fields
        preferences: {
          config: {
            allow_chat: `test`, // also, this field has to be a boolean
          },
        },
      };
    } catch (e) {
      expect(e.errors).toStrictEqual([
        `name: required field missing.`,
        `password: required field missing.`,
        `preferences.config.allow_chat: value is not a valid boolean.`,
      ]);
    }
  });

  test(`Cannot create without initial data if there are required fields`, () => {
    try {
      User.create();
    } catch (e) {
      expect(e.errors).toStrictEqual([
        `profile.name: required field missing.`,
        `profile.password: required field missing.`,
      ]);
    }
  });

  test(`Cannot create with initial data that is missing required fields`, () => {
    try {
      User.create({
        profile: {
          password: `hake`,
        },
      });
    } catch (e) {
      expect(e.errors).toStrictEqual([`profile.name: required field missing.`]);
    }
  });
});
