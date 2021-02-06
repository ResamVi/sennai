package game

import (
	"fmt"
	"net/http"
)

// ServeDebug can trigger game methods via http for debug purposes
func ServeDebug(g *Game, w http.ResponseWriter, r *http.Request) {
	for k := range r.URL.Query() {

		switch k {
		case "countdown":
			g.Countdown()
		default:
			fmt.Println("unknown key: " + k)
		}

		fmt.Printf("Trigger %s\n", k)
	}
}
