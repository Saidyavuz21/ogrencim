#!/usr/bin/env bash
# Veritabanı yetki (RLS) testleri. Tek işlemde çalışır ve sonunda geri alınır; veritabanında iz kalmaz.
# Kullanım: TEST_DATABASE_URL=postgres://… scripts/test-rls.sh
set -euo pipefail
: "${TEST_DATABASE_URL:?TEST_DATABASE_URL tanımlı değil}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -q -P pager=off -f "$HERE/supabase/tests/rls_test.sql"
