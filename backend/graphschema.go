package backend

import "mintter/backend/badgergraph"

const (
	typeHead    = "Head" // head of the peer's patch log for an object.
	typeObject  = "Object"
	typeAccount = "Account"
	typePeer    = "Peer"
)

var graphSchema = badgergraph.NewSchema()

func init() {
	graphSchema.RegisterType(typeHead)
	graphSchema.RegisterType(typeObject)
	graphSchema.RegisterType(typeAccount)
	graphSchema.RegisterType(typePeer)
}

var (
	pAccountPeer = graphSchema.RegisterPredicate(typeAccount, badgergraph.Predicate{
		Name:     "peer",
		HasIndex: true,
		Type:     badgergraph.ValueTypeUID,
		IsList:   true,
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
