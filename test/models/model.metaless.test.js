import { Model, Models } from "../../index.js";
const { fields } = Models;

class TestModel extends Model {
  string = fields.string();
  secondary = fields.model(new Secondary());
}

class Secondary extends Model {
  label = fields.string();
}

describe(`Testing User model with store backing`, () => {
  beforeAll(() => {
    Models.register(TestModel);
    // console.log(TestModel.schema);
  });

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

  /*
    TODO: also make sure this works with a store backing.

          When saving, we should be able to just determine
          a schema for the top-level model and then we're going
          to need the user to provide a filename because there's
          no way to guess which field to use as record name.
  */
});
