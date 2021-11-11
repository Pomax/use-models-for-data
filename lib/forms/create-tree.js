/**
 * @namespace tree
 */

import labelFunction from "./label-function.js";
import { getCreateFunction, __appendChildNode } from "./tree-helpers.js";

/**
 * <p>
 * similar to {@link html.createFormHTML}, except we're not building an
 * HTML string, we're building a DOM-like (e.g. (P)React) tree of content.
 * </p>
 *
 * <p>
 * The options object should take the following form:
 * </p>
 *
 * <pre><code>
 *   {
 *     create: function,
 *     footer: string,
 *     label: function,
 *     skipDebug: boolean,
 *     disabled: boolean,
 *     inputHandler: { function },
 *   }
 * </code></pre>
 *
 * <p>
 * TODO: write the rest of the docs here, explaining how each of these options affect code generation.
 * </p>
 *
 * @name tree.createFormTree
 * @param {schema} schema - A schema definition
 * @param {object} object - A schema-conformant definition
 * @param {object} options - See above.
 * @returns {tree} a DOM-style tree representing a form tree for working with this schema'd object
 */
export function createFormTree(schema, object, options) {
  const create = getCreateFunction(options);
  const { footer, ...otherOptions } = options;
  delete otherOptions.create;

  return create(`form`, {
    id: schema.__meta.name,
    ...otherOptions,
    children: [
      ...createFormTreeComponents(schema, object, options),
      footer,
    ].filter(Boolean),
  });
}

function createFormTreeComponents(schema, object, options) {
  const create = getCreateFunction(options);
  const label = options.label ?? labelFunction;

  return Object.keys(schema)
    .filter((v) => v !== `__meta`)
    .map((field_name) => {
      const ref = object[field_name];
      const schemaEntry = schema[field_name];
      const { type, choices, shape } = schemaEntry;
      const { required, debug, configurable, description } = schemaEntry.__meta;

      if (configurable === false) return;
      if (debug === true && options.skipDebug !== false) return;

      const id = `${
        schema.__meta.prefix ? `${schema.__meta.prefix}.` : ``
      }${field_name}`;

      if (shape) {
        if (!shape.__meta) {
          shape.__meta = {};
        }
        shape.__meta.prefix = id;

        // DIFFERENCE COMPARED TO createTableTreeRows STARTS HERE
        return create(`fieldset`, {
          id: id,
          children: [
            ...createFormTreeComponents(shape, ref, { create, label }),
          ],
        });
      }

      const children = [create(`label`, { children: [label(field_name)] })];

      __appendChildNode(
        children,
        create,
        id,
        choices,
        type,
        ref,
        required,
        options.disabled,
        options.inputHandler
      );

      children.push(create(`p`, { children: [description] }));

      const div = create(`div`, { children });

      // END OF DIFFERENCE COMPARED TO createTableTreeRots

      return div;
    })
    .filter(Boolean);
}

/**
 * <p>
 * similar to {@link html.createTableHTML}, except we're not building an
 * HTML string, we're building a DOM-like (e.g. (P)React) tree of content.
 * </p>
 *
 * @name tree.createFormTreeComponents
 * @param {schema} schema - A schema definition
 * @param {object} object - A schema-conformant definition
 * @param {object} options - See above.
 * @returns {tree} a DOM-style tree representing a table for working with this schema'd object
 */
export function createTableTree(schema, object, options) {
  const create = getCreateFunction(options);
  const { footer, ...otherOptions } = options;
  delete otherOptions.create;

  return create(`table`, {
    id: schema.__meta?.name,
    ...otherOptions,
    children: [
      ...createTableTreeRows(schema, object, options),
      options.footer,
    ].filter(Boolean),
  });
}

/**
 * <p>
 * similar to {@link html.createTableRowHTML}, except we're not building an
 * HTML string, we're building am array of DOM-like (e.g. (P)React) nods, mapping
 * to table rows.
 * </p>
 *
 * @name tree.createTableTreeRows
 * @param {schema} schema - A schema definition
 * @param {object} object - A schema-conformant definition
 * @param {object} options - See above.
 * @returns {node[]} a set of DOM-style nodes representing table rows for working with this schema'd object
 */
export function createTableTreeRows(schema, object, options) {
  const create = getCreateFunction(options);
  const label = options.label ?? labelFunction;

  return Object.keys(schema)
    .filter((v) => v !== `__meta`)
    .map((field_name) => {
      const ref = object ? object[field_name] : undefined;
      const schemaEntry = schema[field_name];
      const { type, choices, shape } = schemaEntry;
      const { required, debug, configurable, description } = schemaEntry.__meta;

      if (configurable === false) return;
      if (debug === true && options.skipDebug !== false) return;

      const id = `${
        schema.__meta?.prefix ? `${schema.__meta.prefix}.` : ``
      }${field_name}`;

      if (shape) {
        if (!shape.__meta) {
          shape.__meta = {};
        }
        shape.__meta.prefix = id;
        const subfields = createTableTreeRows(shape, ref, {
          ...options,
          create,
        });
        if (subfields.length === 0) return [];
        return [
          create(`tr`, {
            children: [
              create(`td`, { colspan: 2, children: [label(field_name)] }),
            ],
          }),
          ...subfields,
        ];
      }

      const row = create(`tr`, {
        children: [
          create(`td`, { title: description, children: [label(field_name)] }),
          create(`td`, {
            children: __appendChildNode(
              [],
              create,
              id,
              choices,
              type,
              ref !== undefined ? ref : schemaEntry.default,
              required,
              options.disabled,
              options.inputHandler
            ),
          }),
        ],
      });

      return row;
    })
    .filter(Boolean)
    .flat();
}
