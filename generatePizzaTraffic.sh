#!/bin/bash

# Check if host is provided as a command line argument
if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi
host=$1

# Cleanup function to terminate background processes on Ctrl+C
cleanup() {
  echo "Terminating background processes..."
  kill $pid1 $pid2 $pid3 $pid4 $pid5 2>/dev/null
  exit 0
}
trap cleanup SIGINT

# Helper to execute curl and return only the HTTP status code
execute_curl() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

# Function to login and return the token
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

# 3) Franchisee: login, wait 110 sec, logout, wait 10 sec, repeat
while true; do
  token=$(login "f@jwt.com" "franchisee")
  echo "Login franchisee... $([ -z "$token" ] && echo "false" || echo "true")"
  sleep 110
  status=$(execute_curl -X DELETE "$host/api/auth" -H "Authorization: Bearer $token")
  echo "Logging out franchisee... $status"
  sleep 10
done &
pid3=$!

# 4) Diner: login, order a pizza, wait 20 sec, logout, wait 30 sec, repeat
while true; do
  token=$(login "d@jwt.com" "diner")
  echo "Login diner... $([ -z "$token" ] && echo "false" || echo "true")"
  status=$(execute_curl -X POST "$host/api/order" \
    -H 'Content-Type: application/json' \
    -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}' \
    -H "Authorization: Bearer $token")
  echo "Bought a pizza... $status"
  sleep 20
  status=$(execute_curl -X DELETE "$host/api/auth" -H "Authorization: Bearer $token")
  echo "Logging out diner... $status"
  sleep 30
done &
pid4=$!

# 5) Hungry diner: try to order 22 pizzas (should fail) every 5 minutes
while true; do
  token=$(login "d@jwt.com" "diner")
  echo "Login hungry diner... $([ -z "$token" ] && echo "false" || echo "true")"
  
  # Build an array of 22 identical items (21 more after the first)
  items='{ "menuId": 1, "description": "Veggie", "price": 0.05 }'
  for (( i=0; i < 21; i++ )); do
    items="$items, { \"menuId\": 1, \"description\": \"Veggie\", \"price\": 0.05 }"
  done
  
  status=$(execute_curl -X POST "$host/api/order" \
    -H 'Content-Type: application/json' \
    -d "{\"franchiseId\": 1, \"storeId\":1, \"items\":[$items]}" \
    -H "Authorization: Bearer $token")
  echo "Bought too many pizzas... $status"
  sleep 5
  status=$(execute_curl -X DELETE "$host/api/auth" -H "Authorization: Bearer $token")
  echo "Logging out hungry diner... $status"
  sleep 295
done &
pid5=$!

# Wait for all background processes (this keeps the script running)
wait $pid1 $pid2 $pid3 $pid4 $pid5