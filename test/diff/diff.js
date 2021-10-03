import { config_schema, default_config } from "../schema/test/config-schema.js";
import { createDiff, applyDiff } from "./diff.js";
import { validate } from "../schema/basic-js-schema.js";
import { makeMigration } from "../schema/migrations/make-migration.js";

(function () {
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

  // Cool, cool, so... let's diff it!
  const operations = createDiff(config_schema, changed_schema);
  console.log(`Migration will consist of:`);

  console.log(makeMigration(config_schema, changed_schema));
  return;

  console.log(`\n\n`);

  // should be no errors
  console.log(`data based on original schema:`, default_config);
  let errors = validate(config_schema, default_config);
  console.log(
    `validate(config_schema, data) -> ${
      !errors ? `data conforms to schema` : ``
    }`
  );
  if (errors) console.log(errors);

  // should be an error about a missing "updated_property"
  errors = validate(changed_schema, default_config);
  console.log(
    `validate(changed_schema, data) -> ${
      !errors ? `data conforms to schema` : ``
    }`
  );
  if (errors) console.log(errors);

  console.log(`\n\n`);

  const updated = applyDiff(operations, default_config);

  // should be no errors
  console.log(`data after applying schema diff:`, updated);
  errors = validate(changed_schema, updated);
  console.log(
    `validate(changed_schema, updated) -> ${
      !errors ? `data conforms to schema` : ``
    }`
  );
  if (errors) console.log(errors);

  // should be an error about a missing "movable_nested_property"
  errors = validate(config_schema, updated);
  console.log(
    `validate(config_schema, updated) -> ${
      !errors ? `data conforms to schema` : ``
    }`
  );
  if (errors) console.log(errors);
})();
