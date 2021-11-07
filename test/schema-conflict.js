import { Fields, Model, Models } from "../index.js";

import fs from "fs";
fs.rmSync(`./data-store-testing`, { recursive: true, force: true });

function getComplexUser() {
  class User extends Model {
    __meta = {
      name: `users`,
      distinct: true,
      recordName: `profile.name`,
    };
    admin = Fields.boolean({ default: false });
    profile = Fields.model(Profile);
  }

  class Profile extends Model {
    __meta = {
      name: `profiles`,
      distinct: false,
    };
    name = Fields.string({ required: true });
    password = Fields.string({ required: true, validate: (e) => !!e });
  }

  return User;
}

function getSimpleUser() {
  return class User extends Model {
    __meta = {
      name: `users`,
      distinct: true,
      recordName: `name`,
    };
    name = Fields.string({ required: true });
    password = Fields.string({ required: true, validate: (e) => !!e });
  };
}

(async function () {
  await Models.useDefaultStore(`./data-store-testing`);
  const User1 = getSimpleUser();
  await Models.register(User1);

  const u1 = await User1.from({
    name: `bob`,
    password: `bob`,
  });
  u1.save();

  const User2 = getComplexUser();
  try {
    await Models.register(User2);
  } catch (e) {
    console.error(e);
  }
})();

/**

  changeHandler.removeName = function (object, op, options) {
    cache.set(`name`, options.level.name);
  };

  changeHandler.removePassword = function (object, op, options) {
    cache.set(`password`, options.level.password);
  };

  changeHandler.addAdmin = function (object, op, options) {};

  changeHandler.addProfile = function (object, op, options) {
    object.profile.name = cache.get(`name`);
    object.profile.password = cache.get(`password`);
  };

*/
