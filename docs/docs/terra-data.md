# Terra Data

HyperDocs builds upon the IPFS network to save and share data between peers. Each chunk/file/object is called a "Blob"

IPFS supports "permanent" content because Blobs are "immutable" – they cannot be changed. A blob in IPFS is never modified, and it can only be deleted if everbody decides to delete it.

We use use "Content IDs" or "CIDs" to uniquely identify each piece of content. A Content ID is a cryptographc digest of the content, so it cannot be guessed by your peers.



# Terra Blobs

Logical content Blobs are encoded as IPLD/CBOR-JSON, and they include a "type" string. The following is an example "type" value of a Terra KeyDelegation blob:

```
HyperDocs:KeyDelegation
```

The "type" field can be split on `:`, into the following namespace:

- `HyperDocs` - Hardcoded Protocol Name
- `TERRA_BLOB_TYPE` - The purpose of this blob. One of:
    - `Change`
    - `KeyDelegation`



## Example

An example Terra data Blob has this CID: TODO, insert CID

This Blob includes the following data, (with the JSON_CBOR encoding):

```
{
    "type": "seed:KeyDelegation",
    ...
```

See the data on the IPFS gateway: https://ipfs.io/ipfs/TODO_CID

# IPFS Blobs

We may store raw data in IPFS, such as images, videos, or other files.

These are normal IPFS blobs, and we will refer to them by their CID.