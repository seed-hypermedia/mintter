package store

type eventType string

const (
	eventAbout eventType = "about"
)

func (et eventType) New(data interface{}) event {
	return event{
		Type: et,
		Data: data,
	}
}

type event struct {
	Type eventType   `cbor:"type"`
	Data interface{} `cbor:"data"`
}
