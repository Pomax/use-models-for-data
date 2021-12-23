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
  const create = (options.create = getCreateFunction(options));
  const { footer, ...otherOptions } = options;
  delete otherOptions.create;
  options.label ??= labelFunction;

  return create(`form`, {
    id: schema.__meta.name,
    ...otherOptions,
    children: [
      ...createFormTreeComponents(schema, object, options),
      footer,
    ].filter(Boolean),
  });
}

/**
 * ...DOCS GO HERE...
 */
function processFormTreeField(field_name, schema, object, options) {
  const { create, label } = options;
  const ref = object[field_name];
  const schemaEntry = schema[field_name];
  const { type, choices, shape } = schemaEntry;
  const { distinct, required, debug, configurable, description } =
    schemaEntry.__meta;

  if (!options.forceInclude) {
    if (configurable === false) return;
    if (debug === true && options.skipDebug !== false) return;
  }

  const id = `${
    schema.__meta.prefix ? `${schema.__meta.prefix}.` : ``
  }${field_name}`;

  if (distinct) {
    schemaEntry.__meta.prefix = id;
    return create(`fieldset`, {
      id: id,
      children: [...createFormTreeComponents(schemaEntry, ref, options)].flat(),
    });
  }

  if (shape) {
    if (!shape.__meta) {
      shape.__meta = {};
    }
    shape.__meta.prefix = id;

    // DIFFERENCE COMPARED TO createTableTreeRows STARTS HERE
    return create(`fieldset`, {
      id: id,
      children: [...createFormTreeComponents(shape, ref, options)].flat(),
    });
  }

  const fieldElements = [
    create(`label`, { for: id, children: [label(field_name)] }),
  ];

  __appendChildNode(
    fieldElements,
    create,
    id,
    choices,
    type,
    ref,
    required,
    options.disabled,
    options.inputHandler
  );

  const children = [
    create(`span`, { children: fieldElements, class: `form-element` }),
  ];

  if (options.descriptions) {
    children.push(create(`p`, { children: [description] }));
  }

  const div = create(`div`, { children });

  // END OF DIFFERENCE COMPARED TO createTableTreeRots

  return div;
}

function createFormTreeComponents(schema, object, options) {
  const { create, label } = options;

  // is this a "base" shaped model? If so, write it back up as a schema.
  if (schema.shape) {
    const __meta = schema.__meta;
    schema = schema.shape;
    schema.__meta = __meta;
  }

  const { __meta } = schema;
  if (__meta.form) {
    return [
      __meta.form[0].heading
        ? undefined
        : create(`h2`, {
            children: [schema.__meta.name || schema.__proto__.constructor.name],
            class: `model-name`,
          }),
      ...__meta.form.map((entry) => {
        const { descriptions, fields, heading, collapsed, controls } = entry;
        let { collapsible } = entry;
        const preamble = [];

        if (heading) {
          const headingid = heading
            .replace(/\W/g, `-`)
            .replace(/--+/g, `-`)
            .toLowerCase();
          collapsible = collapsible || collapsed;

          preamble.push(
            create(`label`, {
              children: [heading],
              for: `check-${headingid}`,
              class: `heading ${collapsible ? `collapsible` : ``}`.trim(),
            })
          );

          if (collapsible) {
            preamble.push(
              create(`input`, {
                type: `checkbox`,
                id: `check-${headingid}`,
                class: `heading-collapse`,
                checked: collapsed,
              }),
              create(`span`, { class: `heading-collapse` })
            );
          }
        }

        const allFields = fields
          .map((field_name) =>
            processFormTreeField(field_name, schema, object, {
              ...options,
              forceInclude: true,
              descriptions: descriptions !== false,
            })
          )
          .filter(Boolean);

        return allFields.length
          ? create(`fieldset`, {
              children: [
                ...preamble,
                ...allFields.flat(),
                controls
                  ? create(`div`, {
                      class: `controls`,
                      children: [
                        create(`button`, {
                          type: `submit`,
                          children: [controls.save],
                        }),
                        create(`button`, {
                          type: `reset`,
                          children: [controls.cancel],
                        }),
                      ],
                    })
                  : undefined,
              ],
            })
          : undefined;
      }),
    ];
  }

  return [
    create(`h2`, {
      children: [schema.__meta.name || schema.__proto__.constructor.name],
      class: `model-name`,
    }),
    ...Object.keys(schema)
      .filter((v) => v !== `__meta`)
      .map((field_name) =>
        processFormTreeField(field_name, schema, object, options)
      ),
  ].filter(Boolean);
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

function processTableTreeField(field_name, schema, object, options) {
  const { create, label } = options;
  const ref = object ? object[field_name] : undefined;
  const schemaEntry = schema[field_name];
  const { type, choices, shape } = schemaEntry;
  const { distinct, required, debug, configurable, description } =
    schemaEntry.__meta;

  if (configurable === false) return;
  if (debug === true && options.skipDebug !== false) return;

  const id = `${
    schema.__meta?.prefix ? `${schema.__meta.prefix}.` : ``
  }${field_name}`;

  if (distinct) {
    schemaEntry.__meta.prefix = id;
    return createTableTreeRows(schemaEntry, ref, options).flat();
  }

  if (shape) {
    if (!shape.__meta) {
      shape.__meta = {};
    }
    shape.__meta.prefix = id;
    const subfields = createTableTreeRows(shape, ref, options);
    if (subfields.length === 0) return [];
    return [
      create(`tr`, {
        children: [create(`td`, { colspan: 2, children: [label(field_name)] })],
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
  options.create = getCreateFunction(options);
  options.label ??= labelFunction;

  const { __meta } = schema;
  if (__meta.form) {
    schema = schema.shape;
    schema.__meta = __meta;
    return __meta.form.map((entry) => {
      const { header, collapsible, collapsed, descriptions, fields } = entry;
      return fields
        .map((field_name) =>
          processTableTreeField(field_name, schema, object, options)
        )
        .filter(Boolean)
        .flat();
    });
  }

  return Object.keys(schema)
    .filter((v) => v !== `__meta`)
    .map((field_name) =>
      processTableTreeField(field_name, schema, object, options)
    )
    .filter(Boolean)
    .flat();
}
