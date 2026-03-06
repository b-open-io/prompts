package main

import (
	"fmt"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Starting Go service on port", port)
	fmt.Printf("Debug: environment = %s\n", os.Getenv("GO_ENV"))

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/data", dataHandler)

	// TODO: Add graceful shutdown
	fmt.Println("Server ready")
	http.ListenAndServe(":"+port, nil)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

// FIXME: This handler doesn't validate request size
func dataHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Process data
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"result":"processed"}`))
}
