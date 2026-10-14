#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
test_container="neseli-database-test-$$"
docker run -d --rm --name "$test_container" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17 >/dev/null
trap 'docker stop "$test_container" >/dev/null' EXIT
ready=false
for attempt in {1..60}; do
  if docker exec "$test_container" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 0.2
done
if [ "$ready" != true ]; then echo 'PostgreSQL did not start'; exit 1; fi
docker exec -i "$test_container" psql -U postgres -v ON_ERROR_STOP=1 -q < test/supabase-bootstrap.sql
docker exec -i "$test_container" psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/01-setup.sql
docker exec -i "$test_container" psql -U postgres -v ON_ERROR_STOP=1 -q < test/supabase-validation.sql
