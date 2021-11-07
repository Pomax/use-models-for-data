import { Fields, Model } from "../../index.js";

export class User extends Model {
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
