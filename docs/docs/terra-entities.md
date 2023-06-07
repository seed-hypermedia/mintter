# Terra Entities

Entities are mutable HyperDocs objects, with an authenticated and verifiable version history, saved as [Terra Data](./terra-data.md).

### Entity ID

An Entity ID is a random and unique identifier, created with the following function:

`nanoid.CustomASCII("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 22)`

todo human eplanation

### Changes

A change is [Terra Data](./terra-data) blob which describes the creation or modification of an Entity.

### Change Dependencies

A change may refer to other change(s), which describe the previous version of the Entity. Change Dependencies are merged together before the Patch is applied.

To create an Entity, a new Entity ID is generated, and a Change Blob is created with the initial data. The "deps" array is empty for new Entities.

### Entity Forking

When a Change has one or more dependencies, but has a new Entity ID

### Change Authentication

The author of each change is securely identified with the [Terra Identity system](./terra-identity). 

Every Change Blob has three fields which can securely track psuedonomomous identies who create content.

- `Signer` - the Account ID of the author
- `Delegation` - the CID of the KeyDelegation blob
- `Sig` - The signature over the rest of the fields


Changes are ignored by peers if the signature or delegation is invalid for the Signer.


### Entity Version

A Version of an Entity is a set of one or more Changes that can be merged into a single representation.

The order of these changes is not important. One set of changes, in any order, is equivalent to the same version.


### Entity Value Patches

A [Terra Entity Patch](./terra-patches) is be provided to describe how the entity value changes.


### Changes Format

```
type Change = {

	Type: 'HyperDocs:Change'

    // ID of the Entity to change
	// Entity: "HyperDocs:Document:123"
	Entity: string

	// Deps is a list of dependency patches.
	Deps: CID[]

	// Message is an optional human readable message.
	Message?: string

	// HLCTime is the Hybrid-Logical timestamp.
	// Must be greater than the one of any of the deps.
	// Can be used as a Unix timestamp in *microseconds*.
	HLCTime: number

	// Patch is the body of our Merge Patch CRDT.
	Patch: Patch
    
	// Signer is the public key of the signer.
	Signer: string

	// Delegation points to the blob where we can get the Account ID
	// on which behalf this blob is signed.
	Delegation: CID

	// Sig is the signature over the rest of the fields.
	Sig: Buffer

}
```
