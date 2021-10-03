import * as schema from "../basic-js-schema.js";
import { config_schema, default_config } from "./config-schema.js";
import { createFormHTML, createTableRowHTML } from "../forms/create-html.js";
import { createFormTree } from "../forms/create-tree.js";

const strict = false;
const validator = schema.createValidator(config_schema, strict);
const errors = validator(default_config);
console.log(errors);

let configHTML = createFormHTML(config_schema, default_config, {
  formAction: "javascript:void(0)",
  submitLabel: "Save",
});
console.log(configHTML);

configHTML = createTableRowHTML(config_schema, default_config);
console.log(configHTML);

const configTree = createFormTree(config_schema, default_config, {
  create: (tag, props) => ({ tag, ...props }),
});
console.log(configTree);
