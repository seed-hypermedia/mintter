
# Terra Versions

A Version is a snapshot of a Document state, as defined by one DocumentChange. The referenced Change usually refers to one or more "dependency" Changes, which leads to a whole history graph (technically a DAG) of Changes.

## Document Changes

.. link to doc changes

## Document Version

By combining the history of all changes, the current Version of a Document can be generated.

You can learn [the stucture of a Document](./terra-documents) once it has been assembed from the Changes.

## Creating Versions

A version is created by producing a DocumentChange blob and storing it in IPFS.

The CID of the DocumentChange is the Version ID, and it can now be distributed through IPFS. You may use Aqua or Aer to tell your peers about the new change.