package lightning

import (
	"context"
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/lightningnetwork/lnd/lnrpc"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"mintter/backend"
	"mintter/backend/config"
)

const (
	coinbaseReward = 50
	satsPerBtc     = 100000000
	aliceBalance   = 1250000
	bobBalance     = 5500000
	htclAmtMsats   = 75000_000
	feesPercent    = 5
)

var (
	bitcoindImage = "ruimarinho/bitcoin-core"
	containerName = "bitcoinContainer"
	walletCreated = false

	bitcoindRPCBobUser       = "bob"
	bitcoindRPCBobAsciiPass  = "2NfbXsZPYQUq5nANSCttreiyJT1gAJv8ZoUNfsU7evQ="
	bitcoindRPCBobBinaryPass = "410905ded7ef5116b3d4bcb3cc187e77$0060c04d2a643576086971596eb3df02ca5e32acffe1caa697e96cf764a9d204"

	bitcoindRPCAliceUser       = "alice"
	bitcoindRPCAliceAsciiPass  = "2NfbXsZPYQUq5nANSCttreiyJT1gAJv8ZoUNfsU7evQ="
	bitcoindRPCAliceBinaryPass = "410905ded7ef5116b3d4bcb3cc187e77$0060c04d2a643576086971596eb3df02ca5e32acffe1caa697e96cf764a9d204"

	bitcoindRPCCarolUser       = "carol"
	bitcoindRPCCarolAsciiPass  = "hvkOnizG4vkoWAakJlc_deLDQblQlhmr3rikrpdty1U="
	bitcoindRPCCarolBinaryPass = "b0b9aa23db2d181e8331e7f2ffeb69f1$9923bee41605b62997fdc9dd31dd968bd4cf27c5664e903929e640fcafe07491"
)

func TestPeers(t *testing.T) {
	tests := [...]struct {
		name               string
		lnconfAlice        *config.LND
		lnconfBob          *config.LND
		credentialsAlice   WalletSecurity
		credentialsBob     WalletSecurity
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
			confirmationBlocks: 1,
			blocksAfterOpening: 1,
			acceptChannel:      true,
			privateChannel:     true,
		},
	}
	log := backend.NewLogger(cfg)
	defer log.Sync()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := interactPeers(t, tt.lnconfAlice, tt.lnconfBob,
				&tt.credentialsAlice, &tt.credentialsBob,
				testVectors[2].expectedID, testVectors[0].expectedID,
				tt.confirmationBlocks, tt.blocksAfterOpening,
				tt.acceptChannel, tt.privateChannel)

			require.NoError(t, err, tt.name+". must succeed")

		})
	}

}

func interactPeers(t *testing.T, lnconfAlice *config.LND, lnconfBob *config.LND,
	credentialsAlice *WalletSecurity, credentialsBob *WalletSecurity,
	expectedAliceID string, expectedBobID string, confirmationBlocks uint32,
	blocksAfterOpening uint32, acceptChannel bool, privateChans bool) error {

	t.Helper()
	var err error
	var containerID string
	var payReq string
	var minedBlocks = 101
	walletCreated = false
	var channelOpened = false
	//var expectedMinedAmount = coinbaseReward * minedBlocks * satsPerBtc

	if err := os.RemoveAll(lnconfAlice.LndDir); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove: " + lnconfAlice.LndDir + err.Error())
	}

	if err := os.RemoveAll(lnconfBob.LndDir); !os.IsNotExist(err) && err != nil {
		return fmt.Errorf("Could not remove: " + lnconfBob.LndDir + err.Error())
	}

	logger, _ := zap.NewProduction()  //zap.NewExample()
	logger2, _ := zap.NewProduction() //zap.NewExample()
	defer logger.Sync()
	defer logger2.Sync()
	logger.Named("Bob")
	logger2.Named("Alice")

	alice, errAlice := NewLdaemon(logger2, lnconfAlice, nil)
	if errAlice != nil {
		return errAlice
	}

	if !lnconfBob.UseNeutrino || !lnconfAlice.UseNeutrino {
		if containerID, err = startContainer(bitcoindImage); err != nil {
			return err
		}
		defer stopContainer(containerID)

		// Initial mining Coinbase goes to the miner (bitcoind)
		if err = mineBlocks(uint32(minedBlocks), "", containerID); err != nil {
			return err
		}
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

	defer bob.Stop()
	defer alice.Stop() //Alice will stop first. She has the interceptor

	clientBob, errBob := bob.SubscribeEvents()
	defer clientBob.Cancel()

	if errBob != nil {
		return errBob
	}

	setAcceptor(alice, confirmationBlocks, acceptChannel)
	setAcceptor(bob, confirmationBlocks, acceptChannel)

	var i = 0
	aliceReady, bobReady, aliceSynced, bobSynced, pairSent, invoiceCreated, aliceID, bobID := false, false, false, false, false, false, "", ""
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
				if !lnconfAlice.UseNeutrino {
					if aliceAddr, err := alice.NewAddress("", 0); err != nil {
						return fmt.Errorf("Could not get new address" + err.Error())
					} else {
						if err = sendToAddress(uint64(aliceBalance), aliceAddr, containerID, true); err != nil {
							return fmt.Errorf("Problem mining blocks" + err.Error())
						}
					}
				}
			case DaemonDownEvent:
				return update.err
			case ChainSychronizationEvent:
				if update.Synced && update.BlockHeight == uint32(minedBlocks+2) { //initinal mined blocks + alice funding tx + bob funding tx
					if balance, err := alice.GetBalance(""); err != nil {
						return err
					} else if totFunds := balance.TotalFunds(false); totFunds != int64(aliceBalance) {
						return fmt.Errorf("Alice has a wrong balance. Expected:" +
							strconv.FormatInt(int64(aliceBalance), 10) + "sats, but got:" +
							strconv.FormatInt(int64(totFunds), 10) + "sats")
					} else {
						aliceSynced = true
					}
				}
			case PeerEvent:
				bobID = update.PubKey
				if bobID != expectedBobID {
					return fmt.Errorf("Alice received a peer notification but it wasn't Bob, Expected:" + expectedBobID +
						" but gotten:" + bobID)
				} else {
					fmt.Println("Alice received a peer notification from Bob:" + bobID)
					if aliceID != "" && !channelOpened {
						if txid, err := alice.OpenChannel(bobID, int64(aliceBalance)/2, int64(aliceBalance)/4,
							privateChans, blocksAfterOpening == 0, 0, false); err != nil {
							return err
						} else if err := mineBlocks(blocksAfterOpening, "", containerID); err != nil {
							return err
						} else {
							fmt.Println(fmt.Sprint(txid))
							fmt.Println("Alice opened a channel to bob")
							channelOpened = true
						}
					}
				}
			case TransactionEvent:
			case ChannelEvent:
				if update.Type == ChannelEventUpdate_OPEN_CHANNEL {
					if !invoiceCreated {
						if payReq, err = alice.GenerateInvoice(htclAmtMsats, []byte{},
							"test invoice", 1000, "", privateChans); err != nil {
							return err
						}
						invoiceCreated = true
					} else {
						if _, err = alice.PayInvoice(payReq, []uint64{}, htclAmtMsats, 0, feesPercent, "", 5); err != nil {
							//fmt.Println("Alice tried to pay an invoice but failed: " + err.Error())
							return err
						} else if balance, err := alice.ChannelBalance(); err != nil {
							return err
						} else if balance < uint64(aliceBalance)/4-htclAmtMsats/1000-htclAmtMsats/1000/feesPercent ||
							balance > uint64(aliceBalance)/4-htclAmtMsats/1000 {
							fmt.Println("Bob successfully paid an invoice but failed amount")

							return fmt.Errorf("Alice has a wrong balance. Expected:" +
								strconv.FormatInt(int64(aliceBalance)/4-htclAmtMsats/1000, 10) + "sats, but got:" +
								strconv.FormatInt(int64(balance), 10) + "sats")
						} else {
							break waitLoop
						}
					}
				}
			default:
				//fmt.Println("Got unexpected Alice update")
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
				if !lnconfBob.UseNeutrino {
					if bobAddr, err := bob.NewAddress("", 0); err != nil {
						return fmt.Errorf("Could not get new address" + err.Error())
					} else {
						if err = sendToAddress(uint64(bobBalance), bobAddr, containerID, true); err != nil {
							return fmt.Errorf("Problem mining blocks" + err.Error())
						}
					}
				}
			case DaemonDownEvent:
				return update.err
			case ChainSychronizationEvent:
				if update.Synced && update.BlockHeight == uint32(minedBlocks+2) { //initinal mined blocks + alice funding tx + bob funding tx
					if balance, err := bob.GetBalance(""); err != nil {
						return err
					} else if totFunds := balance.TotalFunds(false); totFunds != int64(bobBalance) {
						return fmt.Errorf("Bob has a wrong balance. Expected:" +
							strconv.FormatInt(int64(bobBalance), 10) + "sats, but got:" +
							strconv.FormatInt(int64(totFunds), 10) + "sats")
					} else {
						bobSynced = true
					}
				}
			case PeerEvent:
				aliceID = update.PubKey
				if aliceID != expectedAliceID {
					return fmt.Errorf("Bob received a peer notification but it wasn't Alice, Expected:" + expectedAliceID +
						" but gotten:" + aliceID)
				} else {
					fmt.Println("Bob received a peer notification from Alice:" + aliceID)
					if bobID != "" && !channelOpened {
						if txid, err := bob.OpenChannel(aliceID, int64(bobBalance)/2, int64(bobBalance)/4,
							privateChans, blocksAfterOpening == 0, 0, false); err != nil {
							return err
						} else if err := mineBlocks(blocksAfterOpening, "", containerID); err != nil {
							return err
						} else {
							fmt.Println(txid)
							fmt.Println("Bob opened a channel to alice")
							channelOpened = true
						}
					}
				}
			case TransactionEvent:
			case ChannelEvent:
				if update.Type == ChannelEventUpdate_OPEN_CHANNEL {
					if !invoiceCreated {
						if payReq, err = bob.GenerateInvoice(htclAmtMsats, []byte{},
							"test invoice", 1000, "", privateChans); err != nil {
							return err
						}
						invoiceCreated = true
					} else {
						if _, err = bob.PayInvoice(payReq, []uint64{}, htclAmtMsats, 0, feesPercent, "", 5); err != nil {
							//fmt.Println("Bob tried to pay an invoice but failed: " + err.Error())
							return err
						} else if balance, err := bob.ChannelBalance(); err != nil {
							return err
						} else if balance < uint64(bobBalance)/4-htclAmtMsats/1000-htclAmtMsats/1000/feesPercent ||
							balance > uint64(bobBalance)/4-htclAmtMsats/1000 {
							fmt.Println("Bob successfully paid an invoice but failed amount")

							return fmt.Errorf("Bob has a wrong balance. Expected:" +
								strconv.FormatInt(int64(bobBalance)/4-htclAmtMsats/1000, 10) + "sats, but got:" +
								strconv.FormatInt(int64(balance), 10) + "sats")
						} else {
							break waitLoop
						}
					}
				}
			default:
				//fmt.Println("Got unexpected Bob update")
				return fmt.Errorf("Got unexpected Bob update")
			}
		case <-clientBob.Quit():
			return fmt.Errorf("Got Bob quit signal while waiting for ready event")
		default:
			if aliceReady && bobReady && aliceSynced && bobSynced && !pairSent {

				fmt.Println("Both Alice and Bob are ready and synced. Pairing...")
				ctx, cancel := context.WithCancel(context.Background())
				_, err := alice.APIClient().ConnectPeer(ctx, &lnrpc.ConnectPeerRequest{
					Addr: &lnrpc.LightningAddress{
						Pubkey: expectedBobID,
						Host:   lnconfBob.RawListeners[0],
					},
					Perm:    false,
					Timeout: 2,
				})
				cancel()
				if err == nil {
					pairSent = true
				}

			}
			i++
			if i < 2000 {
				time.Sleep(3 * time.Second)
			} else {
				return fmt.Errorf("Timeout reached!")
			}

		}
	}

	return nil
}

func stopContainer(containerID string) error {

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	defer cli.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	args := filters.Arg("name", containerName)
	containerFilters := filters.NewArgs(args)

	if cList, err := cli.ContainerList(ctx, types.ContainerListOptions{Filters: containerFilters}); err != nil {
		return err

	} else {
		for _, container := range cList {
			cli.ContainerRemove(ctx, container.ID, types.ContainerRemoveOptions{Force: true})
		}
	}

	return nil
}

func startContainer(imageName string) (string, error) {

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return "", err
	}
	defer cli.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if _, err := cli.ImagePull(ctx, imageName, types.ImagePullOptions{}); err != nil {
		return "", err
	}

	args := filters.Arg("ancestor", bitcoindImage)
	containerFilters := filters.NewArgs(args)

	if cList, err := cli.ContainerList(ctx, types.ContainerListOptions{All: true, Filters: containerFilters}); err != nil {
		return "", err
	} else {
		for _, container := range cList {
			cli.ContainerRemove(ctx, container.ID, types.ContainerRemoveOptions{Force: true})
		}
	}
	resp, err := cli.ContainerCreate(ctx, &container.Config{
		Image: imageName, /*
			ExposedPorts: nat.PortSet{
				"18443/tcp": struct{}{},
				"18444/tcp": struct{}{},
			},*/

		Cmd: []string{"-regtest=1", "-txindex=1", "-fallbackfee=0.0002",
			"-zmqpubrawblock=tcp://127.0.0.1:28332", "-zmqpubrawtx=tcp://127.0.0.1:28333",
			"-rpcauth=" + bitcoindRPCGenericUser + ":" + bitcoindRPCGenericBinaryPass,
			"-rpcauth=" + bitcoindRPCAliceUser + ":" + bitcoindRPCAliceBinaryPass,
			"-rpcauth=" + bitcoindRPCBobUser + ":" + bitcoindRPCBobBinaryPass,
			"-rpcauth=" + bitcoindRPCCarolUser + ":" + bitcoindRPCCarolBinaryPass},
	}, &container.HostConfig{NetworkMode: "host"}, nil, nil, containerName)
	if err != nil {
		return "", err
	}

	if err := cli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		return resp.ID, err
	}

	time.Sleep(5 * time.Second)

	if cList, err := cli.ContainerList(ctx, types.ContainerListOptions{Filters: containerFilters}); err != nil {
		return resp.ID, err

	} else {
		for _, container := range cList {

			if container.ID == resp.ID && container.State != "running" {
				return resp.ID, fmt.Errorf("container state is :" + container.State + " instead of running")
			}
		}
	}

	return resp.ID, nil
}

func mineBlocks(numBlocks uint32, addr string, containerID string) error {

	if numBlocks == 0 {
		return nil
	}

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	defer cli.Close()
	var cmdID types.IDResponse
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	miningCmd := []string{"bitcoin-cli", "-regtest", "-rpcuser=" + bitcoindRPCGenericUser,
		"-rpcpassword=" + bitcoindRPCGenericAsciiPass, "generatetoaddress", strconv.FormatUint(uint64(numBlocks), 10), addr}

	createWalletCmd := []string{"bitcoin-cli", "-regtest", "-rpcuser=" + bitcoindRPCGenericUser,
		"-rpcpassword=" + bitcoindRPCGenericAsciiPass, "createwallet", "bitcoindWallet"}

	generateCmd := []string{"bitcoin-cli", "-regtest", "-rpcuser=" + bitcoindRPCGenericUser,
		"-rpcpassword=" + bitcoindRPCGenericAsciiPass, "-generate", strconv.FormatUint(uint64(numBlocks), 10)}

	if addr != "" {
		if cmdID, err = cli.ContainerExecCreate(ctx, containerID, types.ExecConfig{Cmd: miningCmd}); err != nil {
			return err
		}
	} else {
		if !walletCreated {
			if cmdID, err = cli.ContainerExecCreate(ctx, containerID, types.ExecConfig{Cmd: createWalletCmd}); err != nil {
				return err
			} else if err = cli.ContainerExecStart(ctx, cmdID.ID, types.ExecStartCheck{}); err != nil {
				return err
			} else {
				walletCreated = true
				time.Sleep(7 * time.Second) // wait for the wallet to be created
			}
		}

		if cmdID, err = cli.ContainerExecCreate(ctx, containerID, types.ExecConfig{Cmd: generateCmd}); err != nil {
			return err
		}
	}

	if err := cli.ContainerExecStart(ctx, cmdID.ID, types.ExecStartCheck{}); err != nil {
		return err
	} else {
		return nil
	}

}

func sendToAddress(amount uint64, addr string, containerID string, instantMining bool) error {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	defer cli.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	btcAmount := float32(amount) / float32(satsPerBtc)
	mineCmd := []string{"bitcoin-cli", "-regtest", "-rpcuser=" + bitcoindRPCGenericUser,
		"-rpcpassword=" + bitcoindRPCGenericAsciiPass, "-generate", "1"}

	sendCmd := []string{"bitcoin-cli", "-regtest", "-rpcuser=" + bitcoindRPCGenericUser,
		"-rpcpassword=" + bitcoindRPCGenericAsciiPass, "sendtoaddress", addr, fmt.Sprintf("%v", btcAmount)}
	if res, err := cli.ContainerExecCreate(ctx, containerID, types.ExecConfig{Cmd: sendCmd}); err != nil {
		return err
	} else if err := cli.ContainerExecStart(ctx, res.ID, types.ExecStartCheck{}); err != nil {
		return err
	} else if instantMining {
		time.Sleep(10 * time.Millisecond) // wait for the previous tx to enter the mempool
		if res, err := cli.ContainerExecCreate(ctx, containerID, types.ExecConfig{Cmd: mineCmd}); err != nil {
			return err
		} else if err := cli.ContainerExecStart(ctx, res.ID, types.ExecStartCheck{}); err != nil {
			return err
		}
	}
	return nil
}

func setAcceptor(node *Ldaemon, blocks2confirm uint32, accept bool) {

	acceptor := func(req *lnrpc.ChannelAcceptRequest) ChannelAcceptorResponse {
		var res ChannelAcceptorResponse = AcceptorMsgDefault
		fmt.Printf("PushAmt: %v ChannelReserve: %v CsvDelay: %v DustLimit: %v FundingAmt: %v MaxAcceptedHtlcs: %v MaxValueInFlight: %v FeePerKw: %v MinHtlc: %v NodeID: %v",
			req.PushAmt, req.ChannelReserve, req.CsvDelay, req.DustLimit, req.FundingAmt, req.MaxAcceptedHtlcs, req.MaxValueInFlight, req.FeePerKw, req.MinHtlc, hex.EncodeToString(req.NodePubkey[:]))

		// TODO: track this PR https://github.com/lightningnetwork/lnd/pull/4424
		// as this will allow us to set a target confirmation of 0 blocks
		res.MinAcceptDepth = blocks2confirm                     // TODO: When this is 0 manager.go sets NumConfsRequired to 3.
		res.ReserveSat = uint64(float64(req.FundingAmt) / 20.0) // 5% of the capacity of the channel
		//res.InFlightMaxMsat = req.FundingAmt - res.ReserveSat
		res.Accept = accept
		return res
	}
	node.SetAcceptorCallback(acceptor)
}
