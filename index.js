// libraries used that are also very useful on their own
import * as diff from "./lib/diff/diff.js";
import { equals } from "./lib/equals/equals.js";
import * as Errors from "./lib/errors.js";
import * as schema from "./lib/schema/basic-js-schema.js";

// The model functionality
import { Model } from "./lib/models/model.js";
import { Models } from "./lib/models/models.js";
import { Fields } from "./lib/models/fields.js";

// for named imports
export { equals, diff, schema, Errors, Model, Models, Fields };

// for namespace import
export default { equals, diff, schema, Errors, Model, Models, Fields };
