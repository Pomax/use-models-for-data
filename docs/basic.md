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
        recordname: (record) => record.name,
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
