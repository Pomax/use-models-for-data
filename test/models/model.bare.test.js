import { Model, Models } from "use-models-for-data";
const { fields } = Models;

class TestModel extends Model {
  string = fields.string();
  secondary = fields.model(Secondary);
}

class Secondary extends Model {
  label = fields.string();
}

describe(`Testing models functionality for models without __meta`, () => {
  // ╔══════════════════════╗
  // ║ THE TESTS START HERE ║
  // ╚══════════════════════╝

  test(`Models without __meta still work`, () => {
    let instance;

    expect(() => {
      instance = TestModel.create();
    }).not.toThrow();

    instance.string = "lol";
    instance.secondary.label = "lol";
    expect(instance.valueOf()).toStrictEqual({
      string: "lol",
      secondary: {
        label: "lol",
      },
    });
  });
});
