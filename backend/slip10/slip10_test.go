package slip10

import (
	"bytes"
	"encoding/hex"
	"testing"
)

func hexMustDecode(s string) []byte {
	b, err := hex.DecodeString(s)
	if err != nil {
		panic(err)
	}
	return b
}

func TestDeriveForPath(t *testing.T) {
	// Tests according to https://github.com/satoshilabs/slips/blob/master/slip-0010.md#example
	seed1 := hexMustDecode("000102030405060708090a0b0c0d0e0f")
	seed2 := hexMustDecode("fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a29f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542")

	tests := []struct {
		name     string
		path     string
		seed     []byte
		wantPriv []byte
		wantPub  []byte
		wantErr  bool
	}{
		// === Vector 1 ===
		{
			name:     "Key(m) – master node",
			path:     "m",
			seed:     seed1,
			wantPriv: hexMustDecode("2b4be7f19ee27bbf30c667b642d5f4aa69fd169872f8fc3059c08ebae2eb19e7"),
			wantPub:  hexMustDecode("00a4b2856bfec510abab89753fac1ac0e1112364e7d250545963f135f2a33188ed"),
		},
		{
			name:     "Key(m/0')",
			path:     "m/0'",
			seed:     seed1,
			wantPriv: hexMustDecode("68e0fe46dfb67e368c75379acec591dad19df3cde26e63b93a8e704f1dade7a3"),
			wantPub:  hexMustDecode("008c8a13df77a28f3445213a0f432fde644acaa215fc72dcdf300d5efaa85d350c"),
		},
		{
			name:     "Key(m/0'/1')",
			path:     "m/0'/1'",
			seed:     seed1,
			wantPriv: hexMustDecode("b1d0bad404bf35da785a64ca1ac54b2617211d2777696fbffaf208f746ae84f2"),
			wantPub:  hexMustDecode("001932a5270f335bed617d5b935c80aedb1a35bd9fc1e31acafd5372c30f5c1187"),
		},
		{
			name:     "Key(m/0'/1'/2')",
			path:     "m/0'/1'/2'",
			seed:     seed1,
			wantPriv: hexMustDecode("92a5b23c0b8a99e37d07df3fb9966917f5d06e02ddbd909c7e184371463e9fc9"),
			wantPub:  hexMustDecode("00ae98736566d30ed0e9d2f4486a64bc95740d89c7db33f52121f8ea8f76ff0fc1"),
		},
		{
			name:     "Key(m/0'/1'/2'/2')",
			path:     "m/0'/1'/2'/2'",
			seed:     seed1,
			wantPriv: hexMustDecode("30d1dc7e5fc04c31219ab25a27ae00b50f6fd66622f6e9c913253d6511d1e662"),
			wantPub:  hexMustDecode("008abae2d66361c879b900d204ad2cc4984fa2aa344dd7ddc46007329ac76c429c"),
		},
		{
			name:     "Key(m/0'/1'/2'/2'/1000000000')",
			path:     "m/0'/1'/2'/2'/1000000000'",
			seed:     seed1,
			wantPriv: hexMustDecode("8f94d394a8e8fd6b1bc2f3f49f5c47e385281d5c17e65324b0f62483e37e8793"),
			wantPub:  hexMustDecode("003c24da049451555d51a7014a37337aa4e12d41e485abccfa46b47dfb2af54b7a"),
		},
		{
			name:     "Key(invalid)",
			path:     "m/0",
			seed:     seed1,
			wantPriv: nil,
			wantErr:  true,
		},
		// === Vector 2 ===
		{
			name:     "Key(m) – master node",
			path:     "m",
			seed:     seed2,
			wantPriv: hexMustDecode("171cb88b1b3c1db25add599712e36245d75bc65a1a5c9e18d76f9f2b1eab4012"),
			wantPub:  hexMustDecode("008fe9693f8fa62a4305a140b9764c5ee01e455963744fe18204b4fb948249308a"),
		},
		{
			name:     "Key(m/0')",
			path:     "m/0'",
			seed:     seed2,
			wantPriv: hexMustDecode("1559eb2bbec5790b0c65d8693e4d0875b1747f4970ae8b650486ed7470845635"),
			wantPub:  hexMustDecode("0086fab68dcb57aa196c77c5f264f215a112c22a912c10d123b0d03c3c28ef1037"),
		},
		{
			name:     "Key(m/0'/2147483647')",
			path:     "m/0'/2147483647'",
			seed:     seed2,
			wantPriv: hexMustDecode("ea4f5bfe8694d8bb74b7b59404632fd5968b774ed545e810de9c32a4fb4192f4"),
			wantPub:  hexMustDecode("005ba3b9ac6e90e83effcd25ac4e58a1365a9e35a3d3ae5eb07b9e4d90bcf7506d"),
		},
		{
			name:     "Key(m/0'/2147483647'/1')",
			path:     "m/0'/2147483647'/1'",
			seed:     seed2,
			wantPriv: hexMustDecode("3757c7577170179c7868353ada796c839135b3d30554bbb74a4b1e4a5a58505c"),
			wantPub:  hexMustDecode("002e66aa57069c86cc18249aecf5cb5a9cebbfd6fadeab056254763874a9352b45"),
		},
		{
			name:     "Key(m/0'/2147483647'/1'/2147483646')",
			path:     "m/0'/2147483647'/1'/2147483646'",
			seed:     seed2,
			wantPriv: hexMustDecode("5837736c89570de861ebc173b1086da4f505d4adb387c6a1b1342d5e4ac9ec72"),
			wantPub:  hexMustDecode("00e33c0f7d81d843c572275f287498e8d408654fdf0d1e065b84e2e6f157aab09b"),
		},
		{
			name:     "Key(m/0'/2147483647'/1'/2147483646'/2')",
			path:     "m/0'/2147483647'/1'/2147483646'/2'",
			seed:     seed2,
			wantPriv: hexMustDecode("551d333177df541ad876a60ea71f00447931c0a9da16f227c11ea080d7391b8d"),
			wantPub:  hexMustDecode("0047150c75db263559a70d5778bf36abbab30fb061ad69f69ece61a72b0cfa4fc0"),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := DeriveForPath(tt.path, tt.seed)
			if (err != nil) != tt.wantErr {
				t.Errorf("DeriveForPath() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if err != nil {
				return
			}

			priv := got.privateKey()
			if !bytes.Equal(priv, tt.wantPriv) {
				t.Errorf("PrivateKey() = %X, want %X", priv, tt.wantPriv)
			}

			pub := got.publicKeyWithPrefix()
			if !bytes.Equal(pub, tt.wantPub) {
				t.Errorf("PublicKeyWithPrefix() = %X, want %X", priv, tt.wantPub)
			}
		})
	}
}
