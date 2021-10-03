export const TYPE_DEFAULTS = {
  boolean: false,
  number: 0,
  string: ``,
};

// A lookup table of equality evaluators for the various data types.
export const TYPES = {
  boolean: (v, strict = true) => {
    const trueBool = v === false || v === true;
    if (trueBool) return true;
    if (strict) return false;

    // JS recognizes numerical equivalence
    if (typeof v === `number`) {
      return v === 0 || v === 1;
    }

    // However, string equivalence is something we need to ensure manually.
    if (typeof v === `string` || v instanceof String) {
      v = v.toLocaleLowerCase();
      return v === `true` || v === `false`;
    }

    return false;
  },

  number: (v, strict = true) => {
    const trueNum = typeof v === `number`;
    if (trueNum) return true;
    return strict ? false : parseFloat(v) == v; // note: this includes safe bigint values
  },

  string: (v, strict = true) => {
    const tov = typeof v;
    if (tov === "string") return true;
    if (strict) return false;
    // other primitives can always be turned into a string, as can String objects.
    return tov === `number` || tov === `boolean` || v instanceof String;
  },

  symbol: (v) => {
    // the key property of symbols is that they are incoercible singletons:
    return typeof v === `symbol`;
  },

  array: (v, strict = true) => {
    if (v instanceof Array) return true;
    if (strict) return false;
    return TYPES.iterable(v);
  },

  iterable: (obj) => {
    // Note: String objects do not count, even though they're iterable.
    if (typeof obj === `string` || obj instanceof String) return false;
    return obj.__proto__.constructor.prototype[Symbol.iterator];
  },

  object: (v) => v !== null && typeof v === "object" && !TYPES.iterable(v),

  // effectively a (coercible) indexOf check
  mixed: (v, strict, options) => {
    return options.findIndex((e) => (strict ? v === e : v == e)) > -1;
  },
};
