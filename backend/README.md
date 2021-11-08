# REFACTOR IN PROGRESS

WARNING: Now that some boundaries between things are more clear, this giant mess is being gradually refactored. Things will break, and until the refactor is finished there will be a lot of inconsistencies in terms of conventions, and what not.

In short: we're switching from Badger to SQLite, and separating some of the code into their own packages.

## TODO

- [x] Vendor SQLite and statically compile transitive clojure extension.
- [ ] Implement IPFS Blockstore interface on top of SQLite. Override put method for BitSwap so we can control additions.
- [ ] Play around with the idea of Resource Manifest as a permanode-like ID for all the objects.
- [ ] Isolate features with clear boundaries
  - [ ] Registration
  - [ ] Change management.
- [ ] s/Patch/Change.
