package lndclient

import (
	"bytes"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/wire"
)

// encodeTx encodes a tx to raw bytes.
func encodeTx(tx *wire.MsgTx) ([]byte, error) {
	var buffer bytes.Buffer
	err := tx.BtcEncode(&buffer, 0, wire.WitnessEncoding)
	if err != nil {
		return nil, err
	}
	rawTx := buffer.Bytes()

	return rawTx, nil
}

// decodeTx decodes raw tx bytes.
func decodeTx(rawTx []byte) (*wire.MsgTx, error) {
	tx := wire.MsgTx{}
	r := bytes.NewReader(rawTx)
	err := tx.BtcDecode(r, 0, wire.WitnessEncoding)
	if err != nil {
		return nil, err
	}

	return &tx, nil
}

// NewOutpointFromStr creates an outpoint from a string with the format
// txid:index.
func NewOutpointFromStr(outpoint string) (*wire.OutPoint, error) {
	parts := strings.Split(outpoint, ":")
	if len(parts) != 2 {
		return nil, errors.New("outpoint should be of the form txid:index")
	}
	hash, err := chainhash.NewHashFromStr(parts[0])
	if err != nil {
		return nil, err
	}

	outputIndex, err := strconv.Atoi(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid output index: %v", err)
	}

	return &wire.OutPoint{
		Hash:  *hash,
		Index: uint32(outputIndex),
	}, nil
}
