# Documentation for this library

- defining models

  - class definitions
  - field types and options
  - custom validation
    - false for simple validation failure
    - throw an error for detailed validation failure

- constructing models

  - create default
    - create default with required fields missing (`Model.ALLOW_INCOMPLETE`)
  - create from data
    - create from data with required fields missing

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

  - `await`ing all Model.create() / Model.from() calls
  - saving models to the store
  - loading models from the store
  - deleting models from the store
  - updating your model definitions
    - schema change detection
    - data migrations

- utilities

  - (coercing) deep `equals()`
  - JS object diffing
