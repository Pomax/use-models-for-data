# Documentation for this library

## Defining models

In order to use models for data, the library needs you to define classes that extend {@link Model}, which can then be used to wrap data.

### Model class definitions

The simplest, valid Model extension is one that declares all its fields, and nothing else:

```javascript
class YourModel extends Model {
  fieldname1 = Fields.fieldType(...);
  fieldname2 = Fields.fieldType(...);
  ...
}
```

However, it's generally a better idea to also specify a `__meta` property.

```javascript
class YourModel extends Model {
  __meta = {
    ...
  }

  fieldname1 = Fields.fieldType(...);
  fieldname2 = Fields.fieldType(...);
  ...
}
```

### Field types and options

The {@link Fields} class defines several field types that you can use to build out your models.

- `boolean(options?)`, for true/false values
- `number(options?)`, for numerical values
- `string(options?)`, for string data
- `choice(values[], options)`, for values that can only be one of a predefined list of values.
- `model(modelClass, options)`, for submodels (e.g. if it's an object in plain data, it's just another model).

Also note that arrays of values (e.g. a field called `photos` being an array of `Photo` submodels) are not a separate field type, instead these simply rely on you passing in the `array: true` property as part of the field options.

```javascript
class User extends Model {
  photos = Fields.model(Photo, { array: true });
}

class Photo extends Model {
  filename = Fields.string({ validate: ... });
  width = Fields.number(...);
  height = Fields.number(...);
  ...
}
```

The full list of options is:

- `required`: a boolean value that determines whether the field must always have a value
- `default`: a default value to use when the field has not been explicitly assigned
- `choices`: an array of possible values that this field may take
- `configurable`: a boolean value that determines whether this field may be user-updated (i.e. through form submission handling rather than in code)
- `debug`: a boolean value that regulates debug behaviour as defined in the library code.
- `validate`: a function for performing more elaborate validation than basic type validation can offer.

### Custom validation

The `validate` property takes a function that takes the to-validate value as input argument, and must fail in one of two ways if the value is invalid:

- return `false`, or
- throw an `Error` object.

The first is for "simple failure", where the validation simply fails without any details:

```javascript
legalAge = Fields.number({
  validate: (value) => value >= 18,
});
```

The second is for when more elaborate details are required.

```javascript
avatar = Fields.string({
  validate: function (value) {
    const errCode = checkBase64Image(value);
    if (errCode !== undefined) {
      throw new Error(
        `avatar was not a valid base64-encoded image (error code: ${errCode}).`
      );
    }
  },
});
```

## Constructing models

There are two ways to create model instances (three, if we include loading from a data store):

- `Model.create(Model.ALLOW_INCOMPLETE?)`, where `Model` is your model class
- `Model.from(data, Model.ALLOW_INCOMPLETE?)`, where `Model` is your model class, and `data` is a required object with one or more values to be used to bootstrap the model instance.

The `create` function builds a new model instance, whereas the `from` function builds a new model from preexisting data. Both functions can take the `ALLOW_INCOMPLETE` static symbol that is used by the library to determine whether or not incompletely model creation is allowed. If omitted, trying to create a model without specifying required fields will throw a {@link Errors.RequiredFieldsMissing} error.

Also note that in addition to plain JS objects, the `.from()` function also allows for key-pathed objects. That is, while it accepts standard objects like this:

```javascript
{
  key1: {
    subkey: {
      fieldname: value
    },
    keyfield: value
  },
  key2: {
    something: value
  },
}
```

It also allows data to be specified using a "flat" object with value paths encoded as dot-separated key paths:

```javascript
{
  "key1.subkey.fieldname": value,
  "key1.keyfield": value,
  "key2.something": value,
}
```

This is especially useful when dealing with flat data delivery mechanisms such as form submissions or flat-record storage back ends.

### Permissive `create`

```javascript
const config = Config.create(Config.ALLOW_INCOMPLETE);
```

### Strict `create`

```javascript
import { Errors } from "use-models-for-data";
const { RequiredFieldsMissing } = Errors;

try {
  const user = User.create();
} catch (e) {
  if (e instanceof RequiredFieldsMissing) {
    // this is unexpected, but a known possible failure state.
    console.error(e);
  } else if (...) {
    ...
  }
}
```

### Permissive `from`

```javascript
const user = User.from(
  {
    name: `Tester McTesting`,
  },
  User.ALLOW_INCOMPLETE
);
```

### Strict `from`

```javascript
try {
  const user = User.from({
    name: `Tester McTesting`,
  });
} else {
  // see "strict create", above.
}
```

## Using models

With your data encoded as a model instance, you can now treat it like any other plain JS object, referencing and assigning values as usual. However, assignments may throw, as <em>all assignments</em> are locked behind validation, including entire subtree assignments.

### Set/get values with automatic validation

Everything should work exactly the same as if your model was a plain object:

```javascript
import Errors from "use-models-for-data";
const { InvalidAssignment } = Errors;

class User extends Model {
  name = Fields.string({ required: true });
  password = Fields.string({ required: true, validate: ... });
}

const user = User.from({ name: ..., password: ... });

try {
  user.name = `A new name`;
  user.password = `A new password`;
} catch (e) {
  if (e instanceof InvalidAssignment) {
    console.error(e);
  } else if (...) {
    ...
  }
}
```

### Set/get subtrees with automatic validation

Even when setting entire subtrees, things should still work as expected:

```javascript
import Errors from "use-models-for-data";
const { InvalidAssignment } = Errors;

class ComplexModel extends Model {
  /*
   Some class that models {
     key1: {
       subkey: {
         fieldname: value
       },
       keyfield: value
     },
     key2: {
       something: value
     }
   }
  */
}

const instance = ComplexModel.create();

try {
  instance.key1 = {
    subkey: {
      fieldname: "test",
    },
    keyfield: 1234,
  };
} catch (e) {
  if (e instanceof InvalidAssignment) {
    console.error(e);
  } else if (...) {
    ...
  }
}
```

### Set/get with keypath names

In addition to getting and setting properties like you would for any JS object, models also support `.get(key)` and `.set(key, value)`, for getting/setting nested properties using keys with `.` delimiters:

```javascript
const complexInstance = ComplexModel.from(...);
let fieldValue = complexInstance.get(`key1.subkey.fieldname`);
fieldValue = `${fieldValue}-plus`;
complexInstance.set(`key1.subkey.fieldname`, fieldValue);
```

### Converting to formatted JSON (with defaults omitted) - `.toString()`

Any model instance can be turned into JSON (with sorted keys at all depths) by using its `.toString()` function. However, because model instances are backed by models, this JSON will not include any default values, only encoding real values. As such, the following model:

```javascript
class User extends Model {
  name = Fields.string({ required: true });
  password = Fields.string({ required: true, validate: ... });
  postCount = Fields.number({ default: 0 })
  rewards = Fields.number({ default: 0 })
  level = Fields.number({ default: 1 })
}
```

Will turn into a JSON object with only a name and password using `.toString()`:

```javascript
const user = User.create({ name: "Tester McTesting", password: "abcdef" });
user.level = 2;

console.log(user.toString());
/*
  {
    "level": 2,
    "name": "Tester McTesting",
    "password": "abcdef"
  }
*/
```

### Converting to fully qualified, plain JS object - `.valueOf()`

To generate a fully qualified object (e.g. when needing to send the model off to something that does _not_ use models for data) the `.valueOf()` function can be used to turn any model instance into a plain JS object. If you've written your code right, you should never need to use this function. But if you _do_ need it, it's there.

Using the above `User` model:

```javascript
const user = User.create({ name: "Tester McTesting", password: "abcdef" });
const unsafe = user.valueOf();
console.log(JSON.stringify(unsafe));
/*
  {
    "name": "Tester McTesting",
    "password": "abcdef",
    "postCount": 0,
    "rewards": 0,
    "level": 2
  }
*/
```

### (Partially) resetting model instances

Sometimes it's necessary to not just "set some values" but also "unset previously set values". Rather than having to write the following code:

```javascript
const user1 = User.from({ ... });

// ...

const { name, password, level } = user1;
const user2 = User.from({ name, password, level});
```

You can use the `.reset()` function, with an optional object for reassigning some (or all) fields some new data, without having to declare new variables:

```javascript
const user = User.from({ ... });

// ...

const { name, password, level } = user;
user.reset({ name, password, level});
```

## Using models for/in the browser

Models wouldn't be very useful if you could only use them server side: you can use models for data anywhere that you can use (modern) Javascript.

### Import/bundling your model definition

When writing client-side JS, all you need to do is import your classes as usually, and let your bundler (for modern JS) take care of the rest. This way your client and server will be "speaking the same models" no matter how much you update them.

### Tree mapping your model

### Forms for editing

While updating models using code makes a ton of sense server-side, when we're using a browser you probably want to offer users a way to work with models too, for instance, in order to update their preferences, edit a post, etc. You can of course roll your own code for the just the bits that you need, but if you just want "automatic full-model editing forms" then you're in luck because that's something this library also offers.

All element-building is based on walking your model as a data tree, turning leaves and non-leaves into meaningful data, with an options object to control things like pre/post code, value update handling, etc. See the [custom trees](#custom-trees) section below for the full description of this process.

#### HTML form/table

Since the browser mostly cares about HTML code, models have code in place to automatically generate `<form>` and `<table>` elements for working with model data using standard HTML form fields, in addition to being able to generate a "bare" set of `<tr>` table rows for slotting into your own HTML template.

- `toHTMLForm(options?)`: generates a `<form>` element with nested data wrapped as `<fieldset>` elements.
- `toHTMLTable(options?)`: generates a `<table>` element as a flat representation of your model data.
- `toHTMLTableRows(options?)`: only generates the set of `<tr>`, with each row corresponding to one leaf of your model's data tree.

Using these is about as close to no work as possible:

```javascript
import { User } from "../src/models/user.js";

// ...

function generateUserForm(user) {
  document.querySelector(`#modal .form-panel`)?.innerHTML = user.toHTMLForm();
}

// ...

editButton.addEventListener(`click`, evt => generateUserForm(evt));
```

Of course, while models can perform data validation, they don't automatically test whether data is web-safe, so as always: when working with user data, `innerHTML` is rarely safe, and you may want to use a sanitizer to verify on that HTML.

For a more secure version, generating the content using the generic [custom tree](#custom-trees) approach will generally be a better idea.

#### (P)React form/table

```jsx
import { Component, createElement } from "(p)react";
import { User as UserModel } from "./src/models/user.js";

class UserProfile extends Component {
  constructor(props) {
    super(props);
    this.user = UserModel.from(this.props.userData);
  }

  render() {
    return (
      <>
        <h2>Edit profile</h2>
        {this.buildProfileForm()}
      </>
    );
  }

  buildProfileForm() {
    const tableOptions = {
      create: createElement,
      inputHandler: {
        onInput: (evt) => {
          const { name, type, checked, value } = evt.target;
          const newValue = type === `checkbox` ? checked : value;
          try {
            // As form elements use keypaths for input names,
            // we use the .set() function to assign the updated
            // value to our model.
            this.user.set(name, newValue);
          } catch (e) {
            // Warn the user about invalid data, either
            // via an effect, a state update, a modal,
            // etc.
          }
        },
      },
    };

    return (
      <table ref={(e) => (this.profileTable = e)}>
        {this.user.toTableTree(tableOptions)}
      </table>
    );
  }
}
```

#### Custom trees

If you're using a tech stack that isn't explicitly covered by this library, you can relatively easily write your own "tree serializer" using the same approach as used when using (P)React, where you specify the key elements required for the tree conversion, and the code does the rest. This is done by passing in an options object to the `.toForm()`, `.toTable()`, or `.toTableRows()` function, which can be giving the following properties:

- `create: function(tag, options)`: a function that turns a tag-and-options tuple into whatever nestable data structure is required for your tech stack to work.
- `footer`: any kind of content that you need added to the end (only applies to `form` and `table` generation),
- `label: function(key)`: a function that turns a field value's key path into something useful (like turning `key1.fieldvalue` into `Key1 fieldvalue`).
- `skipDebug`: boolean, omits all model fields marked as `debug` from the resulting data structure.
- `inputHandler`: an object that gets dereferenced when processing all child nodes, adding its content as child property for input handling. For example, for (P)React this would be `{ onInput: evt => { ... }}`, so that elements end up being some `<InputElement onInput={evt => ... }/>`.

In addition to this, you can tack any additional properties you need for your data structures. For example, (P)React triggers an `onSubmit` when a form is submitted, and so adding an `onSubmit` property to the options object with a handling function will automatically cause that to kick in.

## Using a data store

Using models to ensure your data is always valid also requires knowing that your models themselves are synced between the various parts of your code, as well as between your storage backend(s) and your code. As such, this library lets you basically use any backend you like, as long as you can write a {@link ModelStore} for it.

The library comes with a single ModelStore implementation predefined, the {@link FileSystemStore}, which uses your local filesystem as a storage backend.

### Using a {@link ModelStore}

- ready()

- async loadRecord(schema, recordName)
- async saveRecord(schema, instance, recordName)
- async deleteRecord(schema, recordName)

- async loadSchema(schema)
- async saveSchema(Model) // <strong>THIS SHOULD TAKE A SCHEMA ARGUMENT, NOT A MODEL</strong>
- async saveMigration(schema1, schema2, migration)

### `await`ing all `Model.create()` / `Model.from()` calls

When using a model store, all schema and record operations are necessarily asynchronous, and so one thing that changes is that `Model.create` and `Model.from` will no longer work synchronously, requiring you either `await` them, or use `.then(instance => ...)` chaining.

### saving models to the store

...

### loading models from the store

...

### deleting models from the store

...

### updating your model definitions

...

#### schema change detection

...

#### data migrations

...

## utilities

...

### (coercing) deep `equals()`

...

### JS object diffing

...
