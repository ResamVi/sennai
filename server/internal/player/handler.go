package player

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
)

// ChangeVar can set physics constants via http for debug purposes
func ChangeVar(w http.ResponseWriter, r *http.Request) {
	for k, v := range r.URL.Query() {

		i, err := strconv.ParseFloat(v[0], 64)
		if err != nil {
			log.Fatal("ChangeVar: " + err.Error())
		}

		switch k {
		case "turnspeed":
			turnspeed = i
		case "wheelbase":
			wheelbase = i
		case "enginepower":
			enginepower = i
		case "brakepower":
			brakepower = i
		case "friction":
			friction = i
		case "drag":
			drag = i
		case "traction":
			traction = i
		default:
			fmt.Println("unknown key: " + k)
		}

		fmt.Printf("Set %s to %f", k, i)
	}
}
