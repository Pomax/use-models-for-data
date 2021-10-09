import { conforms } from "../../lib/schema/conforms.js";

describe(`...`, () => {
  // FIXME: TODO: implement a lot more tests here

  test(`empty conformance check`, () => {
    const schema = {};
    const object = {};

    const strict = true;
    const allowIncomplete = false;
    const result = conforms(schema, object, strict, allowIncomplete);
    expect(result.passed).toBe(true);
  });

  test(`list test`, () => {
    let schema = {
      somefield: {
        __meta: {
          array: true,
        },
        type: `string`,
        choices: [`a`, `b`, `c`],
      },
    };

    const obj = {
      somefield: ["a", "b", "c"],
    };

    const strict = true;
    const allowIncomplete = false;
    const result = conforms(schema, obj, strict, allowIncomplete);
    console.log(result);
    expect(result.passed).toBe(true);
  });

  test(`list test, missing __meta.array`, () => {
    let schema = {
      somefield: {
        __meta: {},
        type: `string`,
        choices: [`a`, `b`, `c`],
      },
    };

    const obj = {
      somefield: ["a", "b", "c"],
    };

    const strict = true;
    const allowIncomplete = false;
    const result = conforms(schema, obj, strict, allowIncomplete);
    expect(result.errors).toStrictEqual([
      `somefield: arrays are not allowed as unmarked field values (add __meta.array:true).`,
    ]);
  });

  test(`list test, outside of choices`, () => {
    let schema = {
      somefield: {
        __meta: {
          array: true,
        },
        type: `string`,
        choices: [`a`, `b`, `c`],
      },
    };

    const obj = {
      somefield: ["a", "b", "c", "d"],
    };

    const strict = true;
    const allowIncomplete = false;
    const result = conforms(schema, obj, strict, allowIncomplete);
    expect(result.errors).toStrictEqual([
      `somefield[].3: value [d] is not in the list of permitted values [a,b,c]`,
    ]);
  });
});
