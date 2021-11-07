import { Fields, Model } from "../../index.js";

export class User extends Model {
  __meta = {
    name: `users`,
    distinct: true,
    recordName: `name`,
  };
  name = Fields.string({ required: true });
  password = Fields.string({ required: true, validate: (e) => !!e });
}
