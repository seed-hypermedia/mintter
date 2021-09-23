package lightning

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/lightningnetwork/lnd/aezeed"
	"github.com/lightningnetwork/lnd/lnrpc"
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
	removeCredentialsBeforeTest bool
	mustFail                    bool
	expectedID                  string
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
						removeCredentialsBeforeTest: true,
					},
					{
						subname: "Unlock pasword ok",
						credentials: WalletSecurity{
							WalletPassphrase: "testtest",
						},
						newPassword:            "",
						removeCredentialsBeforeTest: false,
					},
					{
						subname: "Unlock wrong pasword",
						credentials: WalletSecurity{
							WalletPassphrase: "testtesto",
						},
						newPassword:            "",
						removeCredentialsBeforeTest: false,
					},
				},
			},*/
		{
			name: "neutrino",
			lnconf: &config.LND{
				UseNeutrino:    true,
				Network:        "testnet",
				LndDir:         "/tmp/lndirtests/start",
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
					removeCredentialsBeforeTest: true,
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
					removeCredentialsBeforeTest: false,
					mustFail:                    true,
					expectedID:                  testVectors[0].expectedID,
				},

				{
					subname: "Unlock pasword ok and macaroons",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:                 "",
					removeCredentialsBeforeTest: false,
					mustFail:                    false,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Change password from change pass",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:                 "testtesta",
					removeCredentialsBeforeTest: false,
					mustFail:                    false,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Unlock wrong pasword",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:                 "",
					removeCredentialsBeforeTest: false,
					mustFail:                    true,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Change wrong password",
					credentials: WalletSecurity{
						WalletPassphrase: "testtest",
					},
					newPassword:                 "testtesti",
					removeCredentialsBeforeTest: false,
					mustFail:                    true,
					expectedID:                  testVectors[0].expectedID,
				},
				{
					subname: "Unlock right pasword",
					credentials: WalletSecurity{
						WalletPassphrase: "testtesta",
					},
					newPassword:                 "",
					removeCredentialsBeforeTest: false,
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
					removeCredentialsBeforeTest: true,
					expectedID:                  testVectors[1].expectedID,
					mustFail:                    false,
				},
			},
		},
	}
	log := backend.NewLogger(cfg)
	defer log.Sync()
	for _, tt := range tests {
		for _, subtest := range tt.subtest {
			t.Run(subtest.subname, func(t *testing.T) {
				fmt.Println("TEST NAME: " + subtest.subname)
				tt.lnconf.DisableListen = true
				if subtest.subname == "Unlock pasword ok and macaroons" {
					fmt.Println("TEST NAME: " + subtest.subname)
				}
				d, nodeID, errStart := checkStart(t, tt.lnconf, &subtest.credentials,
					subtest.newPassword, subtest.removeCredentialsBeforeTest, false)
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

	}
}

func TestPeers(t *testing.T) {
	tests := [...]struct {
		name             string
		lnconfAlice      *config.LND
		lnconfBob        *config.LND
		credentialsAlice WalletSecurity
		credentialsBob   WalletSecurity
	}{
		{
			name: "neutrino",
			lnconfAlice: &config.LND{
				UseNeutrino:     true,
				Network:         "testnet",
				LndDir:          "/tmp/lndirtests/alice",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{"127.0.0.1:10009"},
				RawListeners:    []string{"0.0.0.0:9735"},
				DisableRest:     true,
			},

			lnconfBob: &config.LND{
				UseNeutrino:     true,
				Network:         "testnet",
				LndDir:          "/tmp/lndirtests/bob",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{"127.0.0.1:10069"},
				RawListeners:    []string{"0.0.0.0:8735"},
				DisableRest:     true,
			},
			credentialsBob: WalletSecurity{
				WalletPassphrase: "passwordBob",
				RecoveryWindow:   0,
				AezeedPassphrase: testVectors[0].password,
				AezeedMnemonics:  testVectors[0].expectedMnemonic[:],
				SeedEntropy:      testVectors[0].entropy[:],
				StatelessInit:    true,
			},
			credentialsAlice: WalletSecurity{
				WalletPassphrase: "passwordAlice",
				RecoveryWindow:   0,
				AezeedPassphrase: testVectors[2].password,
				AezeedMnemonics:  testVectors[2].expectedMnemonic[:],
				SeedEntropy:      testVectors[2].entropy[:],
				StatelessInit:    true,
			},
		},
	}
	log := backend.NewLogger(cfg)
	defer log.Sync()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := interactPeers(t, tt.lnconfAlice, tt.lnconfBob,
				&tt.credentialsAlice, &tt.credentialsBob,
				testVectors[2].expectedID, testVectors[0].expectedID)

			require.NoError(t, err, tt.name+". must succeed")

		})
	}

}

func interactPeers(t *testing.T, lnconfAlice *config.LND, lnconfBob *config.LND,
	credentialsAlice *WalletSecurity, credentialsBob *WalletSecurity,
	expectedAliceID string, expectedBobID string) error {
	t.Helper()
	var err error
	if err = removeCredentials(lnconfAlice.LndDir, lnconfAlice.Network); err != nil {
		return err
	}
	if err = removeCredentials(lnconfBob.LndDir, lnconfBob.Network); err != nil {
		return err
	}

	logger, _ := zap.NewProduction()  //zap.NewExample()
	logger2, _ := zap.NewProduction() //zap.NewExample()
	defer logger.Sync()
	defer logger2.Sync()
	logger.Named("Bob")
	logger2.Named("Alice")
	bob, errBob := NewLdaemon(logger, lnconfBob)
	if errBob != nil {
		return errBob

	}

	alice, errAlice := NewLdaemon(logger2, lnconfAlice)
	if errAlice != nil {
		return errAlice
	}

	if errAlice = alice.Start(credentialsAlice, "", false); errAlice != nil {
		return errAlice
	}
	defer alice.Stop()

	clientAlice, errAlice := alice.SubscribeEvents()
	defer clientAlice.Cancel()
	if errAlice != nil {
		return errAlice
	}

	if errBob = bob.Start(credentialsBob, "", false); errBob != nil {
		return errBob
	}
	defer bob.Stop()

	clientBob, errBob := bob.SubscribeEvents()
	defer clientBob.Cancel()
	if errBob != nil {
		return errBob
	}

	var i = 0
	aliceReady, bobReady, aliceSynced, bobSynced, pairSent, aliceID, bobID := false, false, false, false, false, "", ""
waitLoop:
	for {
		select {
		case a := <-clientAlice.Updates():
			switch update := a.(type) {
			case DaemonReadyEvent:
				if update.IdentityPubkey != expectedAliceID {
					return fmt.Errorf("After initializing Alice got ID:" + update.IdentityPubkey +
						" but expected" + expectedAliceID)
				} else {
					aliceReady = true
				}
			case DaemonDownEvent:
				return update.err
			case ChainSyncedEvent:
				aliceSynced = true
			case PeerEvent:
				bobID = update.PubKey
				if bobID != expectedBobID {
					return fmt.Errorf("Alice received a peer notification but it wasn't Bob, Expected:" + expectedBobID +
						" but gotten:" + bobID)
				} else {
					fmt.Println("Alice received a peer notification from Bob:" + bobID)
					if aliceID != "" {
						break waitLoop
					}
				}

			default:
				return fmt.Errorf("Got unexpected Alice update")
			}
		case <-clientAlice.Quit():
			return fmt.Errorf("Got Bob quit signal while waiting for ready event")
		case b := <-clientBob.Updates():
			switch update := b.(type) {
			case DaemonReadyEvent:
				if update.IdentityPubkey != expectedBobID {
					return fmt.Errorf("After initializing Bob got ID:" + update.IdentityPubkey +
						" but expected" + expectedBobID)
				} else {
					bobReady = true
				}
			case DaemonDownEvent:
				return update.err
			case ChainSyncedEvent:
				bobSynced = true
			case PeerEvent:
				aliceID = update.PubKey
				if aliceID != expectedAliceID {
					return fmt.Errorf("Bob received a peer notification but it wasn't Alice, Expected:" + expectedAliceID +
						" but gotten:" + aliceID)
				} else {
					fmt.Println("Bob received a peer notification from Alice:" + aliceID)
					time.Sleep(2 * time.Second) // We give Alice some time to receive the notification and fill BobID
					if bobID != "" {
						break waitLoop
					}
				}
			default:
				return fmt.Errorf("Got unexpected Bob update")
			}
		case <-clientBob.Quit():
			return fmt.Errorf("Got Bob quit signal while waiting for ready event")
		default:
			if aliceReady && bobReady && aliceSynced && bobSynced && !pairSent {

				fmt.Println("Both Alice and Bob are ready and synced. Pairing...")
				_, err := alice.APIClient().ConnectPeer(context.Background(), &lnrpc.ConnectPeerRequest{
					Addr: &lnrpc.LightningAddress{
						Pubkey: expectedBobID,
						Host:   lnconfBob.RawListeners[0],
					},
					Perm:    false,
					Timeout: 2,
				})
				if err == nil {
					pairSent = true
				}

			}
			i++
			if i < 2500 {
				time.Sleep(3 * time.Second)
			} else {
				return fmt.Errorf("Timeout reached waiting for ready event")
			}

		}
	}

	return nil
}

func removeCredentials(workingDir string, network string) error {

	path := workingDir + "/data/chain/bitcoin/" + network + "/wallet.db"
	if err := os.Remove(path); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove file: " + path + err.Error())
	}

	// If macaroons.db is removed, the previous node password is forgotten. We can safely
	// Init a fresh new instance. If it is not removed, then we need to change the password
	// before init
	path = workingDir + "/data/chain/bitcoin/" + network + "/macaroons.db"
	if err := os.Remove(path); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove file: " + path + err.Error())
	}

	path = workingDir + "/data/chain/bitcoin/" + network + "/admin.macaroon"
	if err := os.Remove(path); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove file: " + path + err.Error())
	}
	path = workingDir + "/data/chain/bitcoin/" + network + "/readonly.macaroon"
	if err := os.Remove(path); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove file: " + path + err.Error())
	}
	path = workingDir + "/data/chain/bitcoin/" + network + "/invoice.macaroon"
	if err := os.Remove(path); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove file: " + path + err.Error())
	}
	path = workingDir + "/data/chain/bitcoin/" + network + "/router.macaroon"
	if err := os.Remove(path); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove file: " + path + err.Error())
	}
	return nil
}

func checkStart(t *testing.T, lnconf *config.LND, credentials *WalletSecurity,
	newPassword string, removeCredentialsBeforeTest bool, blocking bool) (*Ldaemon, string, error) {
	t.Helper()
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	logger.Named("backend")
	var nodeID = ""
	bob, err := NewLdaemon(logger, lnconf)
	if err != nil {
		return bob, nodeID, err

	}

	if removeCredentialsBeforeTest {

		if err := removeCredentials(lnconf.LndDir, lnconf.Network); err != nil {
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
				case ChainSyncedEvent:
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
