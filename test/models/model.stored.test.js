import fs from "fs";
import path from "path";
import { Errors, Models } from "../../index.js";
import { User } from "./user.model.js";
import { registry } from "../../lib/models/model-registry.js";

const { RecordAccessError } = Errors;

const moduleURL = new URL(import.meta.url);
const moduleDir = path.dirname(
  moduleURL.href.replace(`file:///`, process.platform === `win32` ? `` : `/`)
);

describe(`Testing User model with store backing`, () => {
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
    await Models.register(User);
  });

  /**
   * Load our test user "afresh" before every test.
   */
  beforeEach(async () => {
    try {
      user = await User.load(`TestUser`);
    } catch (e) {
      console.error;
      if (e instanceof RecordAccessError) {
        // This will fail for the first test, as it will not
        // be built and saved to disk until the second test.
      } else {
        throw e;
      }
    }
  });

  /**
   * Clean up the data store, unless the tests were run with
   * the `--keep` flag passed, to preserve the data store.
   */
  afterAll(() => {
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
    // Note that Array.from is used due to a Jest/V8 bug.
    // See https://github.com/facebook/jest/issues/11923 for more information.
    expect(dirs).toStrictEqual([`config`, `users`]);
  });

  test(`Can create and save user TestUser`, () => {
    expect(async () => {
      const user = await User.from(testData);
      const recordPath = `${storePath}/users/TestUser.json`;

      await user.save();
      if (!fs.existsSync(recordPath)) {
        throw new Error(`${recordPath} was not saved`);
      }
    }).not.toThrow();
  });

  test(`User "TestUser" loads from file`, () => {
    expect(user).toBeDefined();
    expect(user.profile.preferences.config.end_of_hand_timeout).toBe(
      testData.profile.preferences.config.end_of_hand_timeout
    );
    const json = user.toString();
    expect(json).toBeDefined();
  });

  test(`Saving user to file after changing value works`, async () => {
    let val = !user.profile.preferences.config.allow_chat;

    expect(async () => {
      user.profile.preferences.config.allow_chat = val;
      await user.save();
    }).not.toThrow();

    user = await User.load(`TestUser`);
    expect(user.profile.preferences.config.allow_chat).toBe(val);
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
    expect(async () => await user.save()).not.toThrow();
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
    expect(async () => await user.save()).not.toThrow();
  });

  test(`Incomplete models can be created but not saved`, async () => {
    let incomplete = await User.from(
      { "profile.name": `Just a name` },
      User.ALLOW_INCOMPLETE
    );

    try {
      await incomplete.save();
    } catch (err) {
      expect(err.message).toBe(
        `Cannot save incomplete model (created with ALLOW_INCOMPLETE)`
      );
    }

    try {
      await incomplete.save();
    } catch (err) {
      expect(err.errors).toStrictEqual([
        "profile.password: required field missing.",
      ]);
    }
  });

  // NOTE: this must be the last test
  test(`Can delete user TestUser`, () => {
    expect(async () => {
      const recordPath = `${storePath}/users/TestUser.json`;

      await user.delete();

      if (fs.existsSync(recordPath)) {
        throw new Error(`${recordPath} was not deleted`);
      }
    }).not.toThrow();
  });
});
