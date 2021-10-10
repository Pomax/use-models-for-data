import { Models } from "../../index.js";
import { User } from "./user.model.js";

/**
 * Our battery of User tests
 */

describe(`Testing User model without store backing`, () => {
  let user;

  const testData = {
    profile: {
      name: `test`,
      password: `dace`,
    },
  };

  beforeAll(async () => {
    Models.resetRegistrations();
    Models.setStore(undefined);
  });

  beforeEach(() => {
    user = User.create(testData);
  });

  // ╔══════════════════════╗
  // ║ THE TESTS START HERE ║
  // ╚══════════════════════╝

  test(`Can create User model without a store backing`, () => {
    expect(user.profile.name).toBe(testData.profile.name);
    expect(user.profile.password).toBe(testData.profile.password);
  });

  test(`Model resetting works as expected`, () => {
    const { name, password } = user.profile;
    user.profile.preferences.config.end_of_hand_timeout = 0;
    user.profile.preferences.avatar = `empty.png`;
    user.profile.reset();
    expect(user.profile.preferences.config.end_of_hand_timeout).toBe(10000);
    expect(user.profile.preferences.avatar).toBe(undefined);
    expect(user.profile.name).toBe(name);
    expect(user.profile.password).toBe(password);
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
  });
});
