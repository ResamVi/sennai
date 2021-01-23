package util

import (
	"encoding/json"
	"errors"
)

// ToJSON creates a JSON object with the provided field as key and item as value
func ToJSON(field string, item interface{}, data []byte) ([]byte, error) {
	m := make(map[string]interface{})
	m[field] = item

	return json.Marshal(m)
}

// AppendKey adds a key to the provided json object `data` with `item as value
func AppendKey(field string, item interface{}, data []byte) ([]byte, error) {
	var m map[string]interface{}

	err := json.Unmarshal(data, &m)
	if err != nil {
		return nil, errors.New("failed unmarshalling in AppendKey")
	}
	m[field] = item

	return json.Marshal(m)
}
