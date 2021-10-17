/**
 * @namespace utils
 */

/**
 * This is a function for use in <code>JSON.stringify(input, sortedObjectKeys, [number])</code>
 * that ensures that object keys are always sorted in alphanumerical order.
 *
 * @name utils.sortedObjectKeys
 * @function
 * @params {*} _ - an irrelevant value, I have no idea why this value is even passed into a replacer function.
 * @params {*} data - The data at the current depth/iteration in the JSON.stringify pass.
 * @returns The original data if not an object, otherwise an object with its keys sorted alphanumerically.
 */
export function sortedObjectKeys(_, data) {
  // Ignore primitives.
  if (data === null) return null;
  if (typeof data !== "object") return data;

  // Also ignore iterables, which are type "object" but should not be sorted.
  if (data.__proto__[Symbol.iterator]) return data;

  // Then sort the object keys and yield a new object with that
  // ordering enforced by key insertion.
  return Object.fromEntries(Object.entries(data).sort());
}

/**
 * Deep-copy an object (not used atm, but it might as well be here).
 * @ignore
 */
export function copyFromSource(source, constructed = false) {
  const target = {};
  setDataFrom(source, target, constructed);
  return target;
}

/**
 * deep-assign one object to another.
 * @ignore
 */
export function setDataFrom(source, target, constructed = true) {
  inflate(source);
  for (const [key, val] of Object.entries(source)) {
    if (val !== null && typeof val === `object`) {
      if (target[key] === undefined) {
        target[key] = constructed ? new val.__proto__.constructor() : {};
      }
      setDataFrom(val, target[key]);
    } else {
      target[key] = val;
    }
  }
}

/**
 * Inflate a pure, flat pathkey:string object to
 * a regular nested object instead. Note that if
 * an object has any sort of nesting, this function
 * will return without modifying the object.
 *
 * @name utils.inflate
 * @params {*} data - A flat JS object
 * @ignore
 */
export function inflate(data) {
  const entries = Object.entries(data);

  // As a short circuit, we don't inflate anything that isn't
  // a pure, flat object.
  if (entries.some(([_, v]) => typeof v === `object`)) {
    return data;
  }

  entries.forEach(([key, value]) => {
    const path = key.split(`.`);
    delete data[key];
    let level = data;
    while (path.length > 1) {
      const term = path.shift();
      if (!level[term]) level[term] = {};
      level = level[term];
    }
    level[path[0]] = value;
  });

  return data;
}
