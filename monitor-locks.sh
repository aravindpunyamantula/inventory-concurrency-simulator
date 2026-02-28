#!/bin/bash

PG_USER="user"
PG_DB="inventory_db"
DB_CONTAINER="inventory-concurrency-simulator-db-1"

while true; do
  clear
  echo "---- USER-LEVEL LOCKS (products table) ----"
  docker exec -it $DB_CONTAINER \
    psql -U $PG_USER -d $PG_DB \
    -c "
      SELECT
        a.pid,
        a.state,
        a.query,
        l.relation::regclass AS table,
        l.mode,
        l.granted
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE l.relation::regclass = 'products'::regclass;
    "
  sleep 1
done