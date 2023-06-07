# Terra Change Patches

Terra Entities introduce a simple and versatile patch format for JSON-like data.

This is a "CRDT" (Conflict-Free Replicated Data Type), which helps enable merging of data without conflicts.

## Ordering Patches

HLC is necessary so that an arbitrary set of changes have a deterministic patch order

Once you have a stable way to order patches, you can follow a simple procedure for each patch to arrive at the current entity value

## Replace-First

All strings, booleans, and numbers are replaced when 

```
Before: "simple value"
Patch: "this is the new value"
After: "this is the new value"
```

Even for maps and lists, each value will **replace** the previous value, unless you use one of the Special Tagged Maps, to patch map and list values instead of replacing them.

```
Before: ['Banana']
Patch: ['Orange']
After: ['Orange']
```

```
Before: { name: 'Claire', age: 9 }
Patch: { name: 'Oliver', age: 5 }
After: { name: 'Oliver', age: 5 }
```


## Special Patch Tags

The following are reserved keywords inside objects, and are used to designate additional patch behavior.

- `#map` - MapPatch
- `#list` - ListPatch


### Tagged `#map` Patches

Map patches can be used to overwrite only the specified keys, rather than replacing the whole object.

```
Before: { name: 'Claire', age: 9 }
Patch: { '#map': { age: 10 } }
After: { name: 'Claire', age: 10 }
```


#### Tagged `#list` Patches

> Todo: What is the actual behavior here? This is just speculative:

```
Before: [ 'Claire' ]
Patch: { '#list': { '#ins': 'Oliver' } }
After: [ 'Claire', 'Oliver' ]
```


## Open Questions

- How to remove a value?
- Can a value be set to null?
- What is `#rga`?

### References

- crd2/map.go