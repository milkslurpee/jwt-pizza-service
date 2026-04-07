#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 https://pizza-service.mrpizzajohn.com"
  exit 1
fi
host=$1

cleanup() {
  echo "Terminating background processes..."
  kill $pid1 $pid2 $pid3 2>/dev/null
  exit 0
}
trap cleanup SIGINT

execute_curl() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

login() {
  response=$(curl -s -X PUT "$host/api/auth" -d "{\"email\":\"$1\", \"password\":\"$2\"}" -H 'Content-Type: application/json')
  echo "$response" | jq -r '.token'
}

# 1) Request menu every 3 seconds
while true; do
  status=$(execute_curl "$host/api/order/menu")
  echo "Requesting menu... $status"
  sleep 3
done &
pid1=$!

# 2) Invalid login attempt every 25 seconds
while true; do
  status=$(execute_curl -X PUT "$host/api/auth" -d '{"email":"unknown@jwt.com", "password":"bad"}' -H 'Content-Type: application/json')
  echo "Logging in with invalid credentials... $status"
  sleep 25
done &
pid2=$!

# 3) Diner: login, order ONE pizza, logout, repeat
while true; do
  token=$(login "d@jwt.com" "diner")
  echo "Login diner... $([ -z "$token" ] && echo "false" || echo "true")"
  status=$(execute_curl -X POST "$host/api/order" \
    -H 'Content-Type: application/json' \
    -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.0038 }]}' \
    -H "Authorization: Bearer $token")
  echo "Bought a pizza... $status"
  sleep 20
  status=$(execute_curl -X DELETE "$host/api/auth" -H "Authorization: Bearer $token")
  echo "Logging out diner... $status"
  sleep 30
done &
pid3=$!

wait $pid1 $pid2 $pid3