import { User } from "./user.model.js";
import { Model, Models } from "../../index.js";
const { fields } = Models;

class TestModel extends Model {
  __meta = {
    name: `test`,
  };
  oneOrMore = fields.string({ array: true });
  secondary = fields.model({ model: Secondary, array: true });
}

class Secondary extends Model {
  __meta = {
    name: `nested`,
  };

  label = fields.string();
}

describe(`Testing User model with store backing`, () => {
  let user;

  beforeAll(() => {
    Models.register(TestModel);
    // console.log(TestModel.schema);
  });

  beforeEach(() => {
    user = User.create({ profile: { name: `test`, password: `test` } });
  });

  // ╔══════════════════════╗
  // ║ THE TESTS START HERE ║
  // ╚══════════════════════╝

  test(`Cannot create instances using new Model()`, () => {
    expect(() => new User()).toThrow(
      `Use User.create() or User.from(data) to build model instances.`
    );
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

  test(`User.create without a payload but allowIncomplete is not an error`, () => {
    const allowIncomplete = true;
    expect(() => User.create(undefined, User.ALLOW_INCOMPLETE)).not.toThrow();
  });

  test(`User.from without a payload is an error`, () => {
    expect(() => User.from()).toThrow(
      `Model.from() must be called with a data object.`
    );
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
    const data = user.toString();
    const parsed = JSON.parse(data);
    expect(
      parsed.profile.preferences.config.end_of_hand_timeout
    ).not.toBeDefined();
    // I think I'd like to further optimize this so that the preferences object isn't there.
    expect(parsed.profile.preferences.config).toStrictEqual({});
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

  test(`One-or-more test (__meta.array: true)`, () => {
    let instance;
    try {
      instance = TestModel.create();
    } catch (err) {
      console.log(err);
    }

    expect(instance).toBeDefined();
    expect(() => (instance.oneOrMore = "a")).toThrow(
      `oneOrMore could not be assigned value [a].`
    );

    instance.oneOrMore = [1];
    expect(instance.oneOrMore).toStrictEqual(["1"]);

    const secondary = Secondary.create({ label: `test` });
    expect(() => {
      instance.secondary = secondary;
    }).toThrow(`Assignment must be an array.`);

    expect(() => {
      instance.secondary = [secondary];
    }).not.toThrow();

    expect(instance.secondary.length).toBe(1);
    expect(instance.secondary[0].label).toBe(secondary.label);
  });
});
