package p2p

import (
	"context"
	"fmt"

	v2 "mintter/backend/api/v2"
	"mintter/backend/document"
	"mintter/backend/identity"

	"go.uber.org/zap"
)

// SyncDocuments from another peer.
func (n *Node) SyncDocuments(ctx context.Context, pid identity.ProfileID) error {
	conn, err := n.dialProfile(ctx, pid)
	if err != nil {
		return err
	}

	resp, err := v2.NewDocumentsClient(conn).ListDocuments(ctx, &v2.ListDocumentsRequest{
		Author:          pid.String(),
		PublishingState: v2.PublishingState_PUBLISHED,
	})
	if err != nil {
		return fmt.Errorf("failed to call ListDocuments: %w", err)
	}

	for _, doc := range resp.Documents {
		if _, err := n.docsrv.GetDocument(document.AdminContext(ctx), &v2.GetDocumentRequest{
			Version: doc.Version,
		}); err != nil {
			n.log.Error("FailedToSyncDocument",
				zap.String("cid", doc.Version),
				zap.String("remotePeer", pid.String()),
			)
			continue
		}
	}

	return nil
}
