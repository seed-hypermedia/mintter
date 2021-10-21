package lightning

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"mintter/backend/config"
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
				LndDir:          "/tmp/lndirtests/alice",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{"127.0.0.1:10009"},
				RawListeners:    []string{"0.0.0.0:9735"},
				BitcoindRPCUser: bitcoindRPCAliceUser,
				BitcoindRPCPass: bitcoindRPCAliceAsciiPass,
				DisableRest:     true,
			},

			lnconfBob: &config.LND{
				Alias:           "bob",
				UseNeutrino:     false,
				Network:         "regtest",
				LndDir:          "/tmp/lndirtests/bob",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{"127.0.0.1:10069"},
				RawListeners:    []string{"0.0.0.0:8735"},
				BitcoindRPCUser: bitcoindRPCBobUser,
				BitcoindRPCPass: bitcoindRPCBobAsciiPass,
				DisableRest:     true,
			},
			lnconfCarol: &config.LND{
				Alias:           "carol",
				UseNeutrino:     false,
				Network:         "regtest",
				LndDir:          "/tmp/lndirtests/carol",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{"127.0.0.1:10049"},
				RawListeners:    []string{"0.0.0.0:9635"},
				BitcoindRPCUser: bitcoindRPCCarolUser,
				BitcoindRPCPass: bitcoindRPCCarolAsciiPass,
				DisableRest:     true,
			},

			lnconfDave: &config.LND{
				Alias:           "dave",
				UseNeutrino:     false,
				Network:         "regtest",
				LndDir:          "/tmp/lndirtests/dave",
				NoNetBootstrap:  true,
				RawRPCListeners: []string{"127.0.0.1:10059"},
				RawListeners:    []string{"0.0.0.0:8635"},
				BitcoindRPCUser: bitcoindRPCDaveUser,
				BitcoindRPCPass: bitcoindRPCDaveAsciiPass,
				DisableRest:     true,
			},
			lnconfLoopAlice: &config.Loop{Network: "regtest", LoopDir: "/tmp/lndirtests/loop"},
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
	var containerID string
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

	if containerID, err = startContainer(bitcoindImage); err != nil {
		return err
	}
	defer stopContainer(containerID)

	// Initial mining Coinbase goes to the miner (bitcoind)
	if err = mineBlocks(uint32(minedBlocks), "", containerID); err != nil {
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
	for {
		select {
		case a := <-clientAlice.Updates():
			switch a.(type) {
			case DaemonReadyEvent:
				loop.Start(lnconfAlice.RawRPCListeners[0], lnconfAlice.LndDir)
			default:
				i++
				if i < 2000 {
					time.Sleep(3 * time.Second)
				} else {
					return fmt.Errorf("Timeout reached!")
				}
			}
		}
	}
}
