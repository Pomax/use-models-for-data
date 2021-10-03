import { Config } from "./config.model.js";
import { Model, Models } from "../../index.js";
const { fields } = Models;

/**
 * ...
 */
class User extends Model {
  __meta = {
    name: `users`,
    description: `Mahjong user data`,
    distinct: true, // when saved, this is its own file.
    recordname: `profile.name`, // when saving instances, auto-generate the filename using this field.
  };

  admin = fields.boolean({ default: false, configurable: false });
  profile = fields.model(new Profile());
}

/**
 * ...
 */
export class Profile extends Model {
  __meta = {
    description: `...`,
    distinct: false, // Unlike the User model, this model should not be captured in its own file.
    required: true,
  };

  name = fields.string({ required: true, configurable: false });
  password = fields.string({ required: true, configurable: false });
  preferences = fields.model(new Preferences());
}

/**
 * ...
 */
class Preferences extends Model {
  __meta = {
    description: `General preferences object`,
    distinct: false, // Nor should this model be saved in its own file.
  };

  avatar = fields.string({
    description: `A picture that identifies this user`,
    validate: function (value) {
      if (!value.endsWith(`.png`)) throw new Error(`Avatar is not a .png file`);
    },
  });

  layout = fields.string({
    description: `Preferred game layout`,
    choices: [`traditional`, `stacked`],
    default: `traditional`,
  });

  config = fields.model(new Config()); // And this is a fully independent model
}

export { User, Config };
