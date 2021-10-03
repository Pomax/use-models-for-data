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
}

export { User };
