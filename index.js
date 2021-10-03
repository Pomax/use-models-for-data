// libraries used that are also very useful on their own
import * as schema from "./lib/schema/basic-js-schema.js";
import * as diff from "./lib/diff/diff.js";
import { equals } from "./lib/equals/equals.js";

// The model functionality
import { Model } from "./lib/models/model.js";
import { Models } from "./lib/models/models.js";
import { Fields } from "./lib/models/fields.js";

//
export { equals, diff, schema, Model, Models, Fields };
