package backend

// Predicates and types.
const (
	typeObject          = "Object"
	predicateObjectType = "Object.type"

	typePeer = "Peer"

	typeHead               = "Head"      // head of the peer's patch log for an object.
	predicateHeadData      = "Head.data" // binary serialized patch head data.
	predicateHeadPeerUID   = "Head.peerUID"
	predicateHeadObjectUID = "Head.objectUID"
)
