#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 https://pizza-service.mrpizzajohn.com"
  exit 1
fi
host=$1

cleanup() {
  echo "Terminating background processes..."
  kill $(jobs -p) 2>/dev/null
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

order_pizza() {
  local token=$1
  status=$(execute_curl -X POST "$host/api/order" \
    -H 'Content-Type: application/json' \
    -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.0038 }]}' \
    -H "Authorization: Bearer $token")
  echo "Bought a pizza... $status"
}

# Run 10 diner loops in parallel, each ordering every ~60 seconds
for i in {1..10}; do
  while true; do
    token=$(login "d@jwt.com" "diner")
    order_pizza "$token"
    sleep 6
  done &
done

# Request menu every 3 seconds
while true; do
  status=$(execute_curl "$host/api/order/menu")
  echo "Requesting menu... $status"
  sleep 3
done &

# Invalid login every 25 seconds
while true; do
  execute_curl -X PUT "$host/api/auth" \
    -d '{"email":"unknown@jwt.com", "password":"bad"}' \
    -H 'Content-Type: application/json' > /dev/null
  echo "Invalid login attempt"
  sleep 25
done &

wait