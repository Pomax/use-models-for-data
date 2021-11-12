# Documentation for this library

For the pure API docs, see the class navigation on the left. For a general discussion for this library with examples on how to do the things you'd typically want to do, read on.

## Table of contents

- [Defining models](#defining-models)
  - [Model class definitions](#model-class-definitions)
  - [Field types and options](#field-types-and-options)
  - [Custom validation](#custom-validation)
- [Constructing model instances](#constructing-model-instances)
  - [Examples](#examples-of-create)
- [Using models](#using-models)
  - [set/get values with automatic validation](#set%2Fget-values-with-automatic-validation)
  - [set/get subtreees with automatic validation](#set%2Fget-subtrees-with-automatic-validation)
  - [set/get with path kes](#set%2Fget-with-path-keys)
  - [converting to JSON](#converting-a-model-to-formatted-(sparse)-json)
  - [converting to fully qualified plain object](#converting-to-fully-qualified-plain-js-object)
  - [(partially) resetting model instances)](#(partially)-resetting-model-instances)
- [Using models for/in the browser](#using-models-for%2Fin-the-browser)
  - [import/bundling your model definitions](#import/bundling-your-model-definition)
    - [excluding the default file store for browser bundles](#ignoring-the-default-file-store-for-clientside-work)
  - [Tree-mapping your data](#tree-mapping-your-model)
    - [HTML form/table](#html-form%2Ftable)
    - [(P)React form/table)](#(p)react-form%2Ftable)
    - [Custom trees](#custom-trees)
- [Using a data store](#using-a-data-store)
  - [binding a data store for model use](#binding-a-data-store)
  - [Setting store-related model metadata](#setting-store-related-metadata-on-your-model-classes)
  - [awaiting all model `create` calls](#awaiting-all-model.create()-calls)
  - [saving model instances](#saving-models-to-the-store)
  - [loading model instances](#loading-models-from-the-store)
  - [deleting stored model instances](#deleting-models-from-the-store)
  - [updating your model definitions](#updating-your-model-definitions)
  - [schema change detection](#schema-change-detection)
- [data migrations using the filesystem store](#data-migrations-using-the-%7B%40link-filesystemstore%7D)
  - [editing the migration hooks](#editing-the-migration-runner-hooks)
    - [caching values during a migration](#caching-values-during-a-migration)
  - [dry-running a migration](#dry-running-a-migration)
  - [remember to use version control](#remember-to-run-version-control-on-your-data-directory)


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

However, it's generally a better idea to also specify metadata, using the `__meta` property.

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

This metadata may contain:

- `name` - the model's name
- `description` - a description of what this class models
- `distinct` - if `true`, this model counts as "a thing that can be stored" when using a data store.
- `recordName` - if `distinct` is `true`, this property is used to determine the storage key for model instances, either as a path key (indicating which single field somewhere in the mode counts as identifier) or as a mapping function `(instance) => string`.


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

The full list of properties that can be passed in `options` is:

- `required`: a boolean value that determines whether the field must always have a value
- `default`: a default value to use when the field has not been explicitly assigned
- `choices`: an array of possible values that this field may take (note that `Fields.choice(...)` is typically preferred for this)
- `array`: a boolean value that tells the validator that this field will be an array (of unspecified length) of same-typed items
- `configurable`: a boolean value that determines whether this field may be presented to the user as editable (i.e. when showing the data in an edit form)
- `debug`: a boolean value that regulates whether fields are included in the model when the library is running in debug mode.
- `validate`: a function for performing more elaborate validation than basic type validation can offer.

### Custom validation

The `validate` property takes a function that takes the to-validate value as input argument, and must fail in one of two ways if the value is invalid. The function must:

- return `false`, or
- throw an `Error` object.

The first is for "simple failures", where the validation fails without any details:

```javascript
class Something extends Model {
  //...
  legalAge = Fields.number({
    validate: (value) => value >= 18,
  });
}
```

The second is for when more elaborate details are required.

```javascript
import imagelib from "some-image-lib";

class Something extends Model {
  //...
  avatar = Fields.string({
    validate: value => checkBase64Image(value, `avatar`),
  });
}

function checkBase64Image(data, fieldName) {
  const details = imagelib.verify(data);
  if (!details.ok) {
    throw new ImageVerificationError(fieldName, details);
  }
}

class ImageVerificationError extends Error {
  constructor(fieldName, errorDetails) {
    const { errorCode } = errorDetails;
    this.message =  `${fieldName} was not a valid base64-encoded image (error code: ${errCode}).`;
    this.details = errorDetails;
  }
}
```

## Constructing model instances

{@link Model} instances are created using the `create` function:

- `Model.create(data?, Model.ALLOW_INCOMPLETE?)` where `Model` is your model class, and `data` is a required object with one or more values to be used to bootstrap the model instance.

The `ALLOW_INCOMPLETE` static symbol is used by the library to determine whether or not incompletely model creation is allowed. That is, if not specified, trying to create a model without provided values for required fields will throw a {@link Errors.RequiredFieldsMissing} error.

Also note that in addition to normal JS objects, you may also provide key-pathed objects. That is, while `create` accepts standard objects like this:

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

It also allows you to specify data using a "flat" objects, with dot-separated path keys instead of nesting:

```javascript
{
  "key1.subkey.fieldname": value,
  "key1.keyfield": value,
  "key2.something": value,
}
```

This is especially useful when dealing with flat data delivery mechanisms such as form submissions or flat-record storage back ends.

### Examples of `create`

```javascript
import { Errors } from "use-models-for-data";
import { User } from "./my-models.js";
const { RequiredFieldsMissing } = Errors;

// missing username or password:
const user1 = User.create(User.ALLOW_INCOMPLETE);

// missing password:
const user2 = User.create({
  name: `Tester McTesting`,
}, User.ALLOW_INCOMPLETE);

try {
  // This will throw
  const user2 = User.create();
} catch (e) {
  if (e instanceof RequiredFieldsMissing) {
    // this is unexpected, but a known possible failure state.
    console.error(e);
  } else if (...) {
    ...
  }
}

try {
  // This will also throw
  const user3 = User.create({
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
class User extends Model {
  name = Fields.string({ required: true });
  password = Fields.string({ required: true, validate: ... });
}

// ...

const user = User.create({ name: ..., password: ... });

// ...

user.name = `A new name`;
user.password = `A new password`;

// ...

const { name, password } = user;
```

However, because we now have always-on validation, bad assignments can throw, and we can catch those:

```javascript
import Errors from "use-models-for-data";
const { InvalidAssignment } = Errors;

class User extends Model {
  name = Fields.string({ required: true });
  password = Fields.string({ required: true, validate: ... });
}

const user = User.create({ name: ..., password: ... });

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
instance.key1 = {
  subkey: {
    fieldname: "test",
  },
  keyfield: 1234,
};
```

Although again, because bad assignments will throw, we can catch that:

```javascript
import Errors from "use-models-for-data";
const { InvalidAssignment } = Errors;

class ComplexModel extends Model {
  // ...
}

const instance = ComplexModel.create();

try {
  instance.key1 = {
    subkey: {
      fieldname: "test",
    },
    keyfield: 1234,
  };
} catch (err) {
  if (e instanceof InvalidAssignment) {
    const { errors } = err;
    console.log(errors);
  } else if (...) {
    ...
  }
}
```

### Set/get with path keys

In addition to getting and setting properties like you would for any JS object, models also support `.get(pathkey)` and `.set(pathkey, value)`, for getting/setting nested properties using keys with `.` delimiters:

```javascript
const complexInstance = ComplexModel.create(...);
const fieldKey = `key1.subkey.fieldname`;

let fieldValue = complexInstance.get(fieldKey);
fieldValue = `${fieldValue}-plus`;
complexInstance.set(fieldKey, fieldValue);
```

### Converting a model to formatted (sparse) JSON

Any model instance can be turned into JSON (with sorted keys at all depths) by using its `.toString()` function. However, because model instances are backed by a model definition that may contain default values for anything that isn't explicit set, this JSON will not include any of those default values, only encoding real values. As such, the following model:

```javascript
class User extends Model {
  name = Fields.string({ required: true });
  password = Fields.string({ required: true, validate: ... });
  postCount = Fields.number({ default: 0 })
  rewards = Fields.number({ default: 0 })
  level = Fields.number({ default: 1 })
}
```

Will turn into a JSON object with only a name and password using `.toString()` unless any of the fields with default values were set to a non-default value prior to `.toString()`:

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

### Converting to fully qualified plain JS object

To generate a fully qualified object (e.g. when needing to send the model off to something that does _not_ use models for data) the `.valueOf()` function can be used to turn any model instance into a plain JS object. If you've written your code right, you should never need to use this function. But if you absolutely _do_ need it, it's there.

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

Sometimes it's necessary to not just "set some values" but also "unset previously set values". Rather than having to write the following code, in which we can reassign our user variable, leading to the possibility of all kinds of fun bugs:

```javascript
let user1 = User.create({ ... });
const { name, password, level } = user1;
user1 = User.create({ name, password, level});
```

You can use the `.reset()` function, with an optional object for reassigning some (or all) fields some new data, without having to declare new variables, and without allowing redefining `user`, thus making sure that it will always be a validating model instance.

```javascript
const user = User.create({ ... });
const { name, password, level } = user;
user.reset({ name, password, level});
```

Although of course, if you want immutable code, you will almost certainly not want to use `reset()`, instead just making explicit, new model instances:

```javascript
function furtherProcess(user) {
  // ...
}

const user1 = User.create({ ... });
const { name, password, level } = user1;
furtherProcess(User.create({ name, password, level}));
```

## Using models for/in the browser

Models wouldn't be very useful if you could only use them server-side: you can use models for data anywhere that you can use (modern) Javascript.

### Import/bundling your model definition

When writing client-side JS, all you need to do is import your classes as usually, and let your bundler (for modern JS) take care of the rest. This way your client and server will be "speaking the same models" no matter how much you update them.

In fact, even if you don't even have "a server" and you just write client-side code that works ith API responses from other places on the web, you will be able to just bundle up your client with model functionality included.

#### ignoring the default file store for clientside work

The one thing to take note of is that `use-models-for-data` ships with a default filesystem store to make "just writing something that works" much easier. However, as this store relies on `path` and `fs`, and your client side code can't use Node's `path` and `fs`, you'll need to tell your bundler to ignore this store file.

For example, if you're using an npm script that uses `esbuild` for bundling, you'd want:

```json
{
  "scripts": {
    ...
    "bundle:client": "esbuild ... --external:./node_modules/use-models-for-data/lib/models/store/filesystem-store.js",
    ...
  }
}
```

### Tree mapping your model

While updating models using code makes a ton of sense server-side, if your code also has a client-side component, you probably want to offer users a way to work with (some) models, too.

For instance, you might have a `Profile` model, parts of which your users should be able to update client-side. You can, of course, roll your own code for turning a model into something editable (after all, model instances behave like any other plain JS object, so that's really not that much work) but if you just want something that will automatically generate you full-model forms then you're in luck because that's something this library also offers.

All element-building is based on walking your model as a data tree, turning leaves and non-leaves into meaningful data, with an options object to control things like pre/post code, value update handling, etc. See the [custom trees](#custom-trees) section below for the full description of this process.

#### HTML form/table

Since the browser mostly cares about HTML code, models have code in place to automatically generate `<form>` and `<table>` elements for working with model data using standard HTML form fields, in addition to being able to generate a "bare" set of `<tr>` table rows for slotting into your own HTML template.

- `toHTMLForm(options?)`: generates a `<form>` element with nested data wrapped as `<fieldset>` elements.
- `toHTMLTable(options?)`: generates a `<table>` element as a flat representation of your model data.
- `toHTMLTableRows(options?)`: only generates the set of `<tr>`, with each row corresponding to one leaf of your model's data tree.

Using these is about as close to no work as possible:

```javascript
import { User } from "../src/models/user.js";

function generateUserForm(user) {
  document.querySelector(`#modal .form-panel`)?.innerHTML = user.toHTMLForm();
}

// ...
const user = User.create({...});
editButton.addEventListener(`click`, () => generateUserForm(user));
```

Of course, while models can perform data validation, they don't automatically test whether data is web-safe, so as always: when working with user data, `innerHTML` is rarely safe, and you may want to use a sanitizer to verify that the HTML you're inserting can be trusted.

For a more secure version, generating the content using the generic [custom tree](#custom-trees) approach will generally be a better idea.

#### (P)React form/table

```jsx
import { Component, createElement } from "(p)react";
import { User as UserModel } from "./src/models/user.js";

class UserProfile extends Component {
  constructor(props) {
    super(props);
    this.user = UserModel.create(this.props.userData);
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
            // As form elements use path-keys for input names,
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
- `label: function(key)`: a function that turns a field value's path key into something useful (like turning `key1.fieldvalue` into `Key1 fieldvalue`).
- `skipDebug`: boolean, omits all model fields marked as `debug` from the resulting data structure.
- `inputHandler`: an object that gets dereferenced when processing all child nodes, adding its content as child property for input handling. For example, for (P)React this would be `{ onInput: evt => { ... }}`, so that elements end up being some `<InputElement onInput={evt => ... }/>`.

In addition to this, you can tack any additional properties you need for your data structures. For example, (P)React triggers an `onSubmit` when a form is submitted, and so adding an `onSubmit` property to the options object with a handling function will automatically cause that to kick in.

## Using a data store

Using models to ensure your data is always valid also requires knowing that your models themselves are synced between the various parts of your code, as well as between your storage backend(s) and your code. As such, this library lets you basically use any backend you like, as long as you can write a {@link ModelStore} for it.

The library comes with a single ModelStore implementation predefined, the {@link FileSystemStore}, which uses your local filesystem as a storage backend.

### Binding a data store

Use the `Models.setStore` function:

```javascript
import { Models } from "use-models-for-data";
import { MyDataStore } from "./src/store/my-data-store.js";

Models.useStore(new MyDataStore());
```

If you just want to use the file system, there is a dedicated `useDefaultStore` function that takes a file system path as argument and builds an implicit {@link FileSystemStore}. Note that this is an `async` function, and so either needs `await`ing, or `.then(...)` handling:

```javascript
import { Models } from "use-models-for-data";

// Either use async/await:
async function setup() {
  await Models.useDefaultStore(`./data-store`);
  // ...
}

// Or promise handling:
Models.useDefaultStore(`./data-store`)
.then(() = {
  // ...
})
.catch(err => {
  // ...
})
```

### Setting store related metadata on your Model classes

In order to use a data store with your models, you need to make sure that your model classes specify a few property in their `__meta` object. And of course, if you didn't specify one before, you'll have to add one:

```javascript
class MyModel extends Model {
  __meta = {
    name: `...`,
    distinct: true,
    recordName: pathkey string, or function
  }
}
```
The `name` property is used to name the auto-generated schema that is associated with your model, the `distinct` property must be set to `true`, which tells the library that instances of this model can be saved as distinct records in whatever backend is involved, and the `recordName` property lets the library determine the "key" with which to save your model instances.

### Saving models to the store

With a store set up, saving a model is literally just a matter of calling `save`:

```javascript
const user = User.create(...);

//...

await user.save();
```

This will save the user based on their schema (inherent to your model class) and your model-indicated `__meta.recordName` property. This can either be a path key to resolve on the instance, such as:

```javascript
class User extends Model {
  __meta = {
    name: `users`,
    recordName: `profile.name`
  };
  profile = Fields.model(Profile);
}

class Profile extends Model {
  name = Fields.string();
}

const user = User.create({ profile: { name: "Tester McTesting" }});
await user.save();
```

In this example, the user will get saved keyed on both its schema name ("users") and its recordName, which is the `user.profile.name` value (in this case, "Tester McTesting").

Alternatively, you can declare a function for the recordName, which takes the model instance as argument and returns a string:

```javascript
class User extends Model {
  __meta = {
    name: `users`,
    recordName: function(instance) {
      return instance.profile.name;
    }
  };
  profile = Fields.model(Profile);
}

//...

const user = User.create({ profile: { name: "Tester McTesting" }});
await user.save();
```

This has the same effect as above, but with more control over what exact identifier to generate.

### Loading models from the store

Loading models is about as easy as saving: once you've saved a model, you can load it by using its associated recordName as argument to the load function:

```javascript
const user = await User.load(`Tester McTesting`);
```

### Deleting models from the store

Deleting models from the store is a matter of calling `delete`:

```javascript
const user = await User.load(`Tester McTesting`);
await user.delete();
```


### Updating your model definitions

Models aren't write-once, use-forever, they are write-once, then-update, then-update-again, and you don't want to have to manually update all your data just because your model changed. As such, when using a data store, this library turns on change tracking for models, to help with the task of making sure your data is always consistent with respect to your models.

Let's look at an example, with our basic user model:

```javascript
class User extends Model {
  __meta = {
    name: `users`,
    distinct: true,
    recordName: `name`,
  };
  name = Fields.string({ required: true });
  password = Fields.string({ required: true, validate: ... });
}
```

This model may work well enough for a month or two, you just need to negotiate logins, you have a bunch of users created, and everything's been working out great but maybe that name/passsword combination is better off inside a `profile` with the `user` itself reserved for more of an "aggregator" role... so you change your model:

```javascript
class User extends Model {
  __meta = {
    name: `users`,
    distinct: true,
    recordName: `profile.name`,
  };
  admin = Fields.boolean({ default: false });
  profile = Fields.model(Profile);
}

class Profile extends Model {
  __meta = {
    name: `profiles`,
    distinct: false,
  };
  name = Fields.string({ required: true });
  password = Fields.string({ required: true, validate: ... });
}
```

And even if you only have a handful of users, having to update all of them manually quickly starts to take up a prohibitive amount of time. Maybe even to the point where you may decide to just live with your previous model and figure out some hackier way to get profiles working. And that would be terrible, because your tooling should help make this step easy.

### Schema change detection

With a data store in place, the library will see that the model you're trying to load doesn't actually match the schema that was saved previously, and will halt your code run:

```
SchemaMismatchForModel [Error]: Schema mismatch for User model, please migrate your data first.
    at ModelRegistry.recordModelClassWithStoreBacking (file:///.../node_modules/use-models-for-data/lib/models/model-registry.js:164:13)
    at async ModelRegistry.recordModelClassAsync (file:///.../node_modules/use-models-for-data/lib/models/model-registry.js:60:5)
    at async Function.__registerAsync (file:///.../node_modules/use-models-for-data/lib/models/models.js:80:7)
    at somewhere in our file
  modelName: 'User'
}
```
Depending on the store you're using this may do different things, but with the default {@link FileSystemStore} this error will be preceded by a migration runner notice:

```
╔════════════════════════════════════════════════════════════════════════════════╗
║ Migration saved, run using "node your-data-store-path/users/users.v1.to.v2.js" ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

The {@link FileSystemStore} will automatically create a (node) executable that you can run to automatically uplift your data to the new model, either uplifting specific files as part of your own scripts, or uplifting your entire model directory in a single go.

To help you out, it comes with a nicely detailed help text when you run it without any target:

```
$ node ./your-data-store-path/users/users.v1.to.v2.js

Autogenerated executable runner for migrating data based on the
"users" schema from version 1 to version 2.

╔═══════════════════════════════════════════════════════════════════════════╗
║ A number of change handler functions have been included, which are called ║
║ during the migration process, and can be implemented to perform data      ║
║ processing outside of the migration itself.                               ║
╚═══════════════════════════════════════════════════════════════════════════╝

Usage:

  1. node users.v1.to.v2.js targefile.json
  2. node users.v1.to.v2.js targefile.json --write
  3. node users.v1.to.v2.js targetdirectory --all

Mode 1: if a target file is indicated, the migration script will load in
the file and migrate its data, outputting the result to stdout

Mode 2: If the "--write" flag is provided, no data will be written to
stdout, instead rewriting the file itself in place.

Mode 3: If the "--all" flag is provided in combination with a directory
path, the script will load all .json files in the indicated directory and
process them as if running in mode 2.

Rollback usage:

  node users.v1.to.v2.js [...] --rollback

All three modes can be made to roll back a migration by using the
"--rollback" flag, which will rollback each step in the list of diff
operations, running them last-to-first.
```

## Data migrations using the {@link FileSystemStore}

As mentioned, migrations take the form of executable migration runners, which uplift data by running through a sequence of operational transformations, with hooks that may be used to augment the base diffing behaviour.

### Editing the migration runner hooks

Before running a migration, it's a good idea to open the migration runner in your editor, because there will be times where your help is needed to make sure the migration does the right thing. For example, the differ is not not super great at detecting "relocations" (yet which means that if you know you just moved a property from one part of the model to another part, you may see this reflected in the list of operations as separate `remove` and `add` operations. If we ran that migration without intervention, we'd end up losing data, and that's no good.

All hooks take the form `function operationForKey(object, operation, options)`, where the parameters represent:

- `object` - the object representation of the data we're uplifting,
- `operation` - the diff operation that has been, or will be, applied,
- `options` - an object with additional values that may be useful for the hook's specific operation

Where hooks are called before the operation gets performed, _except_ for the `add` operation, which has a hook that gets called _after_ the operation gets performed.

All operations contain:

- `type` - the kind of operation: `add`, `remove`, `update`, `rename`, and `move`.
- `key` - the path key to which this operation applies.
- `value` - the {@link Schema} value (not data value) involved
  `fn` - the name of the hook

And the `options` for each operation are:

- `add`, `remove`, and `update`: An object of the form `{ level, propName }` where `level` is the (sub)tree in our data object where the change will be made, and `propName` is the name of the property in that (sub)tree.
- `rename` and `move`: An object of the form `{ oldKey, key, oldPosition, newPosition }`, where `oldKey` is current path key based on the old schema, `key` is the new path key based on the updated schema, and `oldPosition` and `newPosition` are the relative (sub)trees for those path keys.

#### Caching values during a migration

In order to correctly move data during a migration, there is a `cache` object that has `set(key, value)` and `get(key)` methods so that you can make sure no data gets lost. For example, uplifting data from a schema `User { name, password }` to a schema `User { profile }` + `Profile { name, password }` will result in two `remove` operations for `name` and `password`, and one `add` operation for `profile`. In order to make sure the old data makes it into the new spot, we can update the hook functions as follows:

```javascript
changeHandler.removeName = function (object, op, options) {
  // This runs before the actual removal is applied, giving
  // us time to cache the value for restoring later.
  cache.set(`name`, object.name);
};

changeHandler.removePassword = function (object, op, options) {
  // And the same is true here.
  cache.set(`password`, object.password);
};

changeHandler.addProfile = function (object, op, options) {
  // Finally, this hook runs after the profile has been added,
  // so we can safely restore the values we cached above.
  object.profile.name = cache.get(`name`);
  object.profile.password = cache.get(`password`);
};
```

Also note that in order to make sure that this kind of "manual intervention" is always possible, operations will always run all `remove` operations first, then all `rename` operations, then all `update` operations, then all `add` operations, and finally all `move` operations.

### Dry-running a migration

Before running your migrations in place, overwriting all data so that your code can run again, remember to dry-run your migration first by using:

```
$ node ./your/data/store/metaname/metaname.vN.to.vM.js ./your/data/store/metaname/some-object.json
```

This will apply a migration but write the result to `stdout` rather than back to the same file, so you can verify that the result is indeed what it should be. If the migration does not yield a valid object (based on a schema validation check after uplifting) the script will let you know. For example, if we run the above migration without updating the migration hooks, the dry-run output will be:

```bash
$ node ./your/data/store/users/users.v1.to.v2.js ./your/data/store/users/some-user.json
ERROR: Migrated data did not pass schema validation.
Please fill in the migration hooks to resolve the following errors:
[
  'profile.name: required field missing.',
  'profile.password: required field missing.'
]
```

Whereas with our migration hook code in place, we would get:

```bash
$ node ./your/data/store/users/users.v1.to.v2.js ./your/data/store/users/some-user.json
{
  "profile": {
    "name": "our previous name value",
    "password": "some previous password value"
  }
}
```

Do note, of course, that default values are not saved to file, which also means that any subtrees consisting purely of default value leaves (or further subtrees) will not show up during a data migration, unless you made sure to put non-default values into them using the migration hooks.

### Remember to run version control on your data directory

And on a final note, while you should of course never (well okay, _almost_ never) include your data directory in your project's version-control-managed set of paths, you _should_ make sure to initialise your data directory for local-only version control, because being able to say "wow that migration went all kinds of wrong, let me just reset the dir to what it was before I ran the migration" is the kind of peace of mind you owe to yourself.

If you use git, simply run `git init` in your data directory, even if that directory is in your project's `.gitignore` (as it should be), and you can now trivially run commits specific for your data directory, independently of your actual project.
