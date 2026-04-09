#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 https://pizza-service.mrpizzajohn.com"
  exit 1
fi

host=$1

cleanup() {
  echo ""
  echo "Caught interrupt — killing background processes..."
  kill $(jobs -p) 2>/dev/null
  exit 0
}
trap cleanup SIGINT

execute_curl() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

register() {
  curl -s -X POST "$host/api/auth" \
    -d "{\"name\":\"diner$1\", \"email\":\"diner$1@jwt.com\", \"password\":\"diner$1pass\"}" \
    -H 'Content-Type: application/json' > /dev/null
}

login() {
  response=$(curl -s -X PUT "$host/api/auth" \
    -d "{\"email\":\"$1\", \"password\":\"$2\"}" \
    -H 'Content-Type: application/json')
  sleep 2
  echo "$response" | jq -r '.token'
}

logout() {
  execute_curl -X DELETE "$host/api/auth" \
    -H "Authorization: Bearer $1" > /dev/null
}

order_pizza() {
  local token=$1
  status=$(execute_curl -X POST "$host/api/order" \
    -H 'Content-Type: application/json' \
    -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.0038 }]}' \
    -H "Authorization: Bearer $token")
  echo "$status"
}

echo "================================================"
echo " JWT Pizza Traffic Simulator (Light)"
echo " Target: $host"
echo " Started: $(date)"
echo "================================================"
echo ""

# -------------------------------------------------------
# 0. SETUP — register 3 unique diner accounts
# -------------------------------------------------------
echo "Registering diner accounts..."
for i in {1..3}; do
  register $i
  echo "  Registered diner$i@jwt.com"
done
echo "All accounts ready."
echo ""

# -------------------------------------------------------
# 1. STEADY NORMAL ORDERS — 3 diners, ~1 order/min each (~3/min total)
# -------------------------------------------------------
for i in {1..3}; do
  while true; do
    token=$(login "diner$i@jwt.com" "diner${i}pass")
    if [ -n "$token" ] && [ "$token" != "null" ]; then
      status=$(order_pizza "$token")
      echo "[Order  | diner $i ] HTTP $status — $(date +%H:%M:%S)"
      logout "$token"
    else
      echo "[Order  | diner $i ] LOGIN FAILED — $(date +%H:%M:%S)"
    fi
    sleep 60
  done &
done

# -------------------------------------------------------
# 2. MENU REQUESTS — every 40s (~1.5/min)
# -------------------------------------------------------
while true; do
  status=$(execute_curl "$host/api/order/menu")
  echo "[Menu   |         ] HTTP $status — $(date +%H:%M:%S)"
  sleep 40
done &

# -------------------------------------------------------
# 3. ORDER HISTORY FETCH — every 2 min (light)
# -----