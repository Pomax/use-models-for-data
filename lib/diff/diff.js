import crc16 from "./crc/crc16.js";
import { equals } from "../equals/equals.js";
import { findSubtree } from "./object-recurse.js";

function remove(arr, element) {
  const i = arr.indexOf(element);
  if (i > -1) arr.splice(i, 1);
  return arr;
}

// ...
function primitive(v) {
  if (v === true || v === false) return true;
  if (typeof v === `number`) return true;
  if (typeof v === `string`) return true;
  if (v instanceof Array) return true;
}

// ...
function stringHash(data) {
  return crc16(data).toString(16);
}

// ...
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

// uppercase regular expression replacement function
function ucre(_, letter) {
  return letter.toUpperCase();
}

// convert namespaces to something that'll work as part of a JS method name.
function camelCase(str = ``, namespace) {
  if (namespace) str = `${namespace}.${str}`;
  return str.replace(/^\s*(\w)/, ucre).replace(/[_.]+(\w)/g, ucre);
}

/**
 * The most important function.
 *
 * @param {*} object1
 * @param {*} object2
 * @returns
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

// Perform breadth-first diff resolution: we first want to make sure all 1st level keys work out.
// Then we can sort out all 2nd level keys, and so on until we run out of objects to iterate into.
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
 * The second most important function
 * @param {*} changeOperations
 * @param {*} object
 * @param {*} changeHandler (optional)
 * @returns
 */
export function applyDiff(
  changeOperations,
  object,
  changeHandler = makeDefaultChangeHandler()
) {
  changeOperations.forEach((operation) => {
    changeHandler(object, operation);
    if (changeHandler[operation.fn] !== undefined) {
      changeHandler[operation.fn](object, operation);
    }
  });
  return object;
}

function makeDefaultChangeHandler() {
  return makeChangeHandler();
}

/**
 * Not all diffs should be applied equally, especially when
 * it's schema'd diff. While the default handler works as
 * your standard differ, things like basic-js-schema.migrate
 * can build their own change handler using this function to
 * ensure that diffs based on schema changes get applied to
 * schema-conformant *objects* instead.
 *
 * @param {*} ignoreKey
 * @param {*} filterKeyString
 * @returns
 */
export function makeChangeHandler(
  ignoreKey = (key, type) => false,
  filterKeyString = (key) => key,
  transformValue = (value) => value
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
 * Reverse an operational diff sequence, including swapping
 * adds for removals, removals for adds, switching relocation
 * order, and swapping the fn/rollback bindings.
 *
 * Note that this acts just like Array.prototype.reverse,
 * reversing the list itself rather than creating a derivative
 * list, as well as updating all the operation objects.
 *
 * To restore the original list of operations, run this function
 * a second time on the same data:
 *
 *   operations = reverseDiff(reverseDiff(operations))
 *
 * @param {*} operations
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
export { createDiff as create, applyDiff as apply, reverseDiff as reverse };
