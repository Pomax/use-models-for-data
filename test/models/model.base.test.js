import { Model, Models } from "../../index.js";
const { fields } = Models;

class TestModel extends Model {
  __meta = {
    name: `test`,
  };
  oneOrMore = fields.string({ array: true });
  secondary = fields.model({ model: new Secondary(), array: true });
}

class Secondary extends Model {
  __meta = {
    name: `nested`,
  };

  label = fields.string();
}

describe(`Testing User model with store backing`, () => {
  beforeAll(() => {
    Models.register(TestModel);
    // console.log(TestModel.schema);
  });

  test(`One-or-more test (__meta.array: true)`, () => {
    let instance;
    try {
      instance = TestModel.create();
    } catch (err) {
      console.log(err);
    }

    expect(instance).toBeDefined();
    expect(() => (instance.oneOrMore = "a")).toThrow(
      `oneOrMore could not be assigned value [a].`
    );

    instance.oneOrMore = [1];
    expect(instance.oneOrMore).toStrictEqual(["1"]);

    const secondary = Secondary.create({ label: `test` });
    expect(() => {
      instance.secondary = secondary;
    }).toThrow(`Assignment must be an array.`);

    expect(() => {
      instance.secondary = [secondary];
    }).not.toThrow();

    expect(instance.secondary.length).toBe(1);
    expect(instance.secondary[0].label).toBe(secondary.label);
  });
});
