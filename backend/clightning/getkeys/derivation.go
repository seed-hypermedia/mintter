package getkeys

import (
	"crypto/sha256"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/btcsuite/btcd/btcutil/hdkeychain"
	"golang.org/x/crypto/hkdf"
)

const (
	MAX_DERIVATION_DEPTH = 5
)

func derive(hsm_secret []byte, dev_path []string) (*hdkeychain.ExtendedKey, error) {
	var key *hdkeychain.ExtendedKey
	var saltNo uint8 = 0
	var err error

	if len(dev_path) < 1 {
		return nil, fmt.Errorf("derivation math must be at least m")
	}

	if len(dev_path) > MAX_DERIVATION_DEPTH+1 {
		return nil, fmt.Errorf("maximum depth in derivation path is %d, provided %d", MAX_DERIVATION_DEPTH, len(dev_path)+1)
	}

	for {
		bip32_seed := hkdf.New(sha256.New, hsm_secret[0:UNENCRYPTED_HSM_SECRET_LENGTH], []byte{saltNo}, []byte(KEY_SALT))
		seed_bin := make([]byte, UNENCRYPTED_HSM_SECRET_LENGTH)
		bip32_seed.Read(seed_bin)
		key, err = hdkeychain.NewMaster(seed_bin, bitcoinNet)
		if err == nil {
			break
		}
		saltNo++
	}

	r, _ := regexp.Compile("^[0-9]+'?$")
	var k uint64
	for depth, index := range dev_path {
		if depth == 0 {
			if index != "m" {
				return nil, fmt.Errorf("root master key derivation path should be m/ instead of %s given", index)
			}
			continue
		}
		if !r.MatchString(index) {
			return nil, fmt.Errorf("there is an error on your derivation path: %s", strings.Join(dev_path[:], "/"))
		}

		if index[len(index)-1:] == "'" {
			k, err = strconv.ParseUint(index[0:len(index)-1], 10, 32)
			k += hdkeychain.HardenedKeyStart

		} else {
			k, err = strconv.ParseUint(index, 10, 32)
		}
		if err != nil {
			return nil, err
		}
		key, err = key.Derive(uint32(k))
		if err != nil {
			return nil, err
		}

	}
	return key, nil
}
