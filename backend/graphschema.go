package backend

import "mintter/backend/badgergraph"

const (
	typeHead    = "Head" // head of the peer's patch log for an object.
	typeObject  = "Object"
	typeAccount = "Account"
	typePeer    = "Peer"

	typeDocument = "Document"
)

var graphSchema = badgergraph.NewSchema()

func init() {
	graphSchema.RegisterType(typeHead)
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

	pObjectType = graphSchema.RegisterPredicate(typeObject, badgergraph.Predicate{
		Name:     "type",
		HasIndex: true,
		Type:     badgergraph.ValueTypeString,
	})

	pDocumentTitle = graphSchema.RegisterPredicate(typeDocument, badgergraph.Predicate{
		Name:     "title",
		HasIndex: false,
		Type:     badgergraph.ValueTypeString,
	})
	pDocumentSubtitle = graphSchema.RegisterPredicate(typeDocument, badgergraph.Predicate{
		Name:     "subtitle",
		HasIndex: false,
		Type:     badgergraph.ValueTypeString,
	})
	pDocumentCreateTime = graphSchema.RegisterPredicate(typeDocument, badgergraph.Predicate{
		Name:     "createTime",
		HasIndex: true,
		Type:     badgergraph.ValueTypeTime, // TODO: introduce Time value type to store it natively.
	})
	pDocumentUpdateTime = graphSchema.RegisterPredicate(typeDocument, badgergraph.Predicate{
		Name:     "updateTime",
		HasIndex: true,
		Type:     badgergraph.ValueTypeTime,
	})
	pDocumentPublishTime = graphSchema.RegisterPredicate(typeDocument, badgergraph.Predicate{
		Name:     "publishTime",
		HasIndex: true,
		Type:     badgergraph.ValueTypeTime,
	})
	pDocumentAuthor = graphSchema.RegisterPredicate(typeDocument, badgergraph.Predicate{
		Name:     "author", // Relation to the Account.
		HasIndex: true,
		Type:     badgergraph.ValueTypeUID,
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
