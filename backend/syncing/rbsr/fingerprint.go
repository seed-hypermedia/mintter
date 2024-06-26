package rbsr

import (
	"crypto/sha256"
	"encoding/binary"
	"unsafe"
)

type Fingerprint [fingerprintSize]byte

type accumulator struct {
	len int
	sum [32]byte
}

func (acc *accumulator) Add(other [32]byte) {
	var currCarry, nextCarry uint64

	// Treating [32]byte as [4]uint64 when adding.
	p := (*[4]uint64)(unsafe.Pointer(&acc.sum[0]))
	po := (*[4]uint64)(unsafe.Pointer(&other[0]))

	for i := 0; i < 4; i++ {
		orig := p[i]
		otherV := po[i]

		next := orig

		next += currCarry
		if next < orig {
			nextCarry = 1
		}

		next += otherV
		if next < otherV {
			nextCarry = 1
		}

		p[i] = next

		currCarry = nextCarry
		nextCarry = 0
	}
}

func (acc *accumulator) Fingerprint() Fingerprint {
	buf := make([]byte, 0, len(acc.sum)+8) // sum + len will be hashed.
	buf = append(buf, acc.sum[:]...)
	buf = binary.LittleEndian.AppendUint64(buf, uint64(acc.len))

	hash := sha256.Sum256(buf)

	var fingerprint Fingerprint
	copy(fingerprint[:], hash[:fingerprintSize])
	return fingerprint
}
