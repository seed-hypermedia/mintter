package appendonly

import "github.com/fxamacker/cbor/v2"

var (
	encMode cbor.EncMode
)

func init() {
	opts := cbor.CanonicalEncOptions()
	opts.Time = cbor.TimeRFC3339
	m, err := opts.EncMode()
	if err != nil {
		panic(err)
	}

	encMode = m
}

// EncodeSignedRecord to its binary representation.
func EncodeSignedRecord(sr SignedRecord) ([]byte, error) {
	return encMode.Marshal(sr)
}

// DecodeSignedRecord from its binary representation.
func DecodeSignedRecord(data []byte) (SignedRecord, error) {
	var sr SignedRecord
	err := cbor.Unmarshal(data, &sr)

	return sr, err
}
