
# HyperDocs Terra

Permanent Content "baked" into IPFS

## Upgrade Workflow

This is a WIP document on HyperDocs Terra v1

We may release minor versions that specify additional Blob types, so if your "v1" peer software sees "v1.1" content, it should be prepared to see new blob concepts, new block types, or new document change types.

This document may change to introduce major versions of Terra blobs (eg Terra "v2"), so your peer software should ignore content that is from a future major version, as it may break or confuse users.



## Terra Concepts

### [Data](./terra-data)

Explain relationship between Mintter + IPFS, (IPNS?), CIDs, codec, IPLD.

How we treat arbitrary IPFS data? How will we handle upgrades to the terra blobs in the future?

How do IDs work?

### [Accounts and Signing](./terra-signing)

what are accounts and devices, how content is signed


### [Documents](./terra-documents)

The structure of the document

### [Versions](./terra-versions)

How document changes work

### [Blocks](./terra-blocks)

Introduction to the block types

### [Links and Citations](./terra-links)

How do links work: the `mintter://` URL format





## HyperMedia Blob References

- DeviceAuthorize and DeviceRevoke
- DocumentChange
- BlockNode
- Conversation and ConversationComment



