# Documentation for this library

(Jump to [the API documentation](api.md) if you just want to look up class names and function signatures.)

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
