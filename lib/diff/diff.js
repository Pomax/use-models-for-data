/**
 * @namespace diff
 */

import crc16 from "./crc/crc16.js";
import { equals } from "../equals/equals.js";
import { findSubtree } from "./object-recurse.js";

/**
 * Remove an element from an array.
 * @param {*} arr
 * @param {*} element
 * @returns The array with the element removed
 * @ignore
 */
function remove(arr, element) {
  const i = arr.indexOf(element);
  if (i > -1) arr.splice(i, 1);
  return arr;
}

/**
 * Determine if some value is a JS primitive
 * @param {*} value
 * @returns {boolean} true if <code>value</code> is a JS primitive, otherwise false
 * @ignore
 */
function primitive(v) {
  if (v === true || v === false) return true;
  if (typeof v === `number`) return true;
  if (typeof v === `string`) return true;
  if (v instanceof Array) return true;
}

/**
 * Hash a string for levenstein distance.
 * @param {*} data
 * @returns {String} 16 bit CRC hex string
 * @ignore
 */
function stringHash(data) {
  return crc16(data).toString(16);
}

/**
 * Convert any data to "some kind of hash value".
 * @param {*} data
 * @returns {String} a hash string
 * @ignore
 */
function valueHash(data) {
  if (typeof data === `boolean`) data = data.toString();
  else if (typeof data === `number`) data = data.toString();

  if (typeof data === `string`) return stringHash(data);

  if (data instanceof Array)
    return stringHash(data.map((v) => valueHash(v)).join(`\n`));

  return stringHash(
    Object.entries(data)
      .map(([key, value]) => `${key}${valueHash(value)}`)
      .join(`\n`)
  );
}

/**
 * Uppercase function for use in regular expression replacements.
 *
 * @param {*} _ - the full capture group, which we don't care about
 * @param {*} letter - the initial letter in a word
 * @returns {String} The initial letter, uppercased
 * @ignore
 */
function ucre(_, letter) {
  return letter.toUpperCase();
}

/**
 * Convert namespaces to something that'll work as part of a JS method name.
 *
 * @param {String} str - the input string to convert to camelCase
 * @param {String} [namespace] - Optional namespace prefix to resolve into the full name
 * @returns {String} The camelCase representation of the input
 * @ignore
 */
function camelCase(str = ``, namespace) {
  if (namespace) str = `${namespace}.${str}`;
  return str.replace(/^\s*(\w)/, ucre).replace(/[_.]+(\w)/g, ucre);
}

/**
 * <p>Create a diff between two JS objects, structured as a sequence of
 * operational transforms, consisting of:</p>
 *
 * <ul>
 *   <li><code>add</code></li>
 *   <li><code>update</code></li>
 *   <li><code>move</code></li>
 *   <li><code>rename</code></li>
 * </ul>
 *
 * @name diff.createDiff
 * @function
 * @param {Object} object1 - The original object
 * @param {Object} object2 - The target object
 * @returns {operations} An array of operational transforms that turns the original object into the target object.
 * @see applyDiff
 */
export function createDiff(object1, object2) {
  if (equals(object1, object2)) return [];

  const operations = diffUntilStable(object1, object2);

  // check for leftover subtree relocations:

  const removals = [];
  const additions = [];

  operations.forEach((op) => {
    if (op.stable === false) {
      if (op.type === `remove`) removals.push(op);
      if (op.type === `add`) additions.push(op);
    }
  });

  removals.forEach((removal) => {
    // are there any additions we can match this remove to?
    if (additions.length === 0) return;

    // There are: see if any additions that involve a value
    // that is (or contains something) very similar to the
    // value that this removal was flagged for. If so, that's
    // potentially a single relocation, rather than two
    // separate add and remove actions.
    const matches = additions.map((addition) => {
      return {
        ...findSubtree(removal.value, addition.value),
        addition,
      };
    });

    const best = matches[0];
    const { match } = best;
    if (match === 0) {
      remove(operations, removal);
      remove(operations, best.addition);
      const newKey = `${best.addition.key}${best.node[0]}`;
      operations.push({
        type: `move`,
        oldKey: removal.key,
        newKey,
        fn: `move${camelCase(removal.key)}To${camelCase(newKey)}`,
        rollback: `rollback${camelCase(removal.key)}To${camelCase(newKey)}`,
      });
    } else {
      const candidate = best?.node?.[0];
      if (candidate) {
        // FIXME: what do we want to do in this case?
        //
        // console.log(
        //   `Was ${removal.key} moved to ${best.addition.key}${candidate}? (ld=${match})`
        // );
      }
    }
  });

  return operations;
}

/**
 * Perform breadth-first diff resolution: we first want to make sure all 1st level keys work out.
 * Then we can sort out all 2nd level keys, and so on until we run out of objects to iterate into.
 *
 * @ignore
 */
function diffUntilStable(object1, object2, key = ``) {
  const orderedOperations = [];

  function fullKey(k) {
    if (k === undefined) return key;
    return `${key ? `${key}.` : ``}${k}`;
  }

  if (object1 === undefined && object2 !== undefined) {
    console.og(`object1 undeffed for ${key}`);
    return [
      {
        type: `add`,
        key: fullKey(),
        value: object2,
        fn: `add${camelCase(fullKey())}`,
      },
    ];
  }

  if (object1 !== undefined && object2 === undefined) {
    console.og(`object2 undeffed for ${key}`);
    return [
      {
        type: `remove`,
        key: fullKey(),
        value: object1,
        fn: `remove${camelCase(fullKey())}`,
      },
    ];
  }

  if (equals(object1, object2)) return [];

  if (primitive(object1) || primitive(object2)) {
    return [
      {
        type: `update`,
        key: fullKey(),
        oldValue: object1,
        newValue: object2,
        fn: `update${camelCase(key)}`,
        rollback: `rollback${camelCase(key)}`,
      },
    ];
  }

  const e1 = Object.entries(object1).sort();
  const e2 = Object.entries(object2).sort();

  const keys = Array.from(
    new Set([...e1.map(([k, _]) => k), ...e2.map(([k, _]) => k)])
  );

  e1.forEach(([k, v]) => {
    if (object2[k] === undefined) {
      orderedOperations.push({
        type: `remove`,
        key: fullKey(k),
        stable: false, // This might have been moved to somewhere else in the tree, we'll be able to check that later.
        value: v,
        valueHash: valueHash(v), // yeah we could compute this bottom up but let's be fair: "makemigrations" is not your bottleneck. Ever.
        fn: `remove${camelCase(fullKey(k))}`,
        rollback: `rollback${camelCase(fullKey(k))}`,
      });
    }
    remove(keys, k);
  });

  keys.forEach((k) => {
    const value = object2[k];

    const op = {
      type: `add`,
      key: fullKey(k),
      value: value,
      fn: `add${camelCase(k, key)}`,
      rollback: `rollback${camelCase(k, key)}`,
    };
    if (value !== undefined && !primitive(value)) {
      op.stable = false; // this might be a relocation from somewhere else in the tree, we'll be able to check that later.
      op.valueHash = valueHash(value);
    }
    orderedOperations.push(op);
  });

  // find add/remove pairs with identical valueHashes. Note that this is not efficient, and it doesn't have to be.
  const removes = orderedOperations.filter((v) => v.type === `remove`);
  const pairs = removes
    .map((v) => ({
      remove: v,
      add: orderedOperations.find(
        (w) => w.type === `add` && w.valueHash === v.valueHash
      ),
    }))
    .filter((v) => !!v.add);

  // anything obvious we can unify?
  pairs.forEach((pair) => {
    const i1 = orderedOperations.indexOf(pair.add);
    const i2 = orderedOperations.indexOf(pair.remove);
    const rename = {
      type: `rename`,
      oldKey: pair.remove.key,
      newKey: pair.add.key,
      fn: `rename${camelCase(pair.remove.key)}${camelCase(pair.add.key)}`,
      rollback: `rollback${camelCase(pair.remove.key)}${camelCase(
        pair.add.key
      )}`,
    };
    orderedOperations.splice(i1 < i2 ? i1 : i2, 0, rename);
    remove(orderedOperations, pair.add);
    remove(orderedOperations, pair.remove);
  });

  // recurse
  e1.forEach(([k, v]) => {
    const redirect = orderedOperations.find((v) => v.from === k);
    if (redirect) k = redirect.to;
    if (object2[k] !== undefined) {
      const target = object2[k];
      orderedOperations.push(...diffUntilStable(v, target, fullKey(k)));
    }
  });

  return orderedOperations;
}

/**
 * <p>Apply a diff to a JS object, where the diff is structured as a
 * sequence of operational transforms, consisting of:</p>
 *
 * <ul>
 *   <li><code>add</code></li>
 *   <li><code>update</code></li>
 *   <li><code>move</code></li>
 *   <li><code>rename</code></li>
 * </ul>
 *
 * <p>Note that in order to control the diff application behaviour, a
 * change handler function object can be passed in. See {@link diff.makeChangeHandler}
 * for details on this function object</p>
 *
 * <p>When called without an explicit handler, a default change handler
 * is used that performs "straight" diffing, without ignoring keys
 * or transforming values during application. This default change
 * handler is created by the {@link diff.makeChangeHandler} method.</p>
 *
 * <p>However, in order to perform schema diffing, where the diff is
 * computed between two schema objects, but then needs to be applied
 * to plain data objects, this functionality allows the same diffing
 * process to run, turning the sequence of operational transforms
 * for schema objects into a sequence of concrete operational
 * transforms for plain data objects.</p>
 *
 * <p>See {@link schema.makeSchemaChangeHandler} for how this type of
 * indirect diffing is achieved.</p>
 *
 * @name diff.applyDiff
 * @function
 * @param {diffOperation[]} changeOperations - the sequence of operational transforms to apply
 * @param {Object} object - the JS object to transform
 * @param {changeHandler} [changeHandler] - a function object that can be used to fine-control the diff application process.
 * @returns {Object} The result of applying the set of operational transforms to the provided object.
 */
export function applyDiff(
  changeOperations,
  object,
  changeHandler = makeChangeHandler()
) {
  changeOperations.forEach((operation) => {
    changeHandler(object, operation);
    if (changeHandler[operation.fn] !== undefined) {
      changeHandler[operation.fn](object, operation);
    }
  });
  return object;
}

/**
 * <p>Create a change handler function object that can be used during
 * diff application to control how the diff gets applied. This object
 * takes three functions as arguments that each control a different
 * aspect of the application process:</p>
 *
 * <pre><code>
 *   ignoreKey = function(keypath, type) {
 *     // returns false if the diff application should skip the
 *     // indicated type of transform for properties with the
 *     // indicated keypath, using a dot separated value.
 *   }
 *
 *   filterKeyString = function(keypath) {
 *     // returns a (possibly) rewritten keypath, or
 *     // false if the keypath should be ignored entirely
 *     // for all possible operational transform types.
 *   }
 *
 *   transformValue = function(keypath, value) {
 *     // returns a (possibly) new value for the given keypath.
 *   }
 * </code></pre>
 *
 * Any or all three functions may be omitted, in which case the
 * following defaults are used:
 *
 * <pre><code>
 *   ignoreKey = function(keypath, type) {
 *     return false;
 *   }
 *
 *   filterKeyString = function(keypath) {
 *     return keypath;
 *   }
 *
 *   transformValue = function(keypath, value) {
 *     return value;
 *   }
 * </code></pre>
 *
 * @name diff.makeChangeHandler
 * @function
 * @param {function} ignoreKey - controls whether to apply diffs for specific key/type tuples.
 * @param {function} filterKeyString - controls keypath mappings during diff application.
 * @param {function} transformValue - controls value mappings during diff application.
 * @returns {function} a change handling function object.
 */
export function makeChangeHandler(
  ignoreKey = (key, type) => false,
  filterKeyString = (key) => key,
  transformValue = (key, value) => value
) {
  const changeHandler = function changeHandler(object, operation) {
    const { type, key, value, fn, rollback } = operation;

    let filteredKey;
    if (key) {
      filteredKey = filterKeyString(key);
      if (!filteredKey) return;
    }

    if (type === `add` && !ignoreKey(key, type)) {
      const { level, propName } = getObjectLevel(object, filteredKey);
      if (fn) changeHandler[fn]({ level, propName }, operation);
      level[propName] = transformValue(key, value);
    } else if (type === `remove` && !ignoreKey(key, type)) {
      const { level, propName } = getObjectLevel(object, filteredKey);
      if (fn) changeHandler[fn]({ level, propName }, operation); // call custom handler first, then delete
      delete level[propName];
    } else if (type === `update` && !ignoreKey(key, type)) {
      const { level, propName } = getObjectLevel(object, filteredKey);
      const { oldValue, newValue } = operation;
      if (fn) changeHandler[fn]({ level, propName }, operation); // call custom handler first, then update
      level[propName] = transformValue(key, newValue);
    } else if (type === `move` || type === `rename`) {
      const { oldKey, newKey } = operation;
      const oldPosition = getObjectLevel(object, filterKeyString(oldKey));
      const newPosition = getObjectLevel(object, filterKeyString(newKey));
      if (fn) changeHandler[fn]({ oldPosition, newPosition }, operation); // call custom handler first, then move
      newPosition.level[newPosition.propName] =
        oldPosition.level[oldPosition.propName];
      delete oldPosition.level[oldPosition.propName];
    }
  };

  changeHandler.filterKeyString = filterKeyString;
  changeHandler.ignoreKey = ignoreKey;
  changeHandler.getObjectLevel = getObjectLevel;
  changeHandler.transformValue = transformValue;

  return changeHandler;
}

// Generic "get an object subtree by key string".
function getObjectLevel(object, key) {
  const nesting = key.split(`.`);
  const propName = nesting.pop();
  let level = object;
  while (nesting.length > 0) {
    let term = nesting.shift();
    if (level[term] === undefined) level[term] = {};
    level = level[term];
  }
  return { level: level ?? object, propName };
}

/**
 * Reverse the sequence of operational transforms, such that
 * if for a tuple <code>(object1, object2)</code> the input
 * operations transform object1 into object2, the reversed
 * sequence turns object2 into object1.
 *
 * This function is idempotent, such that:
 *
 * <pre><code>
 *   operations = reverseDiff(reverseDiff(operations))
 * </code></pre>
 *
 * @name diff.reverseDiff
 * @function
 * @param {operation[]} operations - A sequence of operational transforms.
 * @returns {operation[]} A list of operational transforms that rolls back the list of input operations.
 */
export function reverseDiff(operations) {
  operations.reverse();
  operations.forEach(function reverseOperation(operation) {
    const { type, fn, rollback } = operation;
    operation.rollback = fn;
    operation.fn = rollback;

    if (type === `add`) {
      operation.type = `remove`;
    } else if (type === `remove`) {
      operation.type = `add`;
    } else if (type === `update`) {
      const { oldValue, newValue } = operation;
      operation.oldValue = newValue;
      operation.newValue = oldValue;
    } else if (type === `move` || type === `rename`) {
      const { oldKey, newKey } = operation;
      operation.oldKey = newKey;
      operation.newKey = oldKey;
    }
  });
}

// aliases
export {
  /**
   * An alias for {@link diff.createDiff }
   * @name diff.create
   * @function
   * @param {Object} object1 - The original object
   * @param {Object} object2 - The target object
   * @returns {operations} An array of operational transforms that turns the original object into the target object.
   * @see diff.createDiff
   */
  createDiff as create,
  /**
   * Alias for {@link diff.applyDiff}
   * @name diff.apply
   * @function
   * @param {diffOperation[]} changeOperations - the sequence of operational transforms to apply
   * @param {Object} object - the JS object to transform
   * @param {changeHandler} [changeHandler] - a function object that can be used to fine-control the diff application process.
   * @returns {Object} The result of applying the set of operational transforms to the provided object.
   * @see diff.applyDiff
   */
  applyDiff as apply,
  /**
   * Alias for {@link diff.reverseDiff}
   * @name diff.reverse
   * @function
   * @param {operation[]} A sequence of operational transforms.
   * @returns {operation[]} A list of operational transforms that rolls back the list of input operations.
   * @see diff.reverseDiff
   */
  reverseDiff as reverse,
};
