package lightning

import (
	"net/http"
	"strings"

	"go.uber.org/zap"
)

type Lnurl struct {
	log *zap.Logger
}

func NewLnurl(log *zap.Logger) *Lnurl {

	return &Lnurl{
		log: log,
	}
}

// Values maps a string key to a list of values.
// It is typically used for query parameters and form values.
// Unlike in the http.Header map, the keys in a Values map
// are case-sensitive.
type Values map[string][]string

func (l Lnurl) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == "" || r.Method == http.MethodGet {
		id, ok := r.URL.Query()["id"]
		if !ok || len(id[0]) < 1 {
			l.log.Debug("id key not present in url. Probably not a minnter link")

		}

		if params, err := r.URL.Parse(strings.ToLower(r.URL.RawQuery)); err != nil {
			l.log.Warn("url malformed ", zap.String("url", r.URL.RawQuery))
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
		} else {
			id, ok := params.Query()["id"]
			if !ok || len(id[0]) < 1 {
				l.log.Debug("id key not present in url. Probably not a minnter link")
			}
			if link, ok := params.Query()["q"]; !ok {
				if lnurl, ok := params.Query()["lightning"]; !ok {
					l.log.Warn("neither q nor lightning keys are present in url")
					http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
				} else {
					l.log.Info("Get falback", zap.String("lightning", lnurl[0]))
				}

			} else {
				l.log.Info("url malformed ", zap.String("q", link[0]))
			}
		}

	} else {
		l.log.Warn("Method not allowed", zap.String("method", r.Method))
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
	}
	return
}
