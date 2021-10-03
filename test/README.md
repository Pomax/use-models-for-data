
- add diff tests
- add equals tests?
- add schema tests

### Testing quirks

Due to dynamic imports, Jest tests cannot run "as a single suite" based on a target dir.
Instead, every test has its own npm script, with `npm-run-all` being used to run them sequentially.
See https://github.com/facebook/jest/issues/11438#issuecomment-923835189 for more details

