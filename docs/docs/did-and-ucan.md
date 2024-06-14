# Why Hyper Media Does Not Use DID or UCAN

People often ask us whether we use some of the emerging specifications related to our work, such as [DID](https://www.w3.org/TR/did-core/) and [UCAN](https://ucan.xyz). This document aims to explain why we are not *currently* using them.

Seed Hyper Media started in 2019. When we were working on our multi-device identity approach, DID specification was just starting to take form, and UCAN specification didn't exist yet. We briefly described our Identity system in our [IPFS Camp 2022 talk](https://youtu.be/UaK5HRnyCEY?t=388).

One of the main properties we wanted to achieve for our identity system is to support multiple devices without having to share and permanently store any private key materials on all of them. We were not aware of any existing solution with these properties, so we had to come up with something ourselves. We took inspiration from things like [Object-Capability Model](https://en.wikipedia.org/wiki/Object-capability_model), [Macaroon Credentials](https://research.google/pubs/pub41892/), [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki), [SLIP-10](https://github.com/satoshilabs/slips/blob/master/slip-0010.md), [Ed25519](https://ed25519.cr.yp.to), and others.

Since we heavily rely on the ecosystem around [IPFS](https://ipfs.tech), we ended up using their [CIDs](https://docs.ipfs.tech/concepts/content-addressing/) for all the identifiers that we have. CIDs are self-describing and seem to be flexible enough for what we need. We, of course, use CIDs for content-addressable data that we store on IPFS, but we also use them for representing our Account and Device IDs (which are essentially public keys), using the existing [multicodecs](https://github.com/multiformats/multicodec/blob/master/table.csv), and inline [identity hash](https://en.wikipedia.org/wiki/Hash_function#Identity_hash_function).

When DID and UCAN specs were finally released, we looked at them, and realized, that at some point, when and if required, we could provide some compatibility layer between our identity mechanism and these specifications, because we are based on the same primitives, mainly public-key cryptography. We are a small team, and we didn't have the bandwidth to fully understand the implications of these specs, and see how to fit them into our system. Beyond that, some points concerned us and made us not adopt them for the moment.

We couldn't find an official binary representation for DID and UCAN. Since we're using CBOR everywhere, it felt a bit weird having to use some specific base encoding for binary data, when we have native byte representation inside CBOR.

We could totally expose our Account IDs as DIDs, with a Hypermedia-specific DID method, such as `did:hypermedia:<hypermedia-account-id>`. But, to be fair, it seems like that would be helpful to no one. You still can't resolve this DID to a DID Document, without knowing and implementing the Hypermedia-specific protocol for finding and assembling the data representing the information behind this identifier. Just exposing the ID in some specific format doesn't seem enough to achieve the desired interoperability with other systems.

We could not accept other existing DIDs to become Hypermedia Account IDs either. Because that would mean, having to implement the resolution procedure for each specific DID method, which often means depending on some online service, or a blockchain, which goes a little bit against the [local-first](https://www.inkandswitch.com/local-first/) vision we wanted to achieve for our app.

We still can be interoperable with many other systems that use BIP-39 spec. If you have a cryptographic seed encoded in mnemonic words with BIP-39, you can use it as your Hyper Media Account, and we would derive a separate key specifically for Hyper Media from that seed, using SLIP-10 spec.

It seems like DID is often perceived as something more "magical" than it really is. It of course can be helpful to unify the representation of an identifier or a programming interface for resolving identifiers to documents, but it still requires bespoke implementations for all the different DID Methods.

Often people talk about DID as **THE** specification for "Decentralized *Identity*" when in reality the spec talks about "Decentralized *Identifiers*", explicitly saying that these identifiers could represent any kind of resource. But most projects that adopted DIDs, for some reason, only use them for their Identity system and have some other type of identifier for other resources.

As for UCAN, it's worth mentioning that the main use case for Hyper Media is public information. We don't have requirements for authentication and authorization at the moment, so we haven't really felt the need to adopt UCAN.

On the other hand, we found out that there was existing work from W3C about [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) and [Authorization Capabilities](https://w3c-ccg.github.io/zcap-spec/) which seem to have overlapping goals with UCAN. All of these specs are quite complex, and still not mature enough to blindly adopt them without a clear understanding, especially for a product like ours that is meant to produce "permanent" and immutable information.

We *do* believe in interoperability, and we would love to be based on the existing standards as much as we can. But sometimes, we need to prioritize moving forward and getting things done, before adopting some specifications without a clear understanding of tangible benefits.
