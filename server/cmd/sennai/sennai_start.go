package main

import (
	//"encoding/json"
	//"fmt"

	"log"
	"net/http"

	"gitlab.com/resamvi/sennai/internal/game"
)

func main() {
	l := game.New()
	go l.Run()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		game.ServeWs(l, w, r)
	})

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello, I'm up!"))
	})

	log.Println("Starting on Port :7999")
	log.Fatal(http.ListenAndServe(":7999", nil))
}
