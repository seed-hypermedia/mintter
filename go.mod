module seed

go 1.21

toolchain go1.22.3

require (
	crawshaw.io/sqlite v0.3.2
	github.com/99designs/gqlgen v0.17.22
	github.com/btcsuite/btcd v0.23.3
	github.com/btcsuite/btcd/btcutil v1.1.2
	github.com/burdiyan/go/mainutil v0.0.0-20200124222818-6f87e0e684b6
	github.com/fxamacker/cbor/v2 v2.4.0
	github.com/getsentry/sentry-go v0.16.0
	github.com/google/go-cmp v0.6.0
	github.com/gorilla/mux v1.8.1
	github.com/improbable-eng/grpc-web v0.15.0
	github.com/ipfs/boxo v0.17.0
	github.com/ipfs/go-block-format v0.2.0
	github.com/ipfs/go-cid v0.4.1
	github.com/ipfs/go-datastore v0.6.0
	github.com/ipfs/go-ipld-cbor v0.1.0
	github.com/ipfs/go-ipld-format v0.6.0
	github.com/ipfs/go-log/v2 v2.5.1
	github.com/ipld/go-codec-dagpb v1.6.0
	github.com/ipld/go-ipld-prime v0.21.0
	github.com/klauspost/compress v1.17.4
	github.com/libp2p/go-libp2p v0.32.2
	github.com/libp2p/go-libp2p-gostream v0.6.0
	github.com/libp2p/go-libp2p-kad-dht v0.25.1
	github.com/libp2p/go-libp2p-record v0.2.0
	github.com/lightningnetwork/lnd v0.15.1-beta.rc2
	github.com/mitchellh/mapstructure v1.5.0
	github.com/multiformats/go-multiaddr v0.12.1
	github.com/multiformats/go-multibase v0.2.0
	github.com/multiformats/go-multicodec v0.9.0
	github.com/multiformats/go-multihash v0.2.3
	github.com/peterbourgon/ff/v3 v3.3.0
	github.com/peterbourgon/trc v0.0.3
	github.com/planetscale/vtprotobuf v0.3.0
	github.com/polydawn/refmt v0.89.0
	github.com/prometheus/client_golang v1.18.0
	github.com/sanity-io/litter v1.5.5
	github.com/sethvargo/go-retry v0.2.4
	github.com/shirou/gopsutil/v3 v3.24.1
	github.com/stretchr/testify v1.8.4
	github.com/tidwall/btree v1.7.0
	github.com/tyler-smith/go-bip39 v1.1.0
	github.com/vektah/gqlparser/v2 v2.5.1
	github.com/zalando/go-keyring v0.2.5
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc v0.25.0
	go.opentelemetry.io/otel v1.21.0
	go.opentelemetry.io/otel/sdk v1.21.0
	go.uber.org/multierr v1.11.0
	go.uber.org/zap v1.26.0
	golang.org/x/exp v0.0.0-20240103183307-be819d1f06fc
	golang.org/x/sync v0.6.0
	golang.org/x/text v0.14.0
	google.golang.org/grpc v1.60.1
	google.golang.org/grpc/cmd/protoc-gen-go-grpc v1.2.0
	google.golang.org/protobuf v1.32.0
	roci.dev/fracdex v0.0.0-00010101000000-000000000000
)

require (
	github.com/alessio/shellescape v1.4.1 // indirect
	github.com/danieljoos/wincred v1.2.0 // indirect
	github.com/jedib0t/go-pretty/v6 v6.5.9 // indirect
	github.com/mattn/go-runewidth v0.0.15 // indirect
	github.com/rivo/uniseg v0.2.0 // indirect
)

require (
	github.com/alecthomas/units v0.0.0-20231202071711-9a357b53e9c9 // indirect
	github.com/crackcomm/go-gitignore v0.0.0-20231225121904-e25f5bc08668 // indirect
	github.com/hashicorp/golang-lru/v2 v2.0.7
	github.com/ipfs/go-bitfield v1.1.0 // indirect
	github.com/quic-go/qpack v0.4.0 // indirect
	github.com/quic-go/qtls-go1-20 v0.4.1 // indirect
	github.com/quic-go/quic-go v0.40.1
	github.com/quic-go/webtransport-go v0.6.0
	github.com/whyrusleeping/chunker v0.0.0-20181014151217-fe64bd25879f // indirect
)

require (
	cloud.google.com/go/compute v1.23.3 // indirect
	github.com/Jorropo/jsync v1.0.1 // indirect
	github.com/aead/siphash v1.0.1 // indirect
	github.com/agnivade/levenshtein v1.1.1 // indirect
	github.com/benbjohnson/clock v1.3.5 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/bernerdschaefer/eventsource v0.0.0-20130606115634-220e99a79763 // indirect
	github.com/btcsuite/btcd/btcec/v2 v2.2.1 // indirect
	github.com/btcsuite/btcd/btcutil/psbt v1.1.5 // indirect
	github.com/btcsuite/btcd/chaincfg/chainhash v1.0.1 // indirect
	github.com/btcsuite/btclog v0.0.0-20170628155309-84c8d2346e9f // indirect
	github.com/btcsuite/btcwallet v0.15.1 // indirect
	github.com/btcsuite/btcwallet/wallet/txauthor v1.2.3 // indirect
	github.com/btcsuite/btcwallet/wallet/txrules v1.2.0 // indirect
	github.com/btcsuite/btcwallet/wallet/txsizes v1.1.0 // indirect
	github.com/btcsuite/btcwallet/walletdb v1.4.0 // indirect
	github.com/btcsuite/btcwallet/wtxmgr v1.5.0 // indirect
	github.com/btcsuite/go-socks v0.0.0-20170105172521-4720035b7bfd // indirect
	github.com/btcsuite/websocket v0.0.0-20150119174127-31079b680792 // indirect
	github.com/cenkalti/backoff/v4 v4.2.1 // indirect
	github.com/cespare/xxhash/v2 v2.2.0 // indirect
	github.com/containerd/cgroups v1.1.0 // indirect
	github.com/coreos/go-systemd/v22 v22.5.0 // indirect
	github.com/cpuguy83/go-md2man/v2 v2.0.2 // indirect
	github.com/cskr/pubsub v1.0.2 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/davidlazar/go-crypto v0.0.0-20200604182044-b73af7476f6c // indirect
	github.com/decred/dcrd/crypto/blake256 v1.0.1 // indirect
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.2.0 // indirect
	github.com/decred/dcrd/lru v1.1.1 // indirect
	github.com/desertbit/timer v0.0.0-20180107155436-c41aec40b27f // indirect
	github.com/docker/go-units v0.5.0 // indirect
	github.com/elastic/gosigar v0.14.2 // indirect
	github.com/flynn/noise v1.0.1 // indirect
	github.com/francoispqt/gojay v1.2.13 // indirect
	github.com/go-errors/errors v1.4.2 // indirect
	github.com/go-logr/logr v1.4.1 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/go-ole/go-ole v1.2.6 // indirect
	github.com/go-task/slim-sprig v0.0.0-20230315185526-52ccab3ef572 // indirect
	github.com/godbus/dbus/v5 v5.1.0 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/protobuf v1.5.3 // indirect
	github.com/google/gopacket v1.1.19 // indirect
	github.com/google/pprof v0.0.0-20231229205709-960ae82b1e42 // indirect
	github.com/google/uuid v1.5.0 // indirect
	github.com/gorilla/websocket v1.5.0 // indirect
	github.com/hashicorp/errwrap v1.1.0 // indirect
	github.com/hashicorp/go-multierror v1.1.1 // indirect
	github.com/hashicorp/golang-lru v1.0.2 // indirect
	github.com/huin/goupnp v1.3.0 // indirect
	github.com/ipfs/bbloom v0.0.4 // indirect
	github.com/ipfs/go-cidutil v0.1.0 // indirect
	github.com/ipfs/go-ipfs-delay v0.0.1 // indirect
	github.com/ipfs/go-ipfs-pq v0.0.3 // indirect
	github.com/ipfs/go-ipfs-util v0.0.3 // indirect
	github.com/ipfs/go-ipld-legacy v0.2.1 // indirect
	github.com/ipfs/go-log v1.0.5 // indirect
	github.com/ipfs/go-metrics-interface v0.0.1 // indirect
	github.com/ipfs/go-peertaskqueue v0.8.1 // indirect
	github.com/jackpal/go-nat-pmp v1.0.2 // indirect
	github.com/jbenet/go-temp-err-catcher v0.1.0 // indirect
	github.com/jbenet/goprocess v0.1.4 // indirect
	github.com/kkdai/bstream v1.0.0 // indirect
	github.com/klauspost/cpuid/v2 v2.2.6 // indirect
	github.com/koron/go-ssdp v0.0.4 // indirect
	github.com/lib/pq v1.10.7 // indirect
	github.com/libp2p/go-buffer-pool v0.1.0 // indirect
	github.com/libp2p/go-cidranger v1.1.0 // indirect
	github.com/libp2p/go-flow-metrics v0.1.0 // indirect
	github.com/libp2p/go-libp2p-asn-util v0.4.1 // indirect
	github.com/libp2p/go-libp2p-kbucket v0.6.3 // indirect
	github.com/libp2p/go-libp2p-routing-helpers v0.7.3 // indirect
	github.com/libp2p/go-msgio v0.3.0 // indirect
	github.com/libp2p/go-nat v0.2.0 // indirect
	github.com/libp2p/go-netroute v0.2.1 // indirect
	github.com/libp2p/go-reuseport v0.4.0 // indirect
	github.com/libp2p/go-yamux/v4 v4.0.1 // indirect
	github.com/lightninglabs/gozmq v0.0.0-20191113021534-d20a764486bf // indirect
	github.com/lightninglabs/neutrino v0.14.2 // indirect
	github.com/lightningnetwork/lnd/clock v1.1.0 // indirect
	github.com/lightningnetwork/lnd/queue v1.1.0 // indirect
	github.com/lightningnetwork/lnd/ticker v1.1.0 // indirect
	github.com/lightningnetwork/lnd/tlv v1.0.3 // indirect
	github.com/lightningnetwork/lnd/tor v1.1.0 // indirect
	github.com/lithammer/fuzzysearch v1.1.8
	github.com/lufia/plan9stats v0.0.0-20211012122336-39d0f177ccd0 // indirect
	github.com/marten-seemann/tcp v0.0.0-20210406111302-dfbc87cc63fd // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/matttproud/golang_protobuf_extensions/v2 v2.0.0 // indirect
	github.com/miekg/dns v1.1.57 // indirect
	github.com/mikioh/tcpinfo v0.0.0-20190314235526-30a79bb1804b // indirect
	github.com/mikioh/tcpopt v0.0.0-20190314235656-172688c1accc // indirect
	github.com/minio/sha256-simd v1.0.1 // indirect
	github.com/mr-tron/base58 v1.2.0 // indirect
	github.com/multiformats/go-base32 v0.1.0 // indirect
	github.com/multiformats/go-base36 v0.2.0 // indirect
	github.com/multiformats/go-multiaddr-dns v0.3.1 // indirect
	github.com/multiformats/go-multiaddr-fmt v0.1.0 // indirect
	github.com/multiformats/go-multistream v0.5.0 // indirect
	github.com/multiformats/go-varint v0.0.7 // indirect
	github.com/oklog/ulid/v2 v2.1.0 // indirect
	github.com/onsi/ginkgo/v2 v2.13.2 // indirect
	github.com/opencontainers/runtime-spec v1.1.0 // indirect
	github.com/opentracing/opentracing-go v1.2.0 // indirect
	github.com/pbnjay/memory v0.0.0-20210728143218-7b4eea64cf58 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/power-devops/perfstat v0.0.0-20210106213030-5aafc221ea8c // indirect
	github.com/prometheus/client_model v0.5.0 // indirect
	github.com/prometheus/common v0.45.0 // indirect
	github.com/prometheus/procfs v0.12.0 // indirect
	github.com/raulk/go-watchdog v1.3.0 // indirect
	github.com/rs/cors v1.7.0 // indirect
	github.com/russross/blackfriday/v2 v2.1.0 // indirect
	github.com/sergi/go-diff v1.2.0 // indirect
	github.com/shoenig/go-m1cpu v0.1.6 // indirect
	github.com/spaolacci/murmur3 v1.1.0 // indirect
	github.com/tklauser/go-sysconf v0.3.12 // indirect
	github.com/tklauser/numcpus v0.6.1 // indirect
	github.com/urfave/cli/v2 v2.23.7 // indirect
	github.com/whyrusleeping/cbor-gen v0.0.0-20240109153615-66e95c3e8a87 // indirect
	github.com/whyrusleeping/go-keyspace v0.0.0-20160322163242-5b898ac5add1 // indirect
	github.com/x448/float16 v0.8.4 // indirect
	github.com/xrash/smetrics v0.0.0-20201216005158-039620a65673 // indirect
	github.com/yusufpapurcu/wmi v1.2.3 // indirect
	go.etcd.io/etcd/api/v3 v3.5.5 // indirect
	go.etcd.io/etcd/client/pkg/v3 v3.5.5 // indirect
	go.etcd.io/etcd/client/v3 v3.5.5 // indirect
	go.etcd.io/etcd/server/v3 v3.5.5 // indirect
	go.opencensus.io v0.24.0 // indirect
	go.opentelemetry.io/otel/metric v1.21.0 // indirect
	go.opentelemetry.io/otel/trace v1.21.0 // indirect
	go.uber.org/dig v1.17.1 // indirect
	go.uber.org/fx v1.20.1 // indirect
	go.uber.org/mock v0.4.0 // indirect
	golang.org/x/crypto v0.18.0 // indirect
	golang.org/x/mod v0.14.0 // indirect
	golang.org/x/net v0.20.0 // indirect
	golang.org/x/sys v0.21.0 // indirect
	golang.org/x/term v0.17.0 // indirect
	golang.org/x/tools v0.16.1 // indirect
	golang.org/x/xerrors v0.0.0-20231012003039-104605ab7028 // indirect
	gonum.org/v1/gonum v0.14.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240108191215-35c7eff3a6b1 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
	lukechampine.com/blake3 v1.2.1 // indirect
	nhooyr.io/websocket v1.8.7 // indirect
)

replace crawshaw.io/sqlite => ./third_party/sqlite

replace roci.dev/fracdex => github.com/rocicorp/fracdex v0.0.0-20231009204907-ebc26eac9486

// LND imports etcd, which imports some very old version of OpenTelemetry,
// and it break the build in many different but miserable ways.
exclude go.etcd.io/etcd/server/v3 v3.5.0
