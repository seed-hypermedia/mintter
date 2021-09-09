package lightning

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

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
	expectedID  = "0226594d21c0862a11168ab07cdbc15e7c7af5ee561b741259e311f1614f4df3b7"
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
				"above", "judge", "emerge", "veteran", "reform", "crunch",
				"system", "all", "snap", "please", "shoulder", "vault",
				"hurt", "city", "quarter", "cover", "enlist", "swear",
				"success", "suggest", "drink", "wagon", "enrich", "body",
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
				"absorb", "century", "submit", "father", "path", "glove",
				"gloom", "super", "divert", "garden", "ice", "mirror",
				"wisdom", "grass", "dice", "kit", "ugly", "castle", "success",
				"suggest", "drink", "monster", "congress", "flight",
			},
			expectedBirthday: 3365,
		},
	}
)

type subset struct {
	subname                string
	credentials            WalletSecurity
	newPassword            string
	removeWalletBeforeTest bool
}

func TestStart(t *testing.T) {

	tests := [...]struct {
		name    string
		lnconf  *config.LND
		subtest []subset
	}{ /*
			{
				name: "bitcoind",
				lnconf: &config.LND{
					UseNeutrino:    false,
					Network:        "testnet",
					LndDir:         "/tmp/lndirtests",
					NoNetBootstrap: false,
				},
				subtest: []subset{
					{
						subname: "Init from seed",
						credentials: WalletSecurity{
							WalletPassphrase: "testtest",
							RecoveryWindow:   0,
							AezeedPassphrase: testVectors[0].password,
							AezeedMnemonics:  testVectors[0].expectedMnemonic[:],
							SeedEntropy:      testVectors[0].entropy[:],
							StatelessInit:    false,
						},
						newPassword:            "",
						removeWalletBeforeTest: true,
					},
					{
						subname: "Unlock pasword ok",
						credentials: WalletSecurity{
							WalletPassphrase: "testtest",
						},
						newPassword:            "",
						removeWalletBeforeTest: false,
					},
					{
						subname: "Unlock wrong pasword",
						credentials: WalletSecurity{
							WalletPassphrase: "testtesto",
						},
						newPassword:            "",
						removeWalletBeforeTest: false,
					},
				},
			},*/
		{
			name: "neutrino",
			lnconf: &config.LND{
				UseNeutrino:    true,
				Network:        "testnet",
				LndDir:         "/tmp/lndirtests",
				NoNetBootstrap: false,
			},
			subtest: []subset{
				{
					subname: "Init from seed",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
						RecoveryWindow:   0,
						AezeedPassphrase: testVectors[0].password,
						AezeedMnemonics:  testVectors[0].expectedMnemonic[:],
						SeedEntropy:      []byte{},
						StatelessInit:    false,
					},
					newPassword:            "",
					removeWalletBeforeTest: true,
				},
				{

					subname: "Init from mnemonics and recovery window",
					credentials: WalletSecurity{
						WalletPassphrase: "testtesto",
						RecoveryWindow:   100,
						AezeedPassphrase: testVectors[1].password,
						AezeedMnemonics:  testVectors[1].expectedMnemonic[:],
						SeedEntropy:      testVectors[1].entropy[:],
						StatelessInit:    false,
					},
					newPassword:            "",
					removeWalletBeforeTest: true,
				},

				{
					subname: "Unlock pasword ok",
					credentials: WalletSecurity{
						WalletPassphrase: "testtesto",
					},
					newPassword:            "",
					removeWalletBeforeTest: false,
				},
				{
					subname: "Change password ok",
					credentials: WalletSecurity{
						WalletPassphrase: "testtesto",
					},
					newPassword:            "testtesta",
					removeWalletBeforeTest: false,
				},
				{
					subname: "Unlock wrong pasword",
					credentials: WalletSecurity{
						WalletPassphrase: "testtesto",
					},
					newPassword:            "",
					removeWalletBeforeTest: false,
				},
				{
					subname: "Change wrong password",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:            "testtesti",
					removeWalletBeforeTest: false,
				},
			},
		},
	}
	log := backend.NewLogger(cfg)
	defer log.Sync()
	for _, tt := range tests {
		for _, subtest := range tt.subtest {
			t.Run(subtest.subname, func(t *testing.T) {
				d, nodeID, err := checkStart(t, tt.lnconf, &subtest.credentials,
					subtest.newPassword, subtest.removeWalletBeforeTest)
				require.NoError(t, err, tt.name+". must succeed")
				require.EqualValues(t, expectedID, nodeID)
				require.NoError(t, d.Stop(), tt.name+". must succeed")
				require.NoError(t, d.Restart(&subtest.credentials, subtest.newPassword),
					tt.name+". must succeed")
				require.NoError(t, d.Stop(), tt.name+". must succeed")
			})
		}

	}
}

func checkStart(t *testing.T, lnconf *config.LND, credentials *WalletSecurity,
	newPassword string, removeWalletBeforeTest bool) (*Ldaemon, string, error) {
	t.Helper()
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	logger.Named("backend")
	var nodeID = ""
	d, err := NewLdaemon(logger, lnconf)
	if err != nil {
		return d, nodeID, err

	}

	if removeWalletBeforeTest {
		path := lnconf.LndDir + "/data/chain/bitcoin/" + lnconf.Network + "/wallet.db"
		if err := os.Remove(path); !os.IsNotExist(err) && err != nil {
			return d, nodeID, fmt.Errorf("Could not remove file: " + path + err.Error())
		}
	}

	err = d.Start(credentials, newPassword)

	if err != nil {
		return d, nodeID, err
	} else if d.started == 1 {
		//In order for the subscriptions to take effect and write the log accordingly
		client, err := d.SubscribeEvents()
		defer client.Cancel()
		if err != nil {
			return d, nodeID, err
		}
		var i = 0
		for {
			select {
			case u := <-client.Updates():
				switch update := u.(type) {
				case DaemonReadyEvent:
					return d, update.IdentityPubkey, nil
				default:
					return d, nodeID, fmt.Errorf("Got unexpected update instead of ready event")
				}
			case <-client.Quit():
				return d, nodeID, fmt.Errorf("Got quit signal while waiting for ready event")
			default:
				i++
				if i < 6 {
					time.Sleep(1 * time.Second)
				} else {
					// Since we could have missed the event (LND was up very quick and sent it before we started listening)
					if d.NodePubkey() != "" {
						return d, d.NodePubkey(), nil
					} else {
						return d, nodeID, fmt.Errorf("Timeout reached waiting for ready event")
					}
				}
			}
		}

	} else {
		return d, nodeID, fmt.Errorf("Daemon not started " + err.Error())
	}
}
