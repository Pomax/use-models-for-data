import { TYPES } from "./types.js";
const { array, iterable, object } = TYPES;
const definedOnly = ([_k, v]) => v !== undefined;

/**
 * Standard, but unfortunately not built-in, equality checking for arbitrarily
 * data, including nested objects. As JS can do coerced equality checking, and
 * because in rare cases that's essential, the third argument is a "strict"
 * flag that defaults to true, but can be explicitly set to "false" to perform
 * coercive equality checking.
 */
export function equals(v1, v2, strict = true) {
  // primitive and alias equality?
  if (strict ? v1 === v2 : v1 == v2) return true;

  // complex equality?
  if (array(v1) && array(v2)) return arrayEquals(v1, v2, strict);
  if (iterable(v1) && iterable(v2)) return iterableEquals(v1, v2, strict);
  if (object(v1) && object(v2)) return objectEquals(v1, v2, strict);

  // no equality.
  return false;
}

/**
 * Arrays are considered equal if they have the same length, contain
 * the same elements, and those elements are in the same order.
 */
function arrayEquals(v1, v2, strict = true) {
  if (v1.length !== v2.length) return false;
  return v1.every((e, i) => equals(e, v2[i], strict));
}

/**
 * Iterables are objects like String, Array, TypedArray, Map and Set.
 * Of these, only Array is considered primitive, and all the others
 * require casting to array in order to evaluate their equality.
 *
 * (But note that we want to deal with String objects as string literals)
 */
function iterableEquals(v1, v2, strict = true) {
  if (strict && v1.__proto__.constructor !== v2.__proto__.constructor) {
    return false;
  }
  v1 = Array.from(v1);
  v2 = Array.from(v2);
  return arrayEquals(v1, v2, strict);
}

/**
 * Objects are considered the same if they contain the same unordered
 * set of enumerable keys (note: read that again, because "enumerable"
 * is not the same as "actually defined"), and each key points to the
 * same value (as determined through recursion)
 */
function objectEquals(v1, v2, strict = true) {
  // Note that properties that are explicitly assigned as `undefined`
  // are functionality identical in a JS engine to nonexistent properties.
  const m1 = Object.entries(v1).filter(definedOnly);
  const m2 = Object.entries(v2).filter(definedOnly);

  // Key ordering is irrelevant, but let's not waste more time
  // on sorting if we  know these are not equal based on length:
  if (m1.length !== m2.length) return false;
  m1.sort();
  m2.sort();

  return m1.every((e, i) => arrayEquals(e, m2[i], strict));
}
