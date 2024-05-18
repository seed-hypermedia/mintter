// This is an experiment for definiting our blob types in a more formal,
// portable way using the Cue language: https://cuelang.org.
// Work in progress. You probably should just ignore this file.

package terra

// Principal is a binary representation of a public key
// specifying the type of the key. See more in `backend/core/principal.go`.
#Principal: bytes

// TimeUnix is a Unix timestamp in seconds.
// Even though normally they can be negative to indicate a timestamp before the beginning of the Unix epoch,
// in our system it wouldn't make sense, because our app was released around 2023.
#TimeUnix: int64 & >0

// TimeMicro is a Unix timestamp in microseconds.
// The higher granularity is useful for CRDT conflict resolution.
// This is in fact a Hybrid-Logical Clock (HLC) timestamp.
#TimeMicro: int64 & >0

// Signature is a raw bytes of a asymmetric cryptographic signature.
#Signature: bytes

// CID is a binary representation of an IPFS content identifier.
#CID: bytes

// IRI is a Hypermedia resource identifier.
// https://en.wikipedia.org/wiki/Internationalized_Resource_Identifier.
#IRI: string

// SignedBlob is any struct that has a cryptographic signature.
// Our way of signing blobs is not the most efficient, but it's simple and easy to implement in most programming languages.
// It requires serializing the structure twice, once without the signature field, to obtain the bytes to sign, and then
// with the signature field itself to complete the entire structure.
#SignedBlob: {
	...
	sig: #Signature
}

// TypedBlob is a struct that has a type specified.
// All the blobs we create have this type, so they are easy to identify and process.
#TypedBlob: {
	"@type": string
	...
}

// BaseBlob represents the base structure of all the blobs we create.
// They are all signed and typed.
#BaseBlob: #TypedBlob & #SignedBlob

// KeyDelegation is a blob that allows one public key (delegate) act on behalf of another key (issuer).
#KeyDelegation: #BaseBlob & {
	"@type":   "KeyDelegation"
	issuer:    #Principal
	delegate:  #Principal
	issueTime: #TimeUnix
	purpose:   "DeviceRegistration"
}

// BaseChange is a common structure of all the Change blobs we produce.
// Changes describe mutations of our CRDT Entities.
#BaseChange: #BaseBlob & {
	"@type": "Change"
	deps: [#CID]
	delegation: #CID
	action:     "Create" | "Update"
	message?:   string
	hlcTime:    #TimeMicro
	entity:     #IRI
	patch: {}
	signer: #Principal
}
