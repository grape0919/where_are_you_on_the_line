#!/usr/bin/env bash
# PostgreSQL 백업 스크립트.
# 사용: bash scripts/backup.sh
# 매일 새벽 자동 실행: crontab -e 후 아래 한 줄 추가
#   0 3 * * * cd /home/allrightclinic && bash scripts/backup.sh >> /var/log/allright-backup.log 2>&1

set -euo pipefail

APP_DIR="${APP_DIR:-/home/allrightclinic}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

DB_USER="$(grep -E '^POSTGRES_USER=' "$APP_DIR/.env.docker" | cut -d= -f2)"
DB_NAME="$(grep -E '^POSTGRES_DB=' "$APP_DIR/.env.docker" | cut -d= -f2)"

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
  echo "[backup] .env.docker 에서 POSTGRES_USER/POSTGRES_DB 를 읽을 수 없습니다."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TS=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/allright_${TS}.sql.gz"

echo "[backup] DB → $OUT"
docker exec allright-db pg_dump -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl --clean --if-exists \
  | gzip > "$OUT"

# 검증: 압축 풀어서 줄 수 확인
LINES=$(gunzip -c "$OUT" | wc -l)
SIZE=$(du -h "$OUT" | cut -f1)
echo "[backup] 완료: $SIZE, $LINES lines"

# 오래된 백업 자동 삭제
find "$BACKUP_DIR" -name 'allright_*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[backup] $RETENTION_DAYS일 초과 백업 정리 완료"

# 최근 5개 표시
echo "[backup] 최근 백업:"
ls -lh "$BACKUP_DIR"/allright_*.sql.gz | tail -5
