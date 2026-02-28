#!/bin/bash

ENDPOINT=$1
PRODUCT_ID=1
QUANTITY=1
BASE_URL="http://localhost:8080"

if [ -z "$ENDPOINT" ]; then
  echo "Usage: $0 <pessimistic|optimistic>"
  exit 1
fi

echo "----------------------------------------"
echo "Resetting inventory"
echo "----------------------------------------"
curl -s -X POST "$BASE_URL/api/products/reset"
echo
sleep 1

echo "----------------------------------------"
echo "Running concurrent test: $ENDPOINT"
echo "Requests: 30 | Quantity per order: $QUANTITY"
echo "----------------------------------------"

for i in {1..30}
do
  (
    RESPONSE=$(curl -s -w " HTTP:%{http_code}" \
      -X POST "$BASE_URL/api/orders/$ENDPOINT" \
      -H "Content-Type: application/json" \
      -d "{
        \"productId\": $PRODUCT_ID,
        \"quantity\": $QUANTITY,
        \"userId\": \"user-$ENDPOINT-$i\"
      }")

    echo "Request $i → $RESPONSE"
  ) &
done

wait
echo
echo "----------------------------------------"
echo "Order statistics"
echo "----------------------------------------"
curl -s "$BASE_URL/api/orders/stats"
echo