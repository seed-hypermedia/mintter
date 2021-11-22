package lightning

import (
	"fmt"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"mintter/backend/config"
)

const (
	carolBalance = 2000000
	daveBalance  = 50000000
)

var (
	bitcoindRPCCarolUser       = "carol"
	bitcoindRPCCarolAsciiPass  = "hvkOnizG4vkoWAakJlc_deLDQblQlhmr3rikrpdty1U="
	bitcoindRPCCarolBinaryPass = "b0b9aa23db2d181e8331e7f2ffeb69f1$9923bee41605b62997fdc9dd31dd968bd4cf27c5664e903929e640fcafe07491"
	gRPCCarolAddress           = "127.0.0.1:10309"
	lndCarolAddress            = "0.0.0.0:9765"

	bitcoindRPCDaveUser       = "dave"
	bitcoindRPCDaveAsciiPass  = "SG4IL6aYG2Nf2Z5fkDIRgBoUW3oU4pX1zno-8yJzCUM="
	bitcoindRPCDaveBinaryPass = "9a894834ae2ddad8efea87ecb53148e8$ff95dda73df66a9b0dc7edfbe078ef5f82f9fae85acef511228588cc0f02596d"
	gRPCDaveAddress           = "127.0.0.1:10409"
	lndDaveAddress            = "0.0.0.0:9775"

	gRPCLoopserverAddress   = "127.0.0.1:11009"
	loopserverImage         = "lightninglabs/loopserver:latest"
	loopserverContainerName = "loopserverContainer"
	rootContainerDir        = "/root/.lnd"
	loopserverCmd           = []string{"daemon", "--maxamt=5000000",
		"--lnd.host=" + gRPCDaveAddress,
		"--lnd.macaroondir=" + rootContainerDir + "/dave/data/chain/bitcoin/regtest",
		"--lnd.tlspath=" + rootContainerDir + "/dave/tls.cert"}

	aliceBobCarolDaveBitcoindCmd = []string{"-regtest=1", "-txindex=1", "-fallbackfee=0.0002",
		"-zmqpubrawblock=tcp://127.0.0.1:28332", "-zmqpubrawtx=tcp://127.0.0.1:28333",
		"-rpcauth=" + bitcoindRPCGenericUser + ":" + bitcoindRPCGenericBinaryPass,
		"-rpcauth=" + bitcoindRPCAliceUser + ":" + bitcoindRPCAliceBinaryPass,
		"-rpcauth=" + bitcoindRPCBobUser + ":" + bitcoindRPCBobBinaryPass,
		"-rpcauth=" + bitcoindRPCCarolUser + ":" + bitcoindRPCCarolBinaryPass,
		"-rpcauth=" + bitcoindRPCDaveUser + ":" + bitcoindRPCDaveBinaryPass}
)

func TestLoop(t *testing.T) {
	tests := [...]struct {
		name               string
		lnconfAlice        *config.LND
		lnconfLoopAlice    *config.Loop
		lnconfBob          *config.LND
		lnconfCarol        *config.LND
		lnconfDave         *config.LND
		credentialsAlice   WalletSecurity
		credentialsBob     WalletSecurity
		credentialsCarol   WalletSecurity
		credentialsDave    WalletSecurity
		confirmationBlocks uint32 // number of blocks to wait for a channel to be confirmed
		blocksAfterOpening uint32 // number of blocks to mine after opening a channel (so te funding tx gets in)
		acceptChannel      bool   // Whether or not accepting the incoming channel
		privateChannel     bool   // If the channel to be creaded is private or not
	}{
		{
			name: "bitcoind",
			lnconfAlice: &config.LND{
				Alias:           "alice",
				UseNeutrino:     false,
				Network:         "regtest",
				LndDir:          testDir + "/alice",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{gRPCAliceAddress},
				RawListeners:    []string{lndAliceAddress},
				BitcoindRPCUser: bitcoindRPCAliceUser,
				BitcoindRPCPass: bitcoindRPCAliceAsciiPass,
				DisableRest:     true,
			},

			lnconfBob: &config.LND{
				Alias:           "bob",
				UseNeutrino:     false,
				Network:         "regtest",
				LndDir:          testDir + "/bob",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{gRPCBobAddress},
				RawListeners:    []string{lndBobAddress},
				BitcoindRPCUser: bitcoindRPCBobUser,
				BitcoindRPCPass: bitcoindRPCBobAsciiPass,
				DisableRest:     true,
			},
			lnconfCarol: &config.LND{
				Alias:           "carol",
				UseNeutrino:     false,
				Network:         "regtest",
				LndDir:          testDir + "/carol",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{gRPCCarolAddress},
				RawListeners:    []string{lndCarolAddress},
				BitcoindRPCUser: bitcoindRPCCarolUser,
				BitcoindRPCPass: bitcoindRPCCarolAsciiPass,
				DisableRest:     true,
			},

			lnconfDave: &config.LND{
				Alias:           "dave",
				UseNeutrino:     false,
				Network:         "regtest",
				LndDir:          testDir + "/dave",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{gRPCDaveAddress},
				RawListeners:    []string{lndDaveAddress},
				BitcoindRPCUser: bitcoindRPCDaveUser,
				BitcoindRPCPass: bitcoindRPCDaveAsciiPass,
				DisableRest:     true,
			},
			lnconfLoopAlice: &config.Loop{
				Network:      "regtest",
				LoopDir:      testDir + "/loop",
				ServerAddres: gRPCLoopserverAddress,
				NoTLS:        true,
			},
			credentialsBob: WalletSecurity{
				WalletPassphrase: "passwordBob",
				RecoveryWindow:   0,
				AezeedPassphrase: testVectors[0].password,
				AezeedMnemonics:  testVectors[0].expectedMnemonic[:],
				SeedEntropy:      testVectors[0].entropy[:],
				StatelessInit:    false,
			},
			credentialsAlice: WalletSecurity{
				WalletPassphrase: "passwordAlice",
				RecoveryWindow:   0,
				AezeedPassphrase: testVectors[2].password,
				AezeedMnemonics:  testVectors[2].expectedMnemonic[:],
				SeedEntropy:      testVectors[2].entropy[:],
				StatelessInit:    false,
			},
			credentialsCarol: WalletSecurity{
				WalletPassphrase: "passwordCarol",
				RecoveryWindow:   0,
				AezeedPassphrase: testVectors[0].password,
				AezeedMnemonics:  []string{""},
				SeedEntropy:      testVectors[0].entropy[:],
				StatelessInit:    false,
			},
			credentialsDave: WalletSecurity{
				WalletPassphrase: "passwordDave",
				RecoveryWindow:   0,
				AezeedPassphrase: testVectors[2].password,
				AezeedMnemonics:  []string{""},
				SeedEntropy:      testVectors[2].entropy[:],
				StatelessInit:    false,
			},
			confirmationBlocks: 1,
			blocksAfterOpening: 1,
			acceptChannel:      true,
			privateChannel:     true,
		},
	}
	log, err := zap.NewDevelopment()
	require.NoError(t, err)
	defer log.Sync()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := loopTest(t, tt.lnconfAlice, tt.lnconfBob,
				tt.lnconfCarol, tt.lnconfDave, tt.lnconfLoopAlice,
				&tt.credentialsAlice, &tt.credentialsBob,
				&tt.credentialsCarol, &tt.credentialsDave,
				testVectors[2].expectedID, testVectors[0].expectedID,
				tt.confirmationBlocks, tt.blocksAfterOpening,
				tt.acceptChannel, tt.privateChannel)

			require.NoError(t, err, tt.name+". must succeed")

		})
	}

}

func loopTest(t *testing.T, lnconfAlice *config.LND, lnconfBob *config.LND,
	lnconfCarol *config.LND, lnconfDave *config.LND, lnconfLoopAlice *config.Loop,
	credentialsAlice *WalletSecurity, credentialsBob *WalletSecurity,
	credentialsCarol *WalletSecurity, credentialsDave *WalletSecurity,
	expectedAliceID string, expectedBobID string, confirmationBlocks uint32,
	blocksAfterOpening uint32, acceptChannel bool, privateChans bool) error {

	t.Helper()
	var err error
	var bitcoindContainerID, loopServerContainerID string
	var minedBlocks = 101
	walletCreated = false
	//var expectedMinedAmount = coinbaseReward * minedBlocks * satsPerBtc

	if err := os.RemoveAll(lnconfAlice.LndDir); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove: " + lnconfAlice.LndDir + err.Error())
	}

	if err := os.RemoveAll(lnconfBob.LndDir); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove: " + lnconfBob.LndDir + err.Error())
	}

	if err := os.RemoveAll(lnconfCarol.LndDir); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove: " + lnconfCarol.LndDir + err.Error())
	}

	if err := os.RemoveAll(lnconfDave.LndDir); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove: " + lnconfDave.LndDir + err.Error())
	}
	logger, _ := zap.NewProduction()  //zap.NewExample()
	logger2, _ := zap.NewProduction() //zap.NewExample()
	logger3, _ := zap.NewProduction() //zap.NewExample()
	logger4, _ := zap.NewProduction() //zap.NewExample()
	defer logger.Sync()
	defer logger2.Sync()
	defer logger3.Sync()
	defer logger4.Sync()
	logger.Named("Bob")
	logger2.Named("Alice")
	logger3.Named("Carol")
	logger4.Named("Dave")
	alice, errAlice := NewLdaemon(logger2, lnconfAlice, nil)
	if errAlice != nil {
		return errAlice
	}

	if bitcoindContainerID, err = startContainer(bitcoindImage, aliceBobCarolDaveBitcoindCmd, bitcoindContainerName, []string{}); err != nil {
		return err
	}
	defer stopContainer(bitcoindContainerID, bitcoindContainerName)

	// Initial mining Coinbase goes to the miner (bitcoind)
	if err = mineBlocks(uint32(minedBlocks), "", bitcoindContainerID); err != nil {
		return err
	}

	errAlice = alice.Start(credentialsAlice, "", false)

	if errAlice != nil {
		return errAlice
	}

	clientAlice, errAlice := alice.SubscribeEvents()
	defer clientAlice.Cancel()

	if errAlice != nil {
		return errAlice
	}

	intercept := alice.GetIntercept()

	bob, errBob := NewLdaemon(logger, lnconfBob, intercept)
	if errBob != nil {
		return errBob
	}

	if errBob = bob.Start(credentialsBob, "", false); errBob != nil {
		return errBob
	}

	carol, errCarol := NewLdaemon(logger, lnconfCarol, intercept)
	if errCarol != nil {
		return errCarol
	}

	if errCarol = carol.Start(credentialsCarol, "", false); errCarol != nil {
		return errCarol
	}

	dave, errDave := NewLdaemon(logger, lnconfDave, intercept)
	if errDave != nil {
		return errDave
	}

	if errDave = dave.Start(credentialsDave, "", false); errDave != nil {
		return errDave
	}

	defer bob.Stop()
	defer carol.Stop()
	defer dave.Stop()
	defer alice.Stop() //Alice will stop first. She has the interceptor

	clientBob, errBob := bob.SubscribeEvents()
	defer clientBob.Cancel()

	if errBob != nil {
		return errBob
	}

	clientCarol, errCarol := carol.SubscribeEvents()
	defer clientCarol.Cancel()

	if errCarol != nil {
		return errCarol
	}

	clientDave, errDave := dave.SubscribeEvents()
	defer clientDave.Cancel()

	if errDave != nil {
		return errDave
	}

	logger5, _ := zap.NewProduction() //zap.NewExample()
	loop := NewLoop(logger5, lnconfLoopAlice, intercept)
	var i = 0
	alice2bobChan, alice2carolChan, dave2bobChan, dave2carolChan := false, false, false, false
	aliceReady, bobReady, carolReady, daveReady, aliceID, bobID, carolID, daveID := false, false, false, false, "", "", "", ""
	for {
		select {
		case a := <-clientAlice.Updates():
			switch update := a.(type) {
			case DaemonReadyEvent:
				aliceID = update.IdentityPubkey
				if loopServerContainerID, err = startContainer(loopserverImage, loopserverCmd, loopserverContainerName, []string{testDir + ":" + rootContainerDir}); err != nil {
					return err
				}
				defer stopContainer(loopServerContainerID, loopserverContainerName)
				loop.Start(lnconfAlice.RawRPCListeners[0], lnconfAlice.LndDir) // this only applies to alice
				if aliceAddr, err := alice.NewAddress("", 0); err != nil {
					return fmt.Errorf("Could not get new address" + err.Error())
				} else {
					if err = sendToAddress(uint64(aliceBalance), aliceAddr, bitcoindContainerID, true); err != nil {
						return fmt.Errorf("Problem mining blocks" + err.Error())
					}
				}
			case ChainSychronizationEvent:
				if update.Synced {
					if balance, err := alice.GetBalance(""); err != nil {
						return err
					} else if totFunds := balance.TotalFunds(false); totFunds != int64(aliceBalance) {
						return fmt.Errorf("Alice has a wrong balance. Expected:" +
							strconv.FormatInt(int64(aliceBalance), 10) + "sats, but got:" +
							strconv.FormatInt(int64(totFunds), 10) + "sats")
					} else {
						if bobReady && !alice2bobChan {
							if _, err := alice.OpenChannel(bobID, lndBobAddress, int64(aliceBalance)/4, 0,
								true, blocksAfterOpening == 0, 0, false); err != nil {
								return err
							} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
								return err
							} else {
								alice2bobChan = true
							}
						}
						if carolReady && !alice2carolChan {
							if _, err := alice.OpenChannel(carolID, lndCarolAddress, int64(aliceBalance)/4, 0,
								true, blocksAfterOpening == 0, 0, false); err != nil {
								return err
							} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
								return err
							} else {
								alice2carolChan = true
							}
						}
						aliceReady = true

						// we need to open a channel to dave anyway so we wait for him to be ready
						time.Sleep(10 * time.Second)
						if _, err := alice.OpenChannel(daveID, lndDaveAddress, int64(aliceBalance)/4, 0,
							false, blocksAfterOpening == 0, 0, false); err != nil {
							return err
						} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
							return err
						}

					}
				}
			}
		case b := <-clientBob.Updates():
			switch update := b.(type) {
			case DaemonReadyEvent:
				bobID = update.IdentityPubkey
				if bobAddr, err := bob.NewAddress("", 0); err != nil {
					return fmt.Errorf("Could not get new address" + err.Error())
				} else {
					if err = sendToAddress(uint64(bobBalance), bobAddr, bitcoindContainerID, true); err != nil {
						return fmt.Errorf("Problem mining blocks" + err.Error())
					}
				}
			case ChainSychronizationEvent:
				if update.Synced {
					if balance, err := bob.GetBalance(""); err != nil {
						return err
					} else if totFunds := balance.TotalFunds(false); totFunds != int64(bobBalance) {
						return fmt.Errorf("Bob has a wrong balance. Expected:" +
							strconv.FormatInt(int64(bobBalance), 10) + "sats, but got:" +
							strconv.FormatInt(int64(totFunds), 10) + "sats")
					} else {
						if aliceReady && !alice2bobChan {
							if _, err := bob.OpenChannel(aliceID, lndAliceAddress, int64(bobBalance)/4, 0,
								true, blocksAfterOpening == 0, 0, false); err != nil {
								return err
							} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
								return err
							} else {
								alice2bobChan = true
							}
						}
						if daveReady && !dave2bobChan {
							if _, err := bob.OpenChannel(daveID, lndDaveAddress, int64(bobBalance)/4, int64(bobBalance)/4,
								false, blocksAfterOpening == 0, 0, false); err != nil {
								return err
							} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
								return err
							} else {
								dave2bobChan = true
							}
						}
						bobReady = true
					}
				}
			}
		case c := <-clientCarol.Updates():
			switch update := c.(type) {
			case DaemonReadyEvent:
				carolID = update.IdentityPubkey
				if carolAddr, err := carol.NewAddress("", 0); err != nil {
					return fmt.Errorf("Could not get new address" + err.Error())
				} else {
					if err = sendToAddress(uint64(carolBalance), carolAddr, bitcoindContainerID, true); err != nil {
						return fmt.Errorf("Problem mining blocks" + err.Error())
					}
				}
			case ChainSychronizationEvent:
				if update.Synced {
					if balance, err := carol.GetBalance(""); err != nil {
						return err
					} else if totFunds := balance.TotalFunds(false); totFunds != int64(carolBalance) {
						return fmt.Errorf("Carol has a wrong balance. Expected:" +
							strconv.FormatInt(int64(carolBalance), 10) + "sats, but got:" +
							strconv.FormatInt(int64(totFunds), 10) + "sats")
					} else {
						if aliceReady && !alice2carolChan {
							if _, err := carol.OpenChannel(aliceID, lndAliceAddress, int64(carolBalance)/4, 0,
								true, blocksAfterOpening == 0, 0, false); err != nil {
								return err
							} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
								return err
							} else {
								alice2carolChan = true
							}
						}
						if daveReady && !dave2carolChan {
							if _, err := bob.OpenChannel(daveID, lndDaveAddress, int64(carolBalance)/4, int64(carolBalance)/4,
								false, blocksAfterOpening == 0, 0, false); err != nil {
								return err
							} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
								return err
							} else {
								dave2carolChan = true
							}
						}
						carolReady = true
					}
				}
			}
		case d := <-clientDave.Updates():
			switch update := d.(type) {
			case DaemonReadyEvent:
				daveID = update.IdentityPubkey
				if daveAddr, err := dave.NewAddress("", 0); err != nil {
					return fmt.Errorf("Could not get new address" + err.Error())
				} else {
					if err = sendToAddress(uint64(daveBalance), daveAddr, bitcoindContainerID, true); err != nil {
						return fmt.Errorf("Problem mining blocks" + err.Error())
					}
				}
			case ChainSychronizationEvent:
				if update.Synced {
					if balance, err := carol.GetBalance(""); err != nil {
						return err
					} else if totFunds := balance.TotalFunds(false); totFunds != int64(carolBalance) {
						return fmt.Errorf("Carol has a wrong balance. Expected:" +
							strconv.FormatInt(int64(carolBalance), 10) + "sats, but got:" +
							strconv.FormatInt(int64(totFunds), 10) + "sats")
					} else {
						if bobReady && !dave2bobChan {
							if _, err := dave.OpenChannel(bobID, lndBobAddress, int64(daveBalance)/10, int64(daveBalance)/10,
								false, blocksAfterOpening == 0, 0, false); err != nil {
								return err
							} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
								return err
							} else {
								dave2bobChan = true
							}
						}
						if carolReady && !dave2carolChan {
							if _, err := dave.OpenChannel(carolID, lndCarolAddress, int64(daveBalance)/10, int64(daveBalance)/10,
								false, blocksAfterOpening == 0, 0, false); err != nil {
								return err
							} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
								return err
							} else {
								dave2carolChan = true
							}
						}
						daveReady = true

						// we need to open a channel to alice anyway so we wait for him to be ready
						time.Sleep(10 * time.Second)
						if _, err := dave.OpenChannel(aliceID, lndAliceAddress, int64(daveBalance)/4, 0,
							false, blocksAfterOpening == 0, 0, false); err != nil {
							return err
						} else if err := mineBlocks(blocksAfterOpening, "", bitcoindContainerID); err != nil {
							return err
						}
					}
				}
			}
		default:
			i++
			if i < 60 {
				time.Sleep(3 * time.Second)
			} else {
				return fmt.Errorf("Timeout reached!")
			}
		}
	}
}
