#!/usr/bin/env bash
# PostgreSQL 복구 스크립트.
# 사용: bash scripts/restore.sh /home/allrightclinic/backups/allright_20260424_030000.sql.gz

if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi

set -euo pipefail

APP_DIR="${APP_DIR:-/home/allrightclinic}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "사용법: $0 <backup-file.sql.gz>"
  echo "최근 백업 목록:"
  ls -lh "$APP_DIR/backups"/allright_*.sql.gz 2>/dev/null | tail -10 || echo "  (백업 없음)"
  exit 1
fi

DB_USER="$(grep -E '^POSTGRES_USER=' "$APP_DIR/.env.docker" | cut -d= -f2)"
DB_NAME="$(grep -E '^POSTGRES_DB=' "$APP_DIR/.env.docker" | cut -d= -f2)"

read -p "⚠️  '$DB_NAME' DB를 '$BACKUP_FILE' 로 덮어씁니다. 계속하시겠습니까? (yes/no) " confirm
if [ "$confirm" != "yes" ]; then
  echo "취소됨."
  exit 0
fi

echo "[restore] 웹 서비스 일시 중지"
docker compose -f "$APP_DIR/docker-compose.yml" stop web

echo "[restore] DB 복구 중..."
gunzip -c "$BACKUP_FILE" | docker exec -i allright-db psql -U "$DB_USER" -d "$DB_NAME"

echo "[restore] 웹 서비스 재시작"
docker compose -f "$APP_DIR/docker-compose.yml" start web

echo "[restore] 완료."
