package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"mintter/backend"
	"mintter/backend/config"
	"mintter/backend/logging"

	"github.com/alecthomas/kong"
	"github.com/burdiyan/go/kongcli"
	"github.com/burdiyan/go/mainutil"
	"github.com/getlantern/systray"
	"github.com/pkg/browser"
	"go.uber.org/fx"
	"gopkg.in/natefinch/lumberjack.v2"
)

func main() {
	logFile := &lumberjack.Logger{
		Filename:   "/Users/burdiyan/Library/Logs/mintter.log",
		MaxSize:    250, // megabytes
		MaxBackups: 3,
	}
	defer logFile.Close()

	piper, pipew, err := os.Pipe()
	if err != nil {
		panic(err)
	}

	go func() {
		io.Copy(logFile, piper)
	}()

	os.Stderr = pipew
	os.Stdout = pipew

	{
		cfg := logging.DefaultConfig()
		cfg.Format = logging.JSONOutput
		logging.Setup(cfg)
	}

	var cfg config.Config

	kong.Parse(&cfg,
		kong.Name("mintter"),
		kong.Resolvers(kongcli.EnvResolver("")),
		kong.Description("Version: "+backend.Version),
	)

	if strings.Contains(os.Args[0], "Mintter.app") {
		cfg.UI.AssetsPath = filepath.Join(os.Args[0], "../../Resources/dist")
	}

	fmt.Println(cfg.UI.AssetsPath)

	app := fx.New(
		backend.Module(cfg),
		fx.StopTimeout(1*time.Minute),
	)

	ctx := mainutil.TrapSignals()

	onReady := func() {
		systray.SetTitle("Mintter")

		defer systray.Quit()

		open := systray.AddMenuItem("Open In Browser", "Open the web app in the default browser")
		mQuit := systray.AddMenuItem("Quit", "Quit the whole app")

		err := app.Start(ctx)
		if err != nil {
			fmt.Println("Failed to start app", err)
			return
		}

		fmt.Println("Started app")

		if err := browser.OpenURL("http://localhost:" + cfg.HTTPPort); err != nil {
			fmt.Println("Can't open browser", err)
		}

		for {
			select {
			case <-open.ClickedCh:
				if err := browser.OpenURL("http://localhost:" + cfg.HTTPPort); err != nil {
					fmt.Println("Can't open browser", err)
				}
			case <-ctx.Done():
				return
			case <-mQuit.ClickedCh:
				return
			}
		}
	}

	onStop := func() {
		err := app.Stop(context.Background())
		fmt.Println("Stopped daemon", err)
		logFile.Close()
	}

	systray.Run(onReady, onStop)
}
