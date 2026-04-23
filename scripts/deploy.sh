#!/usr/bin/env bash
# 서버에서 배포를 수행하는 스크립트.
# 사용: /home/allrightclinic/scripts/deploy.sh
# 또는 GitHub Actions에서 SSH로 호출.

set -euo pipefail

APP_DIR="${APP_DIR:-/home/allrightclinic}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
HEALTH_URL="${HEALTH_URL:-http://localhost:4000/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

log() { echo "[$(date +%H:%M:%S)] $*"; }

cd "$APP_DIR"

log "▶ 최신 커밋 가져오기 ($BRANCH)"
git fetch --all --prune
git reset --hard "origin/$BRANCH"
COMMIT=$(git rev-parse --short HEAD)
log "  현재 커밋: $COMMIT"

log "▶ 이미지 빌드 (캐시 활용)"
docker compose -f "$COMPOSE_FILE" build web migrate

log "▶ DB 마이그레이션 적용"
docker compose -f "$COMPOSE_FILE" run --rm migrate

log "▶ 서비스 재시작 (무중단: 변경된 것만 recreate)"
docker compose -f "$COMPOSE_FILE" up -d db
docker compose -f "$COMPOSE_FILE" up -d web

log "▶ 헬스 체크 (최대 ${HEALTH_TIMEOUT}s)"
elapsed=0
while [ $elapsed -lt "$HEALTH_TIMEOUT" ]; do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    log "✅ 배포 완료 ($COMMIT) — health OK"
    break
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

if [ $elapsed -ge "$HEALTH_TIMEOUT" ]; then
  log "❌ 헬스 체크 실패 — 최근 로그:"
  docker compose -f "$COMPOSE_FILE" logs --tail=50 web
  exit 1
fi

log "▶ 사용하지 않는 이미지 정리"
docker image prune -f > /dev/null

log "🎉 배포 성공: $COMMIT"
