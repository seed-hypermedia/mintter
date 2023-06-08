# Terra Entities

Entities are mutable HyperDocs objects, with an authenticated and verifiable version history, saved as [Terra Data](./terra-data.md).

### Entity ID

On the most abstract level, an Entity ID is defined as an arbitrary string. Depending on the type of an Entity and its purpose, the Entity ID could have some conventions or a more specific format, e.g. Entity ID could include the type/kind of an Entity.

Entity ID is assumed to be globally unique.

### Changes

A Change is a [Terra Data](./terra-data) blob that describes the creation or modification of an Entity.

### Change Dependencies

The state of an Entity is represented as a set of Changes.

Each Change is immutable and content-addressable.

A Change can depend on other Change(s) with [hash-linking](https://ipld.io/docs/data-model/kinds/#link-kind), which expresses the causal relationship between Changes. The Changes form a DAG, similar to how Git Commits form a DAG. Given a DAG of Changes, each user can "replay" those Changes and apply them locally to get the state of an Entity.

This approach is similar to what is often called [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html), or [State Machine Replication](https://en.wikipedia.org/wiki/State_machine_replication).

To create an Entity, a new Entity ID is generated, and a Change blob is created with the initial data. This initial Change has no dependencies.

### Change Authentication

Each Change is cryptographically signed by the device key of a [Terra Identity](./terra-identity).

### Entity Version

Because the state of an Entity is a set of Changes, and because those Changes form a DAG, we can express any given Version of an Entity by specifying a leaf (HEAD in Git terms) Change ID and walking back the dependency link to resolve the full DAG.

A Version could be a single Change ID or multiple Change IDs concatenated with a `.`. 

### Terra Patch

In theory, one could put any kind of information inside of a Change, but because Changes can be created independently by each user without any coordination, we define the state of an Entity to be a [CRDT](https://crdt.tech), so that Changes can be applied without generating pesky conflicts that users would have to solve manually.

Hence the body of a Terra Change is defined as a special [Patch](./terra-patches) format described in a separate document.

### Changes Format

As with any other Terra Blobs, a Change is encoded as a DAG-CBOR structure, and it contains the following fields:

 | **field**  | **type** | **description**                                                                                            |
|------------|----------|------------------------------------------------------------------------------------------------------------|
| @type      | string   | Constant string "hyperdocs:Change".                                                                        |
| entity     | string   | Entity ID the Change is applied to.                                                                        |
| deps       | []CID    | The list of CIDs of dependencies to this Change.                                                           |
| message    | string   | An optional human-readable description of a Change.                                                        |
| hlcTime    | int64    | A [Hybrid-Logical-Clock](https://martinfowler.com/articles/patterns-of-distributed-systems/hybrid-clock.html) timestamp of a Change.                                                              |
| patch      | map      | Terra Merge Patch.                                                                                         |
| signer     | bytes    | The public key which signs the Change.                                                                     |
| delegation | CID      | The CID of the KeyDelegation blob that identifies the Account ID on behalf of which the Change is created. |
| sig        | bytes    | The bytes for a cryptographic signature of the canonical encoding of the rest of the fields.               |

