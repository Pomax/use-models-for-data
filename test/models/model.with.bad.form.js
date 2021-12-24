import { Model, Models } from "use-models-for-data";
const { fields } = Models;

/**
 * ...
 */
class BadForm extends Model {
  __meta = {
    name: `badform`,
    description: `a model with bad form declarations`,
    distinct: true,
    form: [
      {
        heading: `something`,
        descriptions: false,
        collapsible: true,
        fields: [`unknown_field_1`, `a`, `b`],
      },
      {
        heading: `something else`,
        fields: [`c`, `unknown_field_2`, `d`],
      },
    ],
  };

  a = fields.boolean({ default: true });
  b = fields.boolean({ default: true });
  c = fields.boolean({ default: true });
  d = fields.boolean({ default: true });
}

export { BadForm };
