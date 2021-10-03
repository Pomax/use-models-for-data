# A set of JS Schema tools

- A basic JS object schema framework geared towards "data definition" rather than comprehensive data validation (akin to table definitions in a database).
- Utility functions for creating HTML, (P)React, and "arbitrary tech stack" forms for working with schema'd objects.
- A JS differ that allows for three-way diffs (e.g. applying schema1 → schema2 transforms to _instances_ of schema1, to make them schema2-conformant).
- An `equals(o1, o2)` function that allows for both strict and coerced equality testing.

## Model API

See [the model docs](./models/README.md) for details

- `Models.create(Model, [data])`
- `Model` class + `Models.fields`

## Schema API

See [the schema docs](./schema/README.md) for details.

- `loadSchema(path)`
- `validate(schema, object, strict = true)`
- `createValidator(schema, strict = true)`
- `migrate(object, schema1, schema1)`
- `migrate(object, migration_operations)`

## Form generation API

See [the schema docs](./schema/README.md) for details.

#### HTML

- `createFormHTML(schema, object)`
- `createTableHTML(schema, object)`
- `createTableRowHTML(schema, object)`

#### (P)React + Arbitrary tech stacks

- `createFormTree(schema, object, options)`
- `createTableTree(schema, object, options)`
- `createTableTreeRows(schema, object, options)`

## Diff API

See [the diffing docs](./diff/README.md) for details.

- `create(object1, object2)` / `createDiff(object1, object2)`
- `apply(diff, object)` / `applyDiff(diff, object)`
- `makeChangeHandler(ignoreKey, filterKeyString)`

## Equals API

See [the docs for `equals()`](./equals/README.md) for details.

`equals(o1, o2, strict = true)`

# Dev / working on this code

If you want to work on this with me, drop me a line!

## Running tests

There's a whole bunch of pure-node tests that can be run by using `node whatever/it/may/be/test.js`. These tests are not so much exhaustive tests as they are representative tests that can be modified and rerun to see things still working the way they're supposed to.

## Releases

None right now, because of...

## Documentation

The docs need a lot more examples, and prose-reworking, because so far this has been a development exercise, and that's not good reading material in terms of a manual/handbook for using the "stack".

## Engagement

Hit me up via email (which I'm pretty sure Github will tell you about), or [tweetspace](https://twitter.com/TheRealPomax), or [tootspace](https://mastodon.social/users/TheRealPomax).
