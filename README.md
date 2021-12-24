_Please note that this library is not at v1.0 yet and both the code and docs may be incomplete_

# Use Models For Data (dot JS)

![A chat about using models for data](docs/images/chat.svg)

---

Plain JS objects and JSON are extremely convenient for moving data around, both in codebases and over the wire, but they're not all that great when it comes to data integrity: at some point, that data needs to actually get used, and when that happens it better be valid data. Whether you had a typo in your code, or a malicious users submitted a payload designed to break out of the expected payload-handling code path, you're going to have to run data validation in order to make sure data integrity problems are caught, and handled.

So: what if you didn't have to write any data validation code because that part gets handled automatically, and you can just focus on writing (and maintaining) code that really matters?

This library takes care of that for you. It lets you declare data models as normal, modern JS classes, using an almost trivial API for model fields, after which you're done: any time you construct or receive data, you wrap it as a model instance, and if that didn't throw an error you now have a data object that behaves exactly same as its plain JS object counterpart, but with automatic validation on assignment. Anywhere in the object. Any properties you get (both individual values as well as and entire subtrees) are always consistent with your model, and assigning values that would violate your model's schema (again, both individual values as well as entire subtrees) will get rejected, making your life as dev or maintainer a _lot_ easier.

---

![A request for an example](docs/images/example.svg)

---

## The simplest example

Say we have some code that works with data that looks like:

```js
const data = {
    name: "some string",
    age: <some number>
};
```

Nothing fancy, nothing special, but we do want to make sure that we never work with data that doesn't have a value for `name`, and let's pretend that age legislation actually means anything on the web, and make sure that `data.age` is 13 or over.

The conventional approach is to use a validator library for that, so that when we "get" that data object, we run the validator, and then we handle the exception:

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

But this isn't ideal: real code rarely jumps straight from "having a data object" to "and then we unpack it and it gets garbage-collected", so if we want to be sure that the data is valid from the get-go, we need to validate at the point where we build that data object, _and_ at the point where we unpack it. But of course, data objects quite often get "built out further" as they travel through your code towards where they finally get fully unpacked, and you better have validation calls at every point where you update that object. Now you have a bug surface with 2+N potential points of failure. And that's just for one data object. And new contributors, or external contractors, or a colleague new to your codebase, is almost certainly going to introduce a new point.

Using "when I think I need it" validation means you're always one merge away from bugs. And we've all been bitten by that one merge request that was let through. You know the one. (Good job on firefighting that one btw, that took a lot of effort, kudos to the whole team)

On the other hand, if we use a model that _forces_ validation while behaving like a plain JS object, that's no longer the case: validation is baked in, and no one (not even you) needs to be trained on when and where to validate. You create model instances (either from scratch or from received/stored data), and your data is now guaranteed valid until it's garbage collected.

### 1. Let's wrap that `{name, age}` data in a model:

First, we define a property/value model, using plain JS class syntax, where each property has an explicit type and type properties:

```js
import { Model, Fields } from "use-models-for-data";

export class User extends Model {
    name = Fields.string({ required: true });
    age = Fields.number({ validate: value => (value > 13) )});
}
```

Is that more work than working with a plain object? Absolutely. But at least the syntax is about as low friction as I can make it. You need a string? Say you need a string. Need a number? Say you need a number.

If fact, we can take things one step further and add some metadata to describe our model:

```js
import { Model, Fields } from "use-models-for-data";

export class User extends Model {
    __meta = {
        name: "System Users",
        description: "A user model for our fancy project",
    };
    name = Fields.string({ required: true });
    age = Fields.number({ validate: value => (value > 13) )});
}
```

(Do we _need_ that `__meta` description? Not until we also want to save our models to a data backend. Things will work just fine without it but let's be honest: you were going to write some code comments here anyway, so you may as well make what you were going to write part of your model-queryable metadata)

### 2. Then use that model.

Now instead of accepting, or inventing, a bare `const data = { name: ..., age: ... }` object, we turn that into a model instance:

```js
import { User } from "./my-models.js";

const user = User.create({
    name: ...,
    age: ...
});
```

Or, even easier if we already had that `data` object mentioned above:

```js
import { User } from "./my-models.js";

const user = User.create(data);
```

and that's all you have to do.

From that point on, `data` works exactly the way it did before, acting like a plain (possibly nested) key/value object, but with every value protected with auto-validation.

Now, many libraries will say "_and that's all you have to do_" and then they immediately follow that up with "_now whenever you X, just remember to Y_": but we're doing none of that here. You really are now done, you don't even need to update your code, except for _removing_ the now superfluous code you had in place to explicitly run validation at various points: if you were using `data` as a plain object before, and you code worked, it needs exactly zero additional changes to accommodate the new model format.

What to get values out? It's a regular object as far as JS knows, so just do that:

```js
const { name } = user;
```

Assign a new value? Again, just do that.

```js
// this may throw on an illegal assignment. Like it should.
user.name = name;
```

Assign an entire subtree of values because you defined a deeply nested model? Still again, just do that:

```js
// this too may throw if any value is an illegal assignment.
user.profile = {
  name: "new name",
  password: "this is secure, right?",
  preferences: {
    theme: "light",
    iconSet: "playful",
  },
};
```

The most important benefit is that we're no longer ever in a situation where required data is missing (because the model creation will have thrown), nor can we be in a situation where a bad assignment is allowed through (because that throws).

We can rely on the fact that any line of code that uses a model instance will be using a model instance that is _known_ to be valid data. And if it runs without throwing, we _know_ that on the next line, it's _still_ valid data. If we try to assign any invalid property values (particularly somewhere in a code path that you forgot about, performing a blind assignment form some other data source) then that assignment will immediately throw an error. Meaning that you don't have to hunt down where in your code things _actually_ went wrong, because there is no validation-after-the-fact anymore. If your code, including dependency code you never wrote, does something that would violate data integrity, you get an error _at that exact point in the code_, and the stack trace will tell you exactly where to start fixing the problem.

Which also means that data validation itself is no longer something that you need tests for: you just need tests to make sure that at critical points in your code paths, `data instanceof ThatModelTheyShouldBe` is true.

So:

1. your test suite is simpler,
2. your errors are faster to find and fix,
3. your code becomes cleaner, and
4. no one needs to be trained to "remember to validate".

Everybody wins.

---

![A request for a more complex example](docs/images/complex_example.svg)

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
    Let's model a user such that the model object is equivalent to:

    {
        isAdmin: bool,
        profile: {
            name: required string,
            password: required string,
            avatar: base64 image data-uri,
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
        recordName: `profile.name`, // this is used for saving/loading model instances
    };

    isAdmin = Fields.string({
      default: false, // obviously
      configurable: false // users won't be able to toggle this through a form. obviously.
    });

    // In order to make sure property subtrees are properly
    // managed, all we need to do is define them as models,
    // too, and then just... point to those:
    profile = Fields.model(Profile);
}

class Profile extends Model {
    name = Fields.string({ required: true });

    password = Fields.string({
        required: true,
        validate: function(value) {
            return daysToCrack(value) > 1000;
        }
    });

    avatar = Fields.string({
        validate: function(value) {
          const result = checkBase64Image(value);
          if (result.error) {
            // we want to signal with more details than just "yes/no" in this case
            const err = new Error(`Image did not pass validation`);
            err.details = result;
            throw err;
          }
        }
    });

    posts = Fields.number({ default: 0, configurable: false });

    preferences =  = Fields.model(Preferences);
}

class Preferences extends Model {
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

import { Models } from "use-models-for-data";
import { ForumUser } from "./my-models.js";

/*
 * First, we set the model library to use a filesystem-backed data
 * store relative to our project root, but obviously *not* served by
 * the express server.
 *
 * This is a global binding that applies to all models.
 */
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

With our middleware showing off using our models:

```js
import sessionManager from "./session-manager.js";
import postMaster from "./post-master.js";
import { ForumUser } from "./my-models.js";

// Register a new user into the system.
export async function registerNewUser(req, res, next) {
  const { name, password } = req.body;
  try {
    /*
     * Since we have a model store set up through the
     * use of Models.useDefaultStore(...), and because in
     * our model we said to use `profile.name` as record
     * name, we can use .load() and .save() to access our
     * data by key. The username, in this case.
     *
     * So, first: quick check, does this user already exist?
     */
    if (ForumUser.load(name)) return next(`Username taken`);

    /*
     * If not, we try to create a user with the provided
     * required fields. Since the name and password go in
     * the `profile` submodel, that's what we pass in as
     * part of the constructor:
     */
    const user = ForumUser.create({
      profile: {
        name,
        password,
      },
    });

    /*
     * Note that we can also do this using a flat object, like
     * you'd get for e.g. a form submissions, where each value
     * has a key-path rather than giving us a plain JS object
     * to work with. In this case, we could have also used:
     *
     *   ForumUser.create({
     *     "profile.name": name,
     *     "profile.password": password
     *   })
     */

    // Then, let's pretend this does something meaningful:
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
  } catch (err) {
    next(err);
  }
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
}

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
  } catch (err) {
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
  } catch (err) {
    return next(err);
  }

  // Likewise, saving is about as plain as it gets.
  try {
    await user.save();
  } catch (err) {
    return next(err);
  }

  next();
}

// When users post to our forum, we bump out their post count.
export async function processForumPost(req, res, next) {
  const user = res.forumUser;

  // First, try to handle the posting.
  try {
    await postMaster.savePost(user, req.body);
  } catch (err) {
    return next(err);
  }

  // If that succeeds, mark this user as having one more
  // post under their belt, again using perfectly mundane JS:
  try {
    user.profile.posts++;
  } catch (err) {
    return next(err);
  }

  // And again, saving this to the backend is a single call.
  try {
    await user.save();
  } catch (err) {
    next(err);
  }

  next();
}
```

---

![A chat about what happens when you change a model](docs/images/changes.svg)

---

## Dealing with model changes

Data validation is easy enough, but models don't stay the same over the lifetime of an application or API. You're going to need to update your models, and that means you're going to have to update your data to match. And when you need to do that, you want your tooling to be there for you, and make the task of uplifting all your old-model-conformant data to be new-model-conformant as quick and easy as possible. If you've used database-backed ORMs, you're probably familiar with the idea of schema migrations.

This library does that, too.

When you tell the library that you're using a data store (which is a single function call), the library will turn on schema tracking for you: whenever you use models, it will keep a record of what schemas those models defined, and it will compare "previously stored schema definitions" to the models you're currently working with: if you shut down your app, update your models, and start it up again, this library can detect the change and store a new, up to date copy of your model schema generate you a standalone runner script for uplifting your data so that it conforms to your updated model, and then shut down your run.

Because, critically, _you_ should decide what to do next. Do you want to migrate your data, or change your code some more first? And if you want to migrate your data, you get to decide when to do that, because maybe you're just working on a feature branch and you're still in the middle of figuring out what the best revised model shape is. Sure, twenty schema revisions might be useful while working on that branch over the course of a week, but before you file that merge request you want to have the option to delete all those intermediates and just generate a single migration from the old model to the now finalised model.

Did you move a property one level lower, or higher? Did you rename a key to something better? Did you delete some parts that are you longer needed? Did you reshuffle entire submodels? None of these things should require you to manually update all your data, whether that's with a script you threw together for that, or with some SQL update commands. Your tooling should know how to preserve data integrity, and make that easy for you to do.

So this does.

---

![A chat about what happens when you change a model](docs/images/api_docs.svg)

---

Whether you just want the API documentation, or a detailed explanation on how to use this library, hit up [the documentation](https://pomax.github.io/use-models-for-data/docs/API).

## Thoughts, comments, discussions

To discuss this library, head on over to the [discussions]() for this project, or file a [new issue]() if you think you've found a bug that needs fixing.

And if you just want to do a shout-out or engine in a short-term exchange, hit me up on [Twitter@TheRealPomax](https://twitter.com/TheRealPomax) or [Mastodon@TheRealPomax](https://mastodon.social/users/TheRealPomax).
