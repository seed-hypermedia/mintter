
# MintterNet

The MintterNet protocol is initially designed by the Mintter team but is ultimately defined by community consensus.

Changes to MintterNet are proposed and ratified through the [MintterNet Improvement Protocol](./mip)


## [Terra](./mintternet-terra) - Permanent Semantic Data

Terra is the format of semantic permanent data stored in IPFS. Introducing the following concepts:

- [Accounts and Signing](./terra-signing) - what are accounts and devices, how content is signed
- [Documents](./terra-documents) - The structure of the document and blocks
- [Versions](./terra-versions) - How document changes work
- [Links and Citations](./terra-links) - How do links work: the `mintter://` URL format

Now that you have an understanding, look at the detailed technical 

HyperMedia Blob Reference:

- DeviceAuthorize and DeviceRevoke
- DocumentChange
- BlockNode
- Conversation and ConversationComment

## [Aqua](./mintternet-aqua) - Search and Link Sharing

Aqua is the GRPC over p2p protocol between peers in the Mintter network


## [Aer](./mintternet-aer) - Web Bridging Customs

Aer allows web sites to join the MintterNet, exposing Mintter links and/or IPFS references over HTTPS+HTML