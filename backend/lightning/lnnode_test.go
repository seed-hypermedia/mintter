package lightning

import (
	"testing"
	"time"

	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/stretchr/testify/require"

	"mintter/backend"
	"mintter/backend/config"
)

const (
	saltSize = 5
)

// TestVector defines the values that are used to create a fully initialized
// aezeed mnemonic seed and the expected values that should be calculated.
type TestVector struct {
	version          uint8
	time             time.Time
	entropy          [aezeed.EntropySize]byte
	salt             [saltSize]byte
	password         string
	expectedMnemonic [aezeed.NumMnemonicWords]string
	expectedBirthday uint16
}

var (
	cfg         config.Config
	testEntropy = [aezeed.EntropySize]byte{
		0x81, 0xb6, 0x37, 0xd8,
		0x63, 0x59, 0xe6, 0x96,
		0x0d, 0xe7, 0x95, 0xe4,
		0x1e, 0x0b, 0x4c, 0xfd,
	}
	testSalt = [saltSize]byte{
		0x73, 0x61, 0x6c, 0x74, 0x31, // equal to "salt1"
	}
	testVectors = []TestVector{
		{
			version:  0,
			time:     aezeed.BitcoinGenesisDate,
			entropy:  testEntropy,
			salt:     testSalt,
			password: "",
			expectedMnemonic: [aezeed.NumMnemonicWords]string{
				"ability", "liquid", "travel", "stem", "barely", "drastic",
				"pact", "cupboard", "apple", "thrive", "morning", "oak",
				"feature", "tissue", "couch", "old", "math", "inform",
				"success", "suggest", "drink", "motion", "know", "royal",
			},
			expectedBirthday: 0,
		},
		{
			version:  0,
			time:     time.Unix(1521799345, 0), // 03/23/2018 @ 10:02am (UTC)
			entropy:  testEntropy,
			salt:     testSalt,
			password: "!very_safe_55345_password*",
			expectedMnemonic: [aezeed.NumMnemonicWords]string{
				"able", "tree", "stool", "crush", "transfer", "cloud",
				"cross", "three", "profit", "outside", "hen", "citizen",
				"plate", "ride", "require", "leg", "siren", "drum",
				"success", "suggest", "drink", "require", "fiscal", "upgrade",
			},
			expectedBirthday: 3365,
		},
	}
)

type subset struct {
	subname     string
	credentials WalletSecurity
	success     bool
}

func TestStart(t *testing.T) {

	tests := [...]struct {
		name    string
		lnconf  *config.LND
		subtest []subset
	}{
		{
			name: "neutrino",
			lnconf: &config.LND{
				UseNeutrino: true,
				Network:     "testnet",
				LndDir:      "/tmp/lndirtests",
			},
			subtest: []subset{
				{
					subname: "Init from seed",
					credentials: WalletSecurity{
						WalletPassphrase: "test",
						RecoveryWindow:   0,
						AezeedPassphrase: testVectors[0].password,
						AezeedMnemonics:  testVectors[0].expectedMnemonic[:],
						SeedEntropy:      testVectors[0].entropy[:],
						StatelessInit:    false,
					},
					success: true,
				},
				{
					subname: "Init from seed with mnemonics and recovery window",
					credentials: WalletSecurity{
						WalletPassphrase: "test",
						RecoveryWindow:   100,
						AezeedPassphrase: testVectors[1].password,
						AezeedMnemonics:  testVectors[1].expectedMnemonic[:],
						SeedEntropy:      testVectors[1].entropy[:],
						StatelessInit:    false,
					},
					success: true,
				},
			},
		},
		{
			name: "bitcoind",
			lnconf: &config.LND{
				UseNeutrino: false,
				Network:     "regtest",
				LndDir:      "/tmp/lndirtests",
			},
			subtest: []subset{
				{
					subname: "Init from seed",
					credentials: WalletSecurity{
						WalletPassphrase: "test",
						RecoveryWindow:   0,
						AezeedPassphrase: "",
						AezeedMnemonics:  testVectors[0].expectedMnemonic[:],
						SeedEntropy:      testVectors[0].entropy[:],
						StatelessInit:    false,
					},
					success: true,
				},
				{
					subname: "Init from seed with mnemonics",
					credentials: WalletSecurity{
						WalletPassphrase: "test",
						RecoveryWindow:   0,
						AezeedPassphrase: "",
						AezeedMnemonics:  testVectors[1].expectedMnemonic[:],
						SeedEntropy:      testVectors[1].entropy[:],
						StatelessInit:    false,
					},
					success: true,
				},
			},
		},
	}
	log := backend.NewLogger(cfg)
	defer log.Sync()
	for _, tt := range tests {
		log := backend.NewLogger(cfg)
		defer log.Sync()
		for _, subtest := range tt.subtest {
			t.Run(subtest.subname, func(t *testing.T) {
				require.NoError(t, checkStart(t, tt.lnconf, &subtest.credentials), tt.name+". must succeed")
			})
		}

	}
}

func checkStart(t *testing.T, lnconf *config.LND, credentials *WalletSecurity) error {
	t.Helper()
	//d := NewLdaemon(log*zap.Logger, cfg*config.LND)
	return nil
}
