import { makeMigration } from "../basic-js-schema.js";
import { config_schema } from "./config-schema.js";

// Let's mess with this schema!
const changed_schema = JSON.parse(JSON.stringify(config_schema));
changed_schema.wind_rotation.__meta.required = true;
changed_schema.wind_rotation.choices = [0, 1, 2, 3];
const nested_name = changed_schema.nested_property.shape.name;
nested_name.default = nested_name.choices[2];
changed_schema.wallhack2 = changed_schema.wallhack;
delete changed_schema.wallhack;
changed_schema.updated_property = {
  __meta: {
    description: "testing subtree relocation",
    required: true,
  },
  shape: {
    test_nested_move: changed_schema.movable_nested_property,
  },
};
delete changed_schema.movable_nested_property;
delete changed_schema.ruleset;
changed_schema.__meta.id = `v2`;

// Cool, cool, so... let's diff it!
console.log(makeMigration(config_schema, changed_schema));
