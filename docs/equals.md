# Equals - the function that should have been part of the JS spec from day one

Never understood why there is no official `equals()` in JS, that you can use to compare arbitrarily deeply nested objects to eachother? Me neither, so I wrote this one. It's API is obviously the only possible API:

```js
const same = equals(thing1, thing2);
```

However, it's a little more encompassing than most other `equals` you may find.

## "How strict should this equal be?"

Sure, `{a: "1"}` and `{a: 1}` are not the same, but depending on what you need to do, they kind of are, so you can specify a third argument that tells the function to either perform strict (the default) or coercive equality:

```js
const o1 = { a: "1" };
const o2 = { a: 1 };

console.log(
  equals(o1, o2),
  equals(o1, o2, true),
  equals(o1, o2, false),
);

// false, false, true
```

In the same vein, while `a="a"` and `a = new String("a")` aren't "actually" the same, in terms of code handling they almost always are, and the fact that the latter is technically an object is irrelevant: _your code_ can't tell the difference between them when _using_ these values, so in non-strict mode, they're considered equal.


## "Not all objects are objects"

Traditional `equals` implementations operate on the assumption that if something isn't a primitive value, and it's not an array, then it's an Object. Which isn't wrong, but is also not useful in modern JS.

This `equals` has four different evaluations:

- primitive equality (for bools, numbers, strings, and symbols)
- array equality (for, unsurprisingly, arrays)
- iterable equality (i.e. NodeList, HTMLCollection, Set, Map, etc.)
- object equality

That is, we don't perform key/value analysis unless all three categories above it don't apply.


## "Not all differences are differences"

When testing equality, you want to know whether _your code_ is going to see a difference, not whether "well actually" there is a difference. As such, object key ordering gets ignored: `{a: 1, b: 2}` and `{b: 2, a: 1}` are the same object, even if `Object.keys(o1)` and `Object.keys(o2)` _are not_ the same arrays.

Finally, object properties that are `undefined` are considered the same as object properties that simply don't exist because, again, _your code can't tell the different_: `{a: 1, b: undefined}` is the same as `{a: 1}` (because `o1.b` is identical to `o2.b` when evaluated by any JS engine), even though `Object.keys(o1)` and `Object.keys(o2)` _are not_ the same arrays.
