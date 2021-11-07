import { Config } from "./config.model.v2.js";
import { Model, Models } from "../../index.js";
const { fields } = Models;

/**
 * ...
 */
class User extends Model {
  __meta = {
    name: `users`,
    description: `Mahjong user data`,
    distinct: true,
    recordName: `profile.name`,
  };
  admin = fields.boolean({ default: false, configurable: false });
  profile = fields.model(Profile);
}

/**
 * ...
 */
export class Profile extends Model {
  __meta = {
    description: `...`,
    distinct: false,
    required: true,
  };
  name = fields.string({ required: true, configurable: false });
  password = fields.string({ required: true, configurable: false });
  preferences = fields.model(Preferences);
}

/**
 * ...
 */
class Preferences extends Model {
  __meta = {
    description: `General preferences object`,
    distinct: false,
  };
  avatar = fields.string({
    description: `A picture that identifies this user`,
    validate: function (value) {
      if (!value.endsWith(`.png`)) throw new Error(`not a png image`);
    },
  });
  layout = fields.string({
    description: `Preferred game layout`,
    choices: [`traditional`, `stacked`],
    default: `traditional`,
  });
  // Everything except for this model is the same as v1
  config = fields.model(Config);
}

export { User, Config };
