import { conforms } from "../../lib/schema/conforms.js";

describe(`...`, () => {
  // FIXME: TODO: implement actual testing

  test(`empty conformance check`, () => {
    const schema = {};
    const object = {};

    const strict = true;
    const allowIncomplete = false;
    const result = conforms(schema, object, strict, allowIncomplete);

    expect(result.passed).toBe(true);
  });

  test(`...`, () => {
    let result;

    const schema = {
      somefield: {
        __meta: {
          required: true,
        },
        type: `string`,
      },
    };

    const strict = true;
    const allowIncomplete = false;

    result = conforms(schema, {}, strict, allowIncomplete);
    expect(result.passed).toBe(false);
    expect(result.errors).toStrictEqual([`somefield: required field missing.`]);

    result = conforms(
      schema,
      {
        somefield: `value`,
      },
      strict,
      allowIncomplete
    );
    expect(result.passed).toBe(true);

    result = conforms(
      schema,
      {
        somefield: 1,
      },
      strict,
      allowIncomplete
    );
    expect(result.passed).toBe(false);
    expect(result.errors).toStrictEqual([
      `somefield: value is not a valid string.`,
    ]);
  });
});
