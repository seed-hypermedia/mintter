package backend

import (
	"mintter/backend/ipfsutil"

	blocks "github.com/ipfs/go-block-format"
	"github.com/ipfs/go-cid"
	cbornode "github.com/ipfs/go-ipld-cbor"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/peer"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
)

type signedPatch struct {
	Patch

	blk       blocks.Block
	k         crypto.PubKey
	peer      cid.Cid
	cid       cid.Cid
	signature []byte
}

func (sp signedPatch) ProtoBody() (proto.Message, error) {
	msgType, err := protoregistry.GlobalTypes.FindMessageByName(protoreflect.FullName(sp.Kind))
	if err != nil {
		return nil, err
	}

	msg := msgType.New().Interface()
	return msg, proto.Unmarshal(sp.Body, msg)
}

func signPatch(p Patch, k crypto.PrivKey) (signedPatch, error) {
	signed, err := SignCBOR(p, k)
	if err != nil {
		return signedPatch{}, err
	}

	blk, err := ipfsutil.NewBlock(signed.data)
	if err != nil {
		return signedPatch{}, err
	}

	pid, err := peer.IDFromPublicKey(signed.pubKey)
	if err != nil {
		return signedPatch{}, err
	}

	return signedPatch{
		Patch:     p,
		blk:       blk,
		peer:      peer.ToCid(pid),
		k:         signed.pubKey,
		cid:       blk.Cid(),
		signature: signed.signature,
	}, nil
}

// TODO: improve redundancy in this function. Make optionally skip verification.
func decodePatchBlock(blk blocks.Block) (signedPatch, error) {
	verified, err := SignedCBOR(blk.RawData()).Verify()
	if err != nil {
		return signedPatch{}, err
	}

	pid, err := peer.IDFromPublicKey(verified.PubKey)
	if err != nil {
		return signedPatch{}, err
	}

	signed := signedPatch{
		blk:       blk,
		peer:      peer.ToCid(pid),
		k:         verified.PubKey,
		cid:       blk.Cid(),
		signature: verified.Signature,
	}

	if err := cbornode.DecodeInto(verified.Payload, &signed.Patch); err != nil {
		return signedPatch{}, err
	}

	return signed, nil
}
