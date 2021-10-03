# Use Models For Data (dot JS)

<div style="width:30em; margin: auto; display: flex; flex-direction: column;">
<p style="align-self: flex-start; display: inline-block; background: #34F; color: white; font-weight:bold; padding: 0.5em 1em; border-radius: 0.5em; max-width: 24em;">
Just remember to always validate your data. 🔥🔥🔥
</p>
<p style="align-self: flex-end; display: inline-block; background: #34F; color: white; font-weight:bold; padding: 0.5em 1em; border-radius: 0.5em; max-width: 24em;">
Why? I use models for data. My data is always valid.
</p>
<p style="align-self: flex-start; display: inline-block; background: #34F; color: white; font-weight:bold; padding: 0.5em 1em; border-radius: 0.5em; max-width: 24em;">
I mean user-submitted data. ⚠️👀
</p>
<p style="align-self: flex-end; display: inline-block; background: #34F; color: white; font-weight:bold; padding: 0.5em 1em; border-radius: 0.5em; max-width: 24em;">
And I mean *all* my data. All my data is always valid, by definition.
</p>
<p style="align-self: flex-start; display: inline-block; background: #34F; color: white; font-weight:bold; padding: 0.5em 1em; border-radius: 0.5em; max-width: 24em;">
... tell me more?
</p>
</div>

1. Define a model to work with, using straight-forward modern JS syntax.

```js
class MyModel extends Model {
    __meta = {
        name: `mymodel`,
        description: `My model, which is going to be consistent by definition.`,
    };

    name = Fields.string({ required: true });
    age = Fields.number({ validate: value => (value > 13) )});
}
```

2. You are done, model instances are by definition always consistent and valid, with invalid assignments automatically getting rejected. No weird syntax, no tricks, you say `data.value = x` and if that `x` is invalid, the assignment throw an error.

```js
const plainData = {
    name: `my name here!`
};

// let's lock in some data integrity:
const modeled = MyModel.from(plainData);

try {
    modeled.age = 12;
} catch (e) {
    console.log(`Guess I'm not allowed to be 12`);
}
```


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

