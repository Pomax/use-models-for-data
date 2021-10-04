# Use Models For Data (dot JS)

![A chat about using models for data](chat.svg)

Plain JS objects and JSON are extremely convenient for moving data around both in codebases and over the wire, but they're not all that great when it comes to data integrity: at some point, that data needs to actually get used, and when that happens, it better be valid data. Whether you had a typo in your code, or a malicious users submitted a payload designed to break out of the expected payload-handling code path, you're going to have to run data validation in order to make sure data integrity problems are caught, and handled.

So: what if you don't have to do the data validation part, and you can just focus on the code that really matters: writing the "handling good data vs. bad data" parts that define your application's business logic? That's what you want to use models for data for.

This library lets you declare data models as normal, modern JS classes, using an almost trivial API for model fields, after which you're done: any time you construct or receive data, you "stick it in a model" and if that didn't throw an error you now have a data object that behaves the same as a plain JS object but with automatic validation wrapped around it: any properties you get (both primitive and entire subtrees) are always consistent with your model, and assigning values that would violate your model's schema will get rejected, making the job of writing good code that has to work with application data a lot easier.

## The simplest example

Say we have some code that works with data that looks like `data = { name: <some string>, age: <some number> }`. Nothing fancy, nothing special, but we do want to make sure that we never work with data where `data.age` is 14 or less. And not just "when we declare it" but also at any point between declaration and that data getting used: any time this data object is touched, we'd need to revalidate it. That doesn't sound too problematic: you know your own code, but that contributor that just signed onto your project, or that new developer that doesn't know the codebase intimately yet doesn't: you're always one merge away from bugs. On the other hand, if we use a model that _forces_ validation while acting like a plain JS object, that's no longer the case: validation is baked in, and no one (including you) needs to be trained on when and where to validate.

### 1. Let's wrap that `{name, age}` data in a model:

```js
import { Model, Fields } from "use-models-for-data";

export class MyModel extends Model {
    __meta = {
        name: `my always-valid data model`,
        description: `A trivial way to ensure data consistence.`,
    };

    name = Fields.string({ required: true });
    age = Fields.number({ validate: value => (value > 13) )});
}
```

### 2. Use that model.

Now when we declare data of this form, we just make sure to use `const data = MyModel.from({ name: ..., age: ... })` instead of the bare `const data = { name: ..., age: ... }` object declaration, and that's it. From that point on, `data` works exactly the way it did before, acting like a plain (possibly nested) key/value object, but with every value protected with auto-validation.

We can't assign a bad age anymore, we can't accidentally forget to specify a name: if we're accessing this object, we _know_ that whatever data is in it is valid data, and if we try to assign it invalid property values (or we have some code that does a blind assignment form some other data source that we don't control but happens to yield bad data) then that assignment will throw an error.

Which means all you need to do is make sure you have tests: if someone or something does something that would lead to bad data, your tests are going to fail, and they're going to fail _at the point of failure_ rather than much later, when some function many steps later that actually tries to use one particularly rarely-used property that went missing, or never got assigned in the first place.

```js
import { MyModel } from "./my-models.js";

const plainData = {
    name: `my name here!`,
    age: 25,
};

// let's lock in some data integrity:
const modeled = MyModel.from(plainData);

// now we're cooking with data.
try {
    modeled.age = 12;
} catch (err) {
    console.log(`Guess I'm not allowed to be 12`);
    throw err;
}

// Incomplete data because "something else got it wrong" happens all the time.
// Let's make it easy to catch:
let fromSomewhere = { age: 20 };

try {
    fromSomewhere = MyModel.from(fromSomewhere);
} catch (err) {
    console.log(`Now we get an error where it occurs, not "an entire codebase later".`);
    throw err;
}
```

And because this is still "plain data" we can trivially send it on from one place to another, knowing that we _sent_ valid data. And then receivers in turn can use models to ensure that is also the case for them. For instance, if our client-side code uses models and we're sending the data to an express server, it can trivially ensure that what it receives is valid data with a simple `.from()`:

```js
import { MyModel } from "./my-models.js";
import express from "express";
// ...plus many more express-related imports...

const app = express();
// ...plus lots of app assignments...


// First, let's declare a a POST data validation middleware function,
// so that we can make sure that we're only ever dealing with valid data.
function ensureValidSubmission(req, res, next) {
  try {
    req.body = MyModel.from(req.body);
    next(); // if we make it here, this data was valid, and will stay valid.
  } catch (err) {
    next(err);
  }
}

app.post("/submit", ensureValidSubmission, async(req, res) => {
  // if we get here, the data is going to be valid for as long as our code
  // will be working with it, without needing any sort of re-validation anywhere.
  const result = await backend.processSubmission(req.body);
  res.render(`received.html`, { result });
});
```

## What if you change your model at some point?

![A chat about what happens when you change a model](changes.svg)

There are lots of validation libraries, there are fewer "persistently valid" model libraries, and there are no model libraries that treat model changes as a continuous fact of dev life. Well, no, there's one: this one.

If you work with models that you save (to file, or database, or some web store like Firebase), then this library can work with that to make sure that your models are backed by schemas, and detect when you've changed your models by looking at "the current model's schema" vs. "the one that previously stored". If there's a mismatch, it'll flag this for you, create a new schema that reflects your new model layout, and generate a `model.v1.to.v2.js` file that you can run in order to uplift all your preexisting data so that it's fully conformant to your new model.

Did you move a property one level lower, or higher? Did you rename a key to something better? Did you delete some parts that are you longer needed? None of these things should require you to manually go in and update all your data, whether that's with a quick script your wrote, or a well crafted bit of SQL. Your tooling should do that for you.

So this does.


# Topics for this library

- defining models
    - class definitions
    - custom validation
        - false for simple validation failure
        - throw an error for detailed validation failure
- constructing models
    - create default
    - create default even though that means missing required fields (allowIncomplete)
    - create from data
    - create from data even if it's missing required fields
    - loading from a store
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
- redefining models
    - using a data store
    - schema change detection
    - data migrations


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

## Field types

## Saving and loading

## Dealing with model changes

