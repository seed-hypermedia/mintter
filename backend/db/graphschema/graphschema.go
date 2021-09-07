// Package graphschema hold schema for the internal data graph.
package graphschema

import "mintter/backend/badgergraph"

var schema = badgergraph.NewSchema()

// Schema returns the global schema instance.
func Schema() *badgergraph.SchemaRegistry {
	return schema
}

var (
	PredAccountPeer = badgergraph.Predicate{
		Name:     "account/peer",
		HasIndex: true,
		Type:     badgergraph.ValueTypeUID,
		IsList:   true,
	}
)

var (
	PredObjectType = badgergraph.Predicate{
		Name:     "object/type",
		HasIndex: true,
		Type:     badgergraph.ValueTypeString,
	}
)

var (
	PredDocumentTitle = badgergraph.Predicate{
		Name:     "document/title",
		HasIndex: false,
		Type:     badgergraph.ValueTypeString,
	}
	PredDocumentSubtitle = badgergraph.Predicate{
		Name:     "document/subtitle",
		HasIndex: false,
		Type:     badgergraph.ValueTypeString,
	}
	PredDocumentCreateTime = badgergraph.Predicate{
		Name:     "document/createTime",
		HasIndex: true,
		Type:     badgergraph.ValueTypeTime, // TODO: introduce Time value type to store it natively.
	}
	PredDocumentUpdateTime = badgergraph.Predicate{
		Name:     "document/updateTime",
		HasIndex: true,
		Type:     badgergraph.ValueTypeTime,
	}
	PredDocumentPublishTime = badgergraph.Predicate{
		Name:     "document/publishTime",
		HasIndex: true,
		Type:     badgergraph.ValueTypeTime,
	}
	PredDocumentAuthor = badgergraph.Predicate{
		Name:     "document/author", // Relation to the Account.
		HasIndex: true,
		Type:     badgergraph.ValueTypeUID,
	}
)

var (
	PredHeadData = badgergraph.Predicate{
		Name:     "head/data",
		HasIndex: false,
		Type:     badgergraph.ValueTypeProto,
	}
	PredHeadPeer = badgergraph.Predicate{
		Name:     "head/peer",
		HasIndex: true,
		Type:     badgergraph.ValueTypeUID,
	}
	PredHeadObject = badgergraph.Predicate{
		Name:     "head/object",
		HasIndex: true,
		Type:     badgergraph.ValueTypeUID,
	}
)

var (
	TypeAccount = schema.Register("Account", PredAccountPeer)
	TypePeer    = schema.Register("Peer")
	TypeObject  = schema.Register("Object", PredObjectType)
	TypeDraft   = schema.Register("Draft",
		PredDocumentAuthor,
		PredDocumentTitle,
		PredDocumentSubtitle,
		PredDocumentCreateTime,
		PredDocumentUpdateTime,
	)
	TypePublication = schema.Register("Publication",
		PredDocumentAuthor,
		PredDocumentTitle,
		PredDocumentSubtitle,
		PredDocumentCreateTime,
		PredDocumentUpdateTime,
		PredDocumentPublishTime,
	)
	TypeHead = schema.Register("Head",
		PredHeadData,
		PredHeadPeer,
		PredHeadObject,
	)
)
