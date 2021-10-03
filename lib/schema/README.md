# A basic JS schema

This is basic schema library for JS object, allowing one to write a schema that JS objects need to conform to, with functions to validate an object to a schema (either strict, or with coercion allowed), as well as building forms (in plain HTML as well as arbitrary frameworks like (P)React) to modify objects in a schema-compliant fashion.

A schema has the following form:

```js
{
    __meta: [metadata],
    property1: [property-schema],
    property2: [property-schema],
    ...
}
```

## metadata

The `metadata` definition is an object of the form:

```js
{
    name: [string],
    version: [integer],
    required: [boolean],
    configurable: [boolean],
    debug: [boolean],
    validate_as: [validator name string],
    schema: [relative path string],
}
```
The top-level `__meta` property _must_ exist, and _must_ specify the `name` and `version` values. Anywhere else the `__meta` property, and any properties in it, are optional.

Note that custom properties are perfectly allowed inside the __meta object, because it's a convenient place to house application-specific metadata.

### metadata properties

If **`required`** is true, validation/conformance will fail if this field is missing from an instance object.

If **`configurable`** is false, forms that are generated based on this schema will not include this property.

If **`debug`** is true, the form building functions will omit this property from the form, unless the build function's options includes a `skipDebug: false` flag.

If **`schema`** exists, there should be no keys other than `__meta` for this property. The shape for this property's subtree is instead defined in a separate schema file.


>> If **`validate_as`** is specified, more specific validation is performed on a field.
>> NOTE THAT THIS FUNCTIONALITY HAS NOT YET BEEN IMPLEMENTED


## property schema

The `property-schema` for properties take several forms. All property schema are of the form:

```js
{
    __meta: [metadata]
}
```

but depending on the property type modelled, the rest of the property schema differs.

### primitives

For primitive values, the rest of the schema has the following form:

```js
{
    type: [boolean|number|string],
    default: [type-appropriate default value]
}
```

### arrays

For properties that can be "one of ..." (i.e. an array of values) a `choices` list is used rather than a `type`:

```js
{
    choices: [array of possible values],
    default: [one of the possible value]
}
```

### objects

Properties that represent objects specify a `shape`, which takes the form of an embedded schema:

```js
{
    shape: [schema]
}
```
For embedded schema, the `__meta.name` and `__meta.id` values are not required.

## Validation

Validating an object for schema conformance is a simple matter of running the validation function:

```js
const result = validate(schema, object);

if(result.passed) {
  if (result.warnings) {
    console.log(`Validation passed, with warnings:`, result.warnings);
  } else {
    console.log(`Validation passed`);
  }
} else {
  console.error(`Validation failed:`, result.error);
}
```

where the validation result is an object of the following type:
```js
{
  passed:   [boolean],
  warnings: [array of warning strings],
  errors:   [array of error strings],
}
```

Additionally, you can create a dedicated validator for a schema, so you don't need to keep a reference to the schema around all the time:

```js
const validate = createValidator(schema1);

// ...

function validateAll(objects, validator) {
  return objects.every(o => validator(o).passed);
}

// ...

validateAll(objects, validate);
```

## Form building

In order to work with schema'd objects, the code comes with dedicated HTML and (P)React form building code:

### ◆ HTML snippets

There are three functions that can be used to generate HTML snippets:

#### createFormHTML(schema, object)

This creates a full `<form>...<form>` snippet for working with your object in a schema-conformant way.

#### createTableHTML(schema, object)

This creates a `<table>...<table>` snippet for working with your object in a schema-conformant way, but presented in tabular form.

#### createTableRowHTML(schema, object)

If you already have `<table>...<table>` code and you simply want to "slot in" the rows for working with your object in a schema-conformant way, you want this function.

### ◆ (P)React code

There are (P)React equivalents for all three above functions:

#### createFormTree(schema, object, options = {})

This creates a full `<form>...<form>` component tree for working with your object in a schema-conformant way.

An `options.onSubmit` can be specified, which will be used as submit handler for the form.

An `options.label` function taking a single string argument can be specified, which will be used to convert object key names to useful labels (e.g. replacing `snake_case` with `Sentence case`).

#### createTableTree(schema, object, options = {})

This creates a `<table>...<table>` component for working with your object in a schema-conformant way, but presented in tabular form.

An `options.label` function taking a single string argument can be specified, which will be used to convert object key names to useful labels (e.g. replacing `snake_case` with `Sentence case`).

#### createTableTreeRows(schema, object, options = {})

If you already have table component and you simply want to template in the rows for working with your object in a schema-conformant way, you want this function.

An `options.label` function taking a single string argument can be specified, which will be used to convert object key names to useful labels (e.g. replacing `snake_case` with `Sentence case`).

### ◆　"Anything", by specfiying a `create` function

Technically the `createFormTree`, `createTableTree`, and `createTableTreeRows` functions can be made to generate anything you want by specifying your own `create` function as part of the options. In fact, that's how the HTML snippets are generated:

```js
function create(tag, props) {
  const element = document.createElement(tag);
  if (props.children) {
    props.children.forEach((c) => element.appendChild(c));
  }
  htmlProps.forEach((prop) => {
    if (props[prop] !== undefined) {
      element[prop] = props[prop];
    }
  });
  return element;
}

function createFormHTML(schema, object, options = {}) {
  return createFormTree(schema, object, { create, ...options }).outerHTML;
}

function createTableHTML(schema, object, options = {}) {
  return createTableTree(schema, object, { create, ...options }).outerHTML;
}

function createTableRowHTML(schema, object, options = {}) {
  return createTableTreeRows(schema, object, { create, ...options })
    .map((tr) => tr.outerHTML)
    .join(`\n`);
}
```

## Schema examples

Let's look at a simple user schema:

```js
{
  __meta: {
    name: "users",
    id: "v1",
    description: "A user data schema"
  },
  name: {
    __meta: {
      required: true,
      configurable: false
    },
    type: "string"
  },
  password: {
    __meta: {
      required: true,
      configurable: false
    },
    type: "string"
  },
  profile: {
    __meta: {
      description: "This user's profile on the website",
      required: true
    },
    shape: {
      avatar: {
        __meta: {
          description: "A picture that identifies this user",
          validate_as: "filename"
        },
        type: "string"
      },
      bio: {
        __meta: {
          description: "User bio"
        },
        type: "string"
      },
      games_played: {
        __meta: {
          description: "How many games has this used played?",
          configurable: false
        },
        type: "number",
        default: 0
      }
    }
  },
  preferences: {
    __meta: {
      description: "Application preferences for this user"
    },
    shape: {
      defaultConfig: {
        __meta: {
          description: "The user's preferred default config",
          schema: "./config.json"
        }
      }
    }
  }
}
```

This relies on another schema stored in `config.json`, which houses the JSON representation of the following JS schema:

```js
{
  __meta: {
    name: "config",
    id: "v1",
    description: "Mahjong game configuration"
  },
  auto_start_on_join: {
    __meta: {
      description: "Immediately start a game when possible",
    },
    type: "boolean",
    default: true
  },
  force_open_play: {
    __meta: {
      description: "Force all players to play face-up.",
    },
    type: "boolean",
    default: false
  },
  game_mode: {
    __meta: {
      description: "What kind of game does this user prefer?",
    },
    choices: ["beginner", "normal", "expert"],
    default: "normal"
  },
  player_count: {
    __meta: {
      description: "The number of players in a game",
    },
    choices: [1, 2, 3, 4, 5, 6, 7, 8],
    default: 4
  },
  track_discards: {
    __meta: {
      description: "Track which discards were from which player",
    },
    type: "boolean",
    default: true
  },
  max_timeout: {
    __meta: {
      description: "The longest timeout that may be used in a game",
      configurable: false
    },
    type: "number",
    default: 2147483647
  }
}

```