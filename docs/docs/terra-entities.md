# Terra Entities

Entities are mutable HyperDocs objects, with an authenticated and verifiable version history, saved as [Terra Data](./terra-data.md).

### Entity ID

An Entity ID is a random and unique identifier, created with the following function:

`nanoid.CustomASCII("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 22)`

todo human eplanation

### Changes

A change is [Terra Data](./terra-data) which descibes the creation or modification of an Entity.

### Change Dependencies

A change may refer to other change(s), which describe the previous version of the Entity

To create an Entity, a new Entity ID is generated, and a Change Blob is created with the initial data. The "deps" array is empty for new Entities.

### Entity Forking

When a Change has one or more dependencies, but has a new Entity ID

### Change Authentication

Every Change Blob has three fields which can securely track psuedonomomous identies who create content.

- Account ID - ID for the account, a long-term key that the user keeps safe
- Signing ID - ID for the device key that is used to sign this Change
- Signature

Changes are ignored by peers if the signature is invalid, or if the Signing ID is not valid for this account ID. This may happen if a valid KeyDelegation blob cannot be found for this ID combination.


### Entity Version

A version is a set of one or more changes. The order is not important.


### Conflict Resolution

for fucks's sake


### Changes Format

```
{
    "type": "HyperDocs:Change",
    "entity type": '''
    "id": ENTITY_ID,
    account id
    device id
    signature
    changes Patch[]
}
```

### EntPatch Format

Each Entity patch bla bla bla.. replaces the whole thing...

- `#map` - MapPatch
- `#list` - ListPatch
- `#rga` - what is this idk

#### MapPatch

`#ins`

#### ListPatch

`#ins`

## Entity Change Example

Here is an example Change object, which sets the title of a document:

```
{
    "type": "HyperDocs:Change",
    "entity type": 'mintter:document',
    "id": ENTITY_ID,
}
```