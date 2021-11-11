import { Model, Models } from "use-models-for-data";
import { Profile } from "./user.model.js";
const { fields } = Models;

/**
 * ...
 */
export class User extends Model {
  __meta = {
    name: `users`,
    description: `Mahjong user data`,
    distinct: true, // when saved, this is its own file.
    recordName: `profile.name`, // when saving instances, auto-generate the filename using this field.
  };

  admin = fields.boolean({ default: false, configurable: false });
  profile = fields.model(Profile);
  stats = fields.model(Statistics);
}

class Statistics extends Model {
  __meta = {
    description: `Player statistics, maintained by the game system`,
    required: true,
  };

  games = fields.model(GameStatistics);
}

class GameStatistics extends Model {
  __meta = {
    description: `Game-related statistics`,
    configurable: false,
  };

  created = fields.number({ required: true, default: 0 });
  played = fields.number({ required: true, default: 0 });
  aborted = fields.number({ required: true, default: 0 });
  won = fields.number({ required: true, default: 0 });
  lost = fields.number({ required: true, default: 0 });
}
