# HyperDocs Aqua - Content Gossip

> Note: The Aqua protocol is a WORK IN PROGRESS. This document is a stub, and the Mintter team is experimenting with Aqua in the Mintter App and self-hostable Mintter Sites

Aqua is the protocol between peers in the Mintter network. It uses a gRPC protocol for type-safe communication over libp2p which is used to connect peers. Breaking changes are minimized with gRPC; incompatible behavior may be introduced by adding new endpoints and deprecating old ones.
