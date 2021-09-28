package lightning

import (
	"fmt"
	"os"
	"strings"
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
	expectedID       string
}

var (
	bitcoindRPCGenericUser       = "mintter"
	bitcoindRPCGenericAsciiPass  = "2NfbXsZPYQUq5nANSCttreiyJT1gAJv8ZoUNfsU7evQ="
	bitcoindRPCGenericBinaryPass = "410905ded7ef5116b3d4bcb3cc187e77$0060c04d2a643576086971596eb3df02ca5e32acffe1caa697e96cf764a9d204"

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
				"above", "judge", "emerge", "veteran", "reform", "crunch",
				"system", "all", "snap", "please", "shoulder", "vault",
				"hurt", "city", "quarter", "cover", "enlist", "swear",
				"success", "suggest", "drink", "wagon", "enrich", "body",
			},
			expectedBirthday: 0,
			expectedID:       "0226594d21c0862a11168ab07cdbc15e7c7af5ee561b741259e311f1614f4df3b7",
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
			expectedID:       "0226594d21c0862a11168ab07cdbc15e7c7af5ee561b741259e311f1614f4df3b7",
		},
		{
			version:  0,
			time:     aezeed.BitcoinGenesisDate,
			entropy:  testEntropy,
			salt:     testSalt,
			password: "",
			expectedMnemonic: [aezeed.NumMnemonicWords]string{
				"ability", "mouse", "defense", "minor", "wood", "float",
				"twist", "dinner", "jump", "another", "rabbit", "air",
				"badge", "crisp", "cup", "occur", "scrub", "pelican",
				"always", "chat", "rain", "initial", "inch", "nature",
			},
			expectedBirthday: 0,
			expectedID:       "03b8dd9c41d09d93b136122641085b3f2d1db0fcdfd99e1c2a57a8f4ec51d8f919",
		},
	}
)

type subset struct {
	subname                     string
	credentials                 WalletSecurity
	newPassword                 string
	RemoveCredentialsBeforeTest bool
	mustFail                    bool
	expectedID                  string
}

func TestStart(t *testing.T) {

	tests := [...]struct {
		name    string
		lnconf  *config.LND
		subtest []subset
	}{
		{
			name: "bitcoind",
			lnconf: &config.LND{
				UseNeutrino:     false,
				Network:         "regtest",
				LndDir:          "/tmp/lndirtests/startTest",
				NoNetBootstrap:  false,
				BitcoindRPCUser: bitcoindRPCGenericUser,
				BitcoindRPCPass: bitcoindRPCGenericAsciiPass,
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
						StatelessInit:    true,
					},
					newPassword:                 "",
					RemoveCredentialsBeforeTest: true,
					mustFail:                    false,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Unlock pasword ok but no macaroons",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
						StatelessInit:    true,
					},
					newPassword:                 "",
					RemoveCredentialsBeforeTest: false,
					mustFail:                    true,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Unlock pasword ok and macaroons",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:                 "",
					RemoveCredentialsBeforeTest: false,
					mustFail:                    false,
					expectedID:                  testVectors[0].expectedID,
				},
			},
		},
		{
			name: "neutrino",
			lnconf: &config.LND{
				UseNeutrino:    true,
				Network:        "testnet",
				LndDir:         "/tmp/lndirtests/startTest",
				NoNetBootstrap: false,
			},
			subtest: []subset{
				{
					subname: "Init from mnemonics stateless",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
						RecoveryWindow:   0,
						AezeedPassphrase: testVectors[0].password,
						AezeedMnemonics:  testVectors[0].expectedMnemonic[:],
						SeedEntropy:      testVectors[1].entropy[:],
						StatelessInit:    true,
					},
					newPassword:                 "",
					RemoveCredentialsBeforeTest: true,
					mustFail:                    false,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Unlock pasword ok but no macaroons",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
						StatelessInit:    true,
					},
					newPassword:                 "",
					RemoveCredentialsBeforeTest: false,
					mustFail:                    true,
					expectedID:                  testVectors[0].expectedID,
				},

				{
					subname: "Unlock pasword ok and macaroons",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:                 "",
					RemoveCredentialsBeforeTest: false,
					mustFail:                    false,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Change password from change pass",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:                 "testtesta",
					RemoveCredentialsBeforeTest: false,
					mustFail:                    false,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Unlock wrong pasword",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:                 "",
					RemoveCredentialsBeforeTest: false,
					mustFail:                    true,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Change wrong password",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:                 "testtesti",
					RemoveCredentialsBeforeTest: false,
					mustFail:                    true,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Unlock right pasword",
					credentials: WalletSecurity{
						WalletPassphrase: "testtesta",
					},
					newPassword:                 "",
					RemoveCredentialsBeforeTest: false,
					mustFail:                    false,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					// since init from seed gives a random mnemonics (even if we feed it with the same entropy the birthday date is diferent)
					subname: "Init from random seed",
					credentials: WalletSecurity{
						WalletPassphrase: "testfinal",
						RecoveryWindow:   0,
						AezeedPassphrase: testVectors[1].password,
						AezeedMnemonics:  []string{""},
						SeedEntropy:      testVectors[1].entropy[:],
						StatelessInit:    false,
					},
					newPassword:                 "",
					RemoveCredentialsBeforeTest: true,
					expectedID:                  testVectors[1].expectedID,
					mustFail:                    false,
				},
			},
		},
	}
	log := backend.NewLogger(cfg)
	defer log.Sync()
	var errDocker error
	var containerID string
	for _, tt := range tests {
		if !tt.lnconf.UseNeutrino {
			containerID, errDocker = startContainer(bitcoindImage)
			require.NoError(t, errDocker, tt.name+". must succeed")
		}
		for _, subtest := range tt.subtest {
			t.Run(subtest.subname, func(t *testing.T) {
				fmt.Println("TEST NAME: " + subtest.subname)
				tt.lnconf.DisableListen = true
				if subtest.subname == "Unlock pasword ok and macaroons" {
					fmt.Println("TEST NAME: " + subtest.subname)
				}

				d, nodeID, errStart := checkStart(t, tt.lnconf, &subtest.credentials,
					subtest.newPassword, subtest.RemoveCredentialsBeforeTest, false)
				d.Stop()
				if subtest.mustFail {
					require.Error(t, errStart, tt.name+". must fail")
				} else {
					require.NoError(t, errStart, tt.name+". must succeed")
				}

				if strings.Contains(subtest.subname, "mnemonics") {
					require.EqualValues(t, subtest.expectedID, nodeID)
				}

				if subtest.subname != "Change password from change pass" {
					errStart = d.Start(&subtest.credentials, subtest.newPassword, true)
					nodeID = d.GetID()
					d.Stop()
				}

				if subtest.mustFail {
					require.Error(t, errStart, tt.name+". must fail")
				} else {
					require.NoError(t, errStart, tt.name+". must succeed")
				}

				if strings.Contains(subtest.subname, "mnemonics") {
					require.EqualValues(t, subtest.expectedID, nodeID)
				}

			})
		}
		stopContainer(containerID)
	}
}

func checkStart(t *testing.T, lnconf *config.LND, credentials *WalletSecurity,
	newPassword string, RemoveCredentialsBeforeTest bool, blocking bool) (*Ldaemon, string, error) {
	t.Helper()
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	logger.Named("backend")
	var nodeID = ""
	bob, err := NewLdaemon(logger, lnconf)
	if err != nil {
		return bob, nodeID, err

	}

	if RemoveCredentialsBeforeTest {
		if err := os.RemoveAll(lnconf.LndDir); !os.IsNotExist(err) && err != nil {
			return bob, "", err
		}
	}

	err = bob.Start(credentials, newPassword, blocking)

	if err != nil {
		return bob, nodeID, err
	} else if !blocking {
		//In order for the subscriptions to take effect and write the log accordingly
		client, err := bob.SubscribeEvents()
		defer client.Cancel()
		if err != nil {
			return bob, nodeID, err
		}
		var i = 0
		for {
			select {
			case u := <-client.Updates():
				switch update := u.(type) {
				case DaemonReadyEvent:
					fmt.Println("Ready event gotten with ID: " + update.IdentityPubkey)
					return bob, update.IdentityPubkey, nil
				case DaemonDownEvent:
					return bob, "", update.err
				default:
					return bob, nodeID, fmt.Errorf("Got unexpected update instead of ready event")
				}
			case <-client.Quit():
				return bob, nodeID, fmt.Errorf("Got quit signal while waiting for ready event")
			default:
				i++
				if i < 25 {
					time.Sleep(5 * time.Second)
				} else {
					// Since we could have missed the event (LND was up very quick and sent it before we started listening) highly unlikely though
					if bob.GetID() != "" {
						fmt.Println("We missed the Ready event but getID was already set")
						return bob, bob.GetID(), nil
					} else {
						return bob, nodeID, fmt.Errorf("Timeout reached waiting for ready event")
					}
				}
			}
		}

	} else {
		return bob, bob.GetID(), nil
	}
}
