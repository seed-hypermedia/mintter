package backend

import "mintter/backend/badgergraph"

const (
	typeCID  = "CID"
	typeHead = "Head" // head of the peer's patch log for an object.
)

var graphSchema = badgergraph.NewSchema()

var (
	// Encodes multicodec of the cid in its text form.
	pCIDCodec = graphSchema.RegisterPredicate(typeCID, badgergraph.Predicate{
		Name:     "codec",
		HasIndex: true,
		Type:     badgergraph.ValueTypeString,
	})

	pHeadData = graphSchema.RegisterPredicate(typeHead, badgergraph.Predicate{
		Name:     "data",
		HasIndex: false,
		Type:     badgergraph.ValueTypeProto,
	})
	pHeadPeer = graphSchema.RegisterPredicate(typeHead, badgergraph.Predicate{
		Name:     "peer",
		HasIndex: true,
		Type:     badgergraph.ValueTypeUID,
	})
	pHeadObject = graphSchema.RegisterPredicate(typeHead, badgergraph.Predicate{
		Name:     "object",
		HasIndex: true,
		Type:     badgergraph.ValueTypeUID,
	})
)
