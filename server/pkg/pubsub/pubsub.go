package pubsub

import (
	"sync"
)

// Event is sent to every subscriber
// (i.e. having a reference to Subscription) when something is published
type Event struct {
	Typ     string
	Payload interface{}
}

// Subscription holds a channel that is a source of published messages
// and stays alive as long as its not closed
type Subscription struct {
	Ch     chan Event
	closed bool
}

// Unsubscribe should be called when the subscription
// is not needed to close the channel
func (s *Subscription) Unsubscribe() {
	s.closed = true
	close(s.Ch)
}

// Pubsub is a communication data structure where
// all subscribers can listen to new published messages
type Pubsub struct {
	mu   sync.RWMutex
	subs []*Subscription
}

// New creates a new publisher-subscriber object
func New() *Pubsub {
	ps := &Pubsub{}
	ps.subs = make([]*Subscription, 0)
	return ps
}

// Subscribe will register the given channel
// to receive published messages
func (ps *Pubsub) Subscribe() *Subscription {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	sub := &Subscription{Ch: make(chan Event, 5), closed: false}
	ps.subs = append(ps.subs, sub)

	return sub
}

// Publish will send a new message to all registered channels
func (ps *Pubsub) Publish(typ string, data interface{}) {
	ps.mu.RLock()
	defer ps.mu.RUnlock()

	ev := Event{Typ: typ, Payload: data}

	for _, sub := range ps.subs {

		if sub.closed {
			continue
		}

		select {
		case sub.Ch <- ev:
		default:
		}

	}
}
