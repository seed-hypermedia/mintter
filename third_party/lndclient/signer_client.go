package lndclient

import (
	"context"
	"time"

	"github.com/btcsuite/btcd/btcec"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
	"github.com/lightningnetwork/lnd/input"
	"github.com/lightningnetwork/lnd/keychain"
	"github.com/lightningnetwork/lnd/lnrpc/signrpc"
	"google.golang.org/grpc"
)

// SignerClient exposes sign functionality.
type SignerClient interface {
	SignOutputRaw(ctx context.Context, tx *wire.MsgTx,
		signDescriptors []*SignDescriptor) ([][]byte, error)

	// ComputeInputScript generates the proper input script for P2WPKH
	// output and NP2WPKH outputs. This method only requires that the
	// `Output`, `HashType`, `SigHashes` and `InputIndex` fields are
	// populated within the sign descriptors.
	ComputeInputScript(ctx context.Context, tx *wire.MsgTx,
		signDescriptors []*SignDescriptor) ([]*input.Script, error)

	// SignMessage signs a message with the key specified in the key
	// locator. The returned signature is fixed-size LN wire format encoded.
	SignMessage(ctx context.Context, msg []byte,
		locator keychain.KeyLocator) ([]byte, error)

	// VerifyMessage verifies a signature over a message using the public
	// key provided. The signature must be fixed-size LN wire format
	// encoded.
	VerifyMessage(ctx context.Context, msg, sig []byte, pubkey [33]byte) (
		bool, error)

	// DeriveSharedKey returns a shared secret key by performing
	// Diffie-Hellman key derivation between the ephemeral public key and
	// the key specified by the key locator (or the node's identity private
	// key if no key locator is specified):
	//
	//     P_shared = privKeyNode * ephemeralPubkey
	//
	// The resulting shared public key is serialized in the compressed
	// format and hashed with SHA256, resulting in a final key length of 256
	// bits.
	DeriveSharedKey(ctx context.Context, ephemeralPubKey *btcec.PublicKey,
		keyLocator *keychain.KeyLocator) ([32]byte, error)
}

// SignDescriptor houses the necessary information required to successfully
// sign a given segwit output. This struct is used by the Signer interface in
// order to gain access to critical data needed to generate a valid signature.
type SignDescriptor struct {
	// KeyDesc is a descriptor that precisely describes *which* key to use
	// for signing. This may provide the raw public key directly, or
	// require the Signer to re-derive the key according to the populated
	// derivation path.
	KeyDesc keychain.KeyDescriptor

	// SingleTweak is a scalar value that will be added to the private key
	// corresponding to the above public key to obtain the private key to
	// be used to sign this input. This value is typically derived via the
	// following computation:
	//
	//  * derivedKey = privkey + sha256(perCommitmentPoint || pubKey) mod N
	//
	// NOTE: If this value is nil, then the input can be signed using only
	// the above public key. Either a SingleTweak should be set or a
	// DoubleTweak, not both.
	SingleTweak []byte

	// DoubleTweak is a private key that will be used in combination with
	// its corresponding private key to derive the private key that is to
	// be used to sign the target input. Within the Lightning protocol,
	// this value is typically the commitment secret from a previously
	// revoked commitment transaction. This value is in combination with
	// two hash values, and the original private key to derive the private
	// key to be used when signing.
	//
	//  * k = (privKey*sha256(pubKey || tweakPub) +
	//        tweakPriv*sha256(tweakPub || pubKey)) mod N
	//
	// NOTE: If this value is nil, then the input can be signed using only
	// the above public key. Either a SingleTweak should be set or a
	// DoubleTweak, not both.
	DoubleTweak *btcec.PrivateKey

	// WitnessScript is the full script required to properly redeem the
	// output. This field should be set to the full script if a p2wsh
	// output is being signed. For p2wkh it should be set to the hashed
	// script (PkScript).
	WitnessScript []byte

	// Output is the target output which should be signed. The PkScript and
	// Value fields within the output should be properly populated,
	// otherwise an invalid signature may be generated.
	Output *wire.TxOut

	// HashType is the target sighash type that should be used when
	// generating the final sighash, and signature.
	HashType txscript.SigHashType

	// InputIndex is the target input within the transaction that should be
	// signed.
	InputIndex int
}

type signerClient struct {
	client    signrpc.SignerClient
	signerMac serializedMacaroon
	timeout   time.Duration
}

func newSignerClient(conn grpc.ClientConnInterface,
	signerMac serializedMacaroon, timeout time.Duration) *signerClient {

	return &signerClient{
		client:    signrpc.NewSignerClient(conn),
		signerMac: signerMac,
		timeout:   timeout,
	}
}

func marshallSignDescriptors(signDescriptors []*SignDescriptor,
) []*signrpc.SignDescriptor {

	rpcSignDescs := make([]*signrpc.SignDescriptor, len(signDescriptors))
	for i, signDesc := range signDescriptors {
		var keyBytes []byte
		var keyLocator *signrpc.KeyLocator
		if signDesc.KeyDesc.PubKey != nil {
			keyBytes = signDesc.KeyDesc.PubKey.SerializeCompressed()
		} else {
			keyLocator = &signrpc.KeyLocator{
				KeyFamily: int32(
					signDesc.KeyDesc.KeyLocator.Family,
				),
				KeyIndex: int32(
					signDesc.KeyDesc.KeyLocator.Index,
				),
			}
		}

		var doubleTweak []byte
		if signDesc.DoubleTweak != nil {
			doubleTweak = signDesc.DoubleTweak.Serialize()
		}

		rpcSignDescs[i] = &signrpc.SignDescriptor{
			WitnessScript: signDesc.WitnessScript,
			Output: &signrpc.TxOut{
				PkScript: signDesc.Output.PkScript,
				Value:    signDesc.Output.Value,
			},
			Sighash:    uint32(signDesc.HashType),
			InputIndex: int32(signDesc.InputIndex),
			KeyDesc: &signrpc.KeyDescriptor{
				RawKeyBytes: keyBytes,
				KeyLoc:      keyLocator,
			},
			SingleTweak: signDesc.SingleTweak,
			DoubleTweak: doubleTweak,
		}
	}

	return rpcSignDescs
}

func (s *signerClient) SignOutputRaw(ctx context.Context, tx *wire.MsgTx,
	signDescriptors []*SignDescriptor) ([][]byte, error) {

	txRaw, err := encodeTx(tx)
	if err != nil {
		return nil, err
	}
	rpcSignDescs := marshallSignDescriptors(signDescriptors)

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.signerMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.SignOutputRaw(rpcCtx,
		&signrpc.SignReq{
			RawTxBytes: txRaw,
			SignDescs:  rpcSignDescs,
		},
	)
	if err != nil {
		return nil, err
	}

	return resp.RawSigs, nil
}

// ComputeInputScript generates the proper input script for P2WPKH output and
// NP2WPKH outputs. This method only requires that the `Output`, `HashType`,
// `SigHashes` and `InputIndex` fields are populated within the sign
// descriptors.
func (s *signerClient) ComputeInputScript(ctx context.Context, tx *wire.MsgTx,
	signDescriptors []*SignDescriptor) ([]*input.Script, error) {

	txRaw, err := encodeTx(tx)
	if err != nil {
		return nil, err
	}
	rpcSignDescs := marshallSignDescriptors(signDescriptors)

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcCtx = s.signerMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.ComputeInputScript(
		rpcCtx, &signrpc.SignReq{
			RawTxBytes: txRaw,
			SignDescs:  rpcSignDescs,
		},
	)
	if err != nil {
		return nil, err
	}

	inputScripts := make([]*input.Script, 0, len(resp.InputScripts))
	for _, inputScript := range resp.InputScripts {
		inputScripts = append(inputScripts, &input.Script{
			SigScript: inputScript.SigScript,
			Witness:   inputScript.Witness,
		})
	}

	return inputScripts, nil
}

// SignMessage signs a message with the key specified in the key locator. The
// returned signature is fixed-size LN wire format encoded.
func (s *signerClient) SignMessage(ctx context.Context, msg []byte,
	locator keychain.KeyLocator) ([]byte, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcIn := &signrpc.SignMessageReq{
		Msg: msg,
		KeyLoc: &signrpc.KeyLocator{
			KeyFamily: int32(locator.Family),
			KeyIndex:  int32(locator.Index),
		},
	}

	rpcCtx = s.signerMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.SignMessage(rpcCtx, rpcIn)
	if err != nil {
		return nil, err
	}

	return resp.Signature, nil
}

// VerifyMessage verifies a signature over a message using the public key
// provided. The signature must be fixed-size LN wire format encoded.
func (s *signerClient) VerifyMessage(ctx context.Context, msg, sig []byte,
	pubkey [33]byte) (bool, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcIn := &signrpc.VerifyMessageReq{
		Msg:       msg,
		Signature: sig,
		Pubkey:    pubkey[:],
	}

	rpcCtx = s.signerMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.VerifyMessage(rpcCtx, rpcIn)
	if err != nil {
		return false, err
	}
	return resp.Valid, nil
}

// DeriveSharedKey returns a shared secret key by performing Diffie-Hellman key
// derivation between the ephemeral public key and the key specified by the key
// locator (or the node's identity private key if no key locator is specified):
//
//     P_shared = privKeyNode * ephemeralPubkey
//
// The resulting shared public key is serialized in the compressed format and
// hashed with SHA256, resulting in a final key length of 256 bits.
func (s *signerClient) DeriveSharedKey(ctx context.Context,
	ephemeralPubKey *btcec.PublicKey,
	keyLocator *keychain.KeyLocator) ([32]byte, error) {

	rpcCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	rpcIn := &signrpc.SharedKeyRequest{
		EphemeralPubkey: ephemeralPubKey.SerializeCompressed(),
		KeyLoc: &signrpc.KeyLocator{
			KeyFamily: int32(keyLocator.Family),
			KeyIndex:  int32(keyLocator.Index),
		},
	}

	rpcCtx = s.signerMac.WithMacaroonAuth(rpcCtx)
	resp, err := s.client.DeriveSharedKey(rpcCtx, rpcIn)
	if err != nil {
		return [32]byte{}, err
	}

	var sharedKey [32]byte
	copy(sharedKey[:], resp.SharedKey)
	return sharedKey, nil
}
