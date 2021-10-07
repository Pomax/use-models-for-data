_Please note that this library is not at v1.0 yet and both the code and docs may be incomplete_


# Use Models For Data (dot JS)


![A chat about using models for data](chat.svg)

---

Plain JS objects and JSON are extremely convenient for moving data around, both in codebases and over the wire, but they're not all that great when it comes to data integrity: at some point, that data needs to actually get used, and when that happens it better be valid data. Whether you had a typo in your code, or a malicious users submitted a payload designed to break out of the expected payload-handling code path, you're going to have to run data validation in order to make sure data integrity problems are caught, and handled.

So: what if you don't have to write and data validation code because that part gets handled automatically, and you can just focus on writing (and maintaining) code that really matters?

This library will take care of that for you. It lets you declare data models as normal, modern JS classes, using an almost trivial API for model fields, after which you're done: any time you construct or receive data, you pack it as a model instance, and if that didn't throw an error you now have a data object that behaves exactly same as its plain JS object counterpart, but wrapped in automatic validation. Any properties you get (both individual values as well as and entire subtrees) are always consistent with your model, and assigning values that would violate your model's schema (again, both individual values as well as entire subtrees) will get rejected, making your life as dev or maintainer a lot easier.

---

![A request for an example](example.svg)

---

## The simplest example

Say we have some code that works with data that looks like:

```js
const data = {
    name: "some string",
    age: <some number>
}
```

Nothing fancy, nothing special, but we do want to make sure that we never work with data that doesn't have a value for `name`, and `data.age` is 14 or less. We could use a validator library for that, so that when we "get" that data object, we run the validator, and then we handle the exception:

```js
function workWith(data) {
  try {
    validate(data, NameAgeSchema);
    doSomethingWith(data);
  } catch (err) {
    rejectNameAge(data, err);
  }
}
```

But this isn't ideal: real code rare jumps straight from "having a data object" to "and then unpacking it and garbage-collecting it", so if we want to be sure that the data is valid from the get-go, we need to validate at the point where build that data object, _and_ at the point where we unpack it. But quite often, data objects get "built out further" as they travel through your code towards where they finally get fully unpacked, and you better have validation calls at every point where you update that object. Now you have a bug surface with 2+N potential points of failure. And that's just for one data object. And new contributors, or external contractors, or a colleague new to your codebase is almost certainly going to introduce a new point.

Using "when I *think* I need it" validation means you're always one merge away from bugs.

On the other hand, if we use a model that _forces_ validation while behaving like a plain JS object, that's no longer the case: validation is baked in, and no one (not even you) needs to be trained on when and where to validate. You create model instances (either from scratch or from received/stored data), and your data is now guaranteed valid until it's garbage collected.

### 1. Let's wrap that `{name, age}` data in a model:

First, we define a property/value model, using plain JS class syntax, where each property has an explicit type and type properties:

```js
import { Model, Fields } from "use-models-for-data";

export class User extends Model {
    __meta = {
        name: `my always-valid data model`,
        description: `A trivial way to ensure data consistence.`,
    };

    name = Fields.string({ required: true });
    age = Fields.number({ validate: value => (value > 13) )});
}
```

### 2. Then use that model.

Now instead of the bare `const data = { name: ..., age: ... }` object, we make that a model instance:

```js
import { User } from "./my-models.js";

const data = User.from({
    name: ...,
    age: ...
})
```

and that's all you have to do.

From that point on, `data` works exactly the way it did before, acting like a plain (possibly nested) key/value object, but with every value protected with auto-validation.

We now can't assign a bad age anymore, and we can't accidentally forget to specify a name: if we can access this object, we _know_ that whatever data is in it is valid data, and if we try to assign it invalid property values (or we have some code that does a blind assignment form some other data source that we don't control but happens to yield bad data) then that assignment will immediately throw an error, meaning you don't have to hunt down where, in between two validation calls, things went wrong: no hunting required, like any good error, the stacktrace gives you the exact line to look at. No bug hunting required anymore.

Which also means that data validation is no longer a test target: all your tests that make sure that data stays valid as it travels your code paths become "making sure that your data is an `instanceof Model` at the start of a codepath".

Your test suite is simpler, your errors are faster to fix, your code is cleaner, everyone wins.

---

![A request for a more complex example](complex_example.svg)

---

## A more complex example

Let's look at a slightly more realistic example, where we have a compound model for working with users in some forum software:

```js
import { Model, Fields } from "use-models-for-data";
import { checkBase64Image } from "some-web-image-library";
import { daysToCrack } from "a-good-password-library";
import * as DateTimeLibrary from "some-date-time-library";
import Themes from "./lib/themes.js";

/**
    And let's model a user such that the model is equivalent to:

    {
        isAdmin: bool,
        profile: {
            name: string,
            password: string,
            avatar: base64 image datauri,
            posts: number,
            preferences: {
                theme: string,
                timezone: number,
            }
        }
    }

**/

export class ForumUser extends Model {
    __meta = {
        name: `users`,
        description: `A simple CMS user model.`,
        recordName: `profile.name`,
    };

    isAdmin = Fields.string({ default: false, configurable: false });

    // In order to make sure property subtrees are properly
    // managed, all we need to do is define them as models,
    // too, and then just... point to those:
    profile = Fields.model(new Profile());
}

class Profile extends Model {
    __meta = {
        name: `profile`,
        description:
    };

    name = Fields.string({ required: true });
    password = Fields.string({
        required: true,
        validate: function(value) {
            return daysToCrack(value) > 1000;
        }
    });
    avatar = Fields.string({
        validate: function(value) {
            try {
              checkBase64Image(value);
            } catch (err) {
                // we want more details than just "yes/no" in this case
                throw err;
            }
        }
    });
    posts = Fields.number({ default: 0, configurable: false });
    preferences =  = Fields.model(new Preferences());
}

class Preferences extends Model {
    __meta = {
        name: `user preferences`,
        description: `system preferences`
    };

    theme = Fields.string({
        choices: Themes.getThemeNames(),
        default: : Themes.defaultThemeName
    });

    timezone = Fields.number({
        choices: DateTimeLibrary.getTimezones(),
    });
}
```

Now, let's use this model for our data, and let's say we're using an Express app:

```js
import express from "express";
import {
    resolveUsernameParam,
    getUser,
    checkAuthentication,
    saveProfileUpdate
} from "./my-middleware.js";
// with additional express-related imports here

import { ForumUser } from "./my-models.js";
import { Models } from "use-models-for-data";

// First, we set the model library to use a filesystem-backed data
// store. This is a global binding that applies to all models.
const STORE_LOCATION = process.env.STORE_LOCATION ?? `./data-store`;
Models.useDefaultStore(STORE_LOCATION);

// Then we bootstrap our express app:
const PORT = process.env.PORT ?? 80;
const app = express();
// with additional app.use bindings for things like post handling etc.


app.post(`register`,
    registerNewUser,
    async function (req, res) => {
        res.render(`welcome.html`, { user: req.forumUser });
    }
);

app.param('username', resolveUsernameParam);

app.get(`profile/:username/`,
  checkAuthentication,
  async function(req, res) {
    const user = req.forumUser;
    const { authenticated, name } = req.authInfo;
    const ourProfile = authenticated && name === user.name;
    res.render(`profile.html`, {
      user,
      /*
        * Models have "form building" built-in, because you're going to need
        * it. They can generate plain HTML, as well as any kind of tree you
        * need (for generating (P)React component trees, for example).
        *
        * And note that we're building a form for a submodel of user: any
        * model property that is itself a model fully supports everything
        * that the top model does. It's models all the way down.
        */
      editForm: ourProfile ? user.profile.toHTMLForm({
          action: `/profile/${name}`,
          method: `UPDATE`,
      }) : ``,
    });
  }
);

app.update(`profile/:username/`,
  checkAuthentication,
  saveProfileUpdate,
  async function (req, res) {
    res.render(`profile.html`, { user: req.forumUser, updated: true });
  }
);

app.post(`message/`,
  checkAuthentication,
  getUser,
  processForumPost,
  async function (req, res) {
    res.render(`posted.html`, { user: req.forumUser });
  }
);

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${port}`);
});
```

And here are the important bits that make everything work:

```js
import sessionManager from "./session-manager.js";
import postMaster from "./post-master.js";
import { ForumUser } from "./my-models.js";

// Register a new user into the system.
export async function registerNewUser(req, res, next) {
    const { name, password } = req.body;
    try {
        // quick check: does this user already exist?
        if (ForumUser.load(name)) return next(`Username taken`);

        /*
         * Now then: we try to create a user with the provided
         * required fields. Since the name and password go in
         * the `profile` submodel, that's what we pass in as
         * part of the constructor: a plain old JS object with
         * correct nesting.
         */
        const user = ForumUser.create({
            profile: {
                name,
                password
            }
        });

        // Then let's pretend this does something meaningful:
        sessionManager.doSomethingWith(req, user);

        /*
         * And since we have a model store set up through the
         * use of Models.useDefaultStore(...), and because in
         * our model we said to use `profile.name` as record
         * name, we can simply call .save() and it will save a
         * new record keyed on the username, so we can load()
         * it later on using that same key.
         */
        await user.save();

        // Then we bind and continue
        req.forumUser = user;
        next();
    } catch (err) { next(err); }
}


// Check whether a request has an associated authenticated,
// so we'll know whether to allow form submissions (e.g. for
// editing their own profile).
export async function checkAuthentication(req, res, next) {
    req.authInfo = sessionManager.getAuthInfo(req);
    next();
}

// A proxy for getUser(), for use with app.params()
export async function resolveUsernameParam(req, res, next, username) {
    req.username = username;
    getUser(req, res, next);
};

// Get a ForumUser that matches the URL-indicated username.
export async function getUser(req, res, next) {
    const username = req.username || req.authInfo.name;
    if (!username) return next(`Could not get user`);

    try {
        /*
         * Much like user.save(), because we have a data store set
         * up, and we have our model set to use `profile.name` as
         * record name, we can simply use the model .load() function
         * with the username as key to retrieve our stored user.
         */
        req.forumUser = ForumUser.load(username);
        next();
    }
    catch (err) {
        /*
         * This can fail for a few different reasons.
         *
         * 1. This could be a "no file found for that record name", or
         * 2. the file might exist, but it failed getting parsed to data, or
         * 3. it's a valid file, it parses to data, but the data is incompatible.
         */
        return next(`Could not get user`);
    }
}

// Update a user's profile and save it to the backend.
export async function saveProfileUpdate(req, res, next) {
    const user = req.forumUser;

    const { authenticated, name } = req.authInfo;
    if (!authenticated) return next(`Not logged in`);

    const ourProfile = name === user.name;
    if (!ourProfile) return next(`Cannot edit someone else's profile`);

    try {
       /*
        * This is literally all we have to do to make sure this
        * is a valid update: just perform a perfectly normal JS
        * property assignment, as you would for any plain object.
        *
        * If the entire subtree assignment is good, the assignment
        * is allowed through, otherwise the assignment will throw
        * an error with a list of all values that failed validation,
        * and why.
        */
        user.profile = req.body;
    }
    catch (err) { return next(err); }

    // Likewise, saving is about as plain as it gets.
    try { await user.save(); } catch (err) { return next(err); }

    next();
};

// When users post to our forum, we bump out their post count.
export async function processForumPost(req, res, next) {
    const user = res.forumUser;

    // First, try to handle the posting.
    try {
        await postMaster.savePost(user, req.body);
    }
    catch (err) { return next(err); }

    // If that succeeds, mark this user as having one more
    // post under their belt, again using perfectly mundane JS:
    try {
        user.profile.posts++;
    }
    catch(err) { return next(err); }

    // And again, saving this to the backend is a single call.
    try { await user.save(); } catch(err) { next(err); }

    next();
}
```

---

![A chat about what happens when you change a model](changes.svg)

---

## Dealing with model changes

Data validation is easy enough, but models don't stay the same over the lifetime of an application or API. You're going to need to update your data. And when you do, you want your tooling to make it easy for you to uplift all your old-model-conformant data to be new-model-conformant. If you've used databases, you're probably familiar with schema migrations.

This library does that, too.

You can tell the library that you're using a data store, in which case it switches to running in schema-aware mode: when you use models, it will keep a record of what schema those models define, and it will compare "previously stored schema data" to the models you're working with: if you shut down your app, update your model, and start it up again, this library can detect the change and store a new copy of the schema, and generate you a standalone runner script for uplifting data.

Did you move a property one level lower, or higher? Did you rename a key to something better? Did you delete some parts that are you longer needed? None of these things should require you to manually go in and update all your data, whether that's with a quick script your wrote, or a well crafted bit of SQL. Your tooling should do that for you.

So this does.

---

![A chat about what happens when you change a model](api_docs.svg)

---

## Topics for this library

- defining models
    - class definitions
    - field types and options
    - custom validation
        - false for simple validation failure
        - throw an error for detailed validation failure
- constructing models
    - create default
    - create default even though that means missing required fields (allowIncomplete)
    - create from data (optionally even if it's missing required fields)
- using models
    - set/get values with automatic validation
    - set/get subtrees with automatic validation
    - toString (formatted JSON without defaults)
    - valueOf (fully qualified plain object)
    - reset([data])
- using models in the browser
    - HTML form/table
    - (P)React form/table
    - Custom trees
- using a data store
    - loading models from the store
    - saving models to the store
    - redefining models
      - schema change detection
      - data migrations

<!--
# Basic use

```js
import { Models } from "use-models-for-data";
import { MyDataModel } from "./my-data-model.js";
Models.useDefaultStore(`./data-store`);

const model = MyDataModel.from({
    count: 0,
    name: `My name`,
    address: {
        street: `First street`,
        number: 1334,
        city: `My City`
    }
});

model.save();
```

This will write a file `./data-store/My data model/My name.json` to disk, with only non-default values saved:

```json
{
    "name": "My name",
    "address": {
        "street": "First street",
        "number": 1334,
        "city": "My City"
    }
}
```


```js
import { Model, Fields } from "use-models-for-data";

export class MyDataModel extends Model {
    __meta = {
        name: `My data model`,
        distinct: true,
        recordkey: (record) => record.name,
    };

    count = Fields.number({ default: 0 });
    name = Fields.string({ required: true, default: "some string "});
    address = Fields.model(new Address());
}

import someCityList from "./my-city-list.js";

class Address extends Model {
    __meta = {
        name: `A simplified address model`,
    };

    street = Fields.string({
        validate: (value) => {
            // throw error if value is not a valid street
        },
    });

    number = Fields.number({ required: true });

    city = Fields.string({
        required: true,
        choices: someCityList,
    });
}
```
-->
