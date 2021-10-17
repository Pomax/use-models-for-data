/**
 * @namespace html
 */
import {
  createFormTree,
  createTableTree,
  createTableTreeRows,
} from "./create-tree.js";

import { document, htmlProps, boolProps } from "./fake-dom/document.js";

function create(tag, props) {
  const element = document.createElement(tag);
  if (props.children) {
    props.children.forEach((c) => element.appendChild(c));
  }
  htmlProps.forEach((prop) => {
    let val = props[prop];
    if (val !== undefined) {
      if (boolProps.includes(prop)) {
        if (!val) return;
        val = prop;
      }
      element[prop] = val;
    }
  });
  return element;
}

/**
 * <p>create the form code for updating a schema-conformant object</p>
 *
 * <p>The options object should take the following form:</p>
 *
 * <pre><code>
 *   {
 *     create: function,
 *     onSubmit: function,
 *     footer: string,
 *     label: function,
 *     skipDebug: boolean,
 *     disabled: boolean,
 *     inputHandler: function,
 *   }
 * </code></pre>
 *
 * <p>TODO: write the rest of the docs here</p>
 *
 * @name html.createFormHTML
 * @param {schema} schema - A schema definition
 * @param {object} object - A schema-conformant definition
 * @param {object} options - See above.
 * @returns {String} an HTML form for working with this schema'd object
 */
export function createFormHTML(schema, object, options = {}) {
  options.action ??= ".";
  options.method ??= "POST";
  return createFormTree(schema, object, { create, ...options }).outerHTML;
}

/**
 * For when you need table content, not a form. Note that nesting
 * is not preserved using this call because you don't nest tables.
 */
export function createTableHTML(schema, object, options = {}) {
  return createTableTree(schema, object, { create, ...options }).outerHTML;
}

/**
 * For when you need table row content only.
 */
export function createTableRowHTML(schema, object, options = {}) {
  return createTableTreeRows(schema, object, { create, ...options })
    .map((tr) => tr.outerHTML)
    .join(`\n`);
}
