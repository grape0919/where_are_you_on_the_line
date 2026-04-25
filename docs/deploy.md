# 배포 가이드 (VPS + GitHub Actions)

## 개요

```
로컬 git push main
      ↓
GitHub Actions (CI: 타입/테스트)
      ↓  SSH
VPS (203.245.41.221)
      ↓
deploy.sh:
  git pull → docker compose build
  → prisma migrate deploy
  → docker compose up -d
  → /api/health 체크
```

접속: `http://203.245.41.221:4000`

---

## 0. 첫 배포 빠른 체크리스트

```
[ ] (서버) git clone (deploy key 등록 또는 PAT URL)
[ ] (서버) .env.docker 작성 (ADMIN_SECRET, POSTGRES_PASSWORD 등)
[ ] (서버) bash scripts/deploy.sh → 첫 배포
[ ] (서버) http://203.245.41.221:4000/api/health → 200 OK 확인
[ ] (서버) bash prisma/seed 한 번 실행 (초기 마스터 데이터)
[ ] (서버) 백업 cron 등록 (scripts/backup.sh)
[ ] (서버) ufw 방화벽 (22, 4000)
[ ] (GitHub) Secrets 등록: SSH_HOST, SSH_USER, SSH_PRIVATE_KEY
[ ] (로컬) git push → Actions 자동 배포 동작 확인
[ ] (브라우저) /admin/login → 로그인 후 환자 1명 접수 → DB 저장 확인
```

---

## 1. 서버 최초 세팅 (한 번만)

SSH로 서버 접속 후 다음을 실행:

### 1-1. 배포 전용 유저 생성 (권장)

```bash
# root로 접속한 상태
adduser deploy
usermod -aG docker deploy
usermod -aG sudo deploy

# SSH key 등록 (로컬의 ~/.ssh/id_ed25519.pub 내용 복사)
mkdir -p /home/deploy/.ssh
vi /home/deploy/.ssh/authorized_keys   # 공개키 붙여넣기
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### 1-2. 저장소 클론

```bash
# deploy 유저로 전환
su - deploy

# GitHub 저장소 접근: HTTPS + personal access token 방식이 가장 간단
cd /home
sudo mkdir -p allrightclinic
sudo chown deploy:deploy allrightclinic
cd allrightclinic

# 첫 clone (public 저장소면 HTTPS 그대로, private이면 deploy key 필요)
git clone https://github.com/grape0919/where_are_you_on_the_line.git .
```

**Private 저장소인 경우 SSH deploy key:**

```bash
# 서버에서
ssh-keygen -t ed25519 -C "deploy@allright" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
# → 이 공개키를 GitHub 저장소 Settings → Deploy keys에 추가 (Read-only)

# SSH config
cat >> ~/.ssh/config <<'EOF'
Host github-allright
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_deploy
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

# 클론 (SSH 프로토콜)
cd /home/allrightclinic
git clone git@github-allright:grape0919/where_are_you_on_the_line.git .
```

### 1-3. `.env.docker` 생성

```bash
cd /home/allrightclinic
cp .env.example .env.docker
vi .env.docker
```

필수 수정 항목:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://203.245.41.221:4000

# 32자 이상 랜덤 문자열
ADMIN_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# PostgreSQL — 강력한 비밀번호로
POSTGRES_USER=allright
POSTGRES_PASSWORD=<랜덤 20자+>
POSTGRES_DB=allright

# 알리고 SMS (키 받은 후 채움, 우선 비워두고 배포 가능 → 콘솔 로그만)
ALIGO_API_KEY=
ALIGO_USER_ID=
ALIGO_SENDER=
# ALIGO_TESTMODE=Y   # 테스트 기간 중에는 켜두기
```

### 1-4. 방화벽 설정 (권장)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 4000/tcp    # 웹 (임시, 도메인+HTTPS 전환 시 80/443으로 교체)
sudo ufw enable
sudo ufw status
```

### 1-5. 첫 배포

```bash
cd /home/allrightclinic
bash scripts/deploy.sh
```

완료되면 `http://203.245.41.221:4000/api/health` 에서 `{"status":"ok",...}` 응답 확인.

### 1-6. 초기 마스터 데이터 seed (첫 배포 시 1회)

```bash
docker compose run --rm migrate npx tsx prisma/seed.ts
```

기본 진료항목 5종 + 의사 3명 + 전문과목 6종을 등록합니다. 이미 데이터가 있으면 upsert 처리되어 안전.

### 1-7. 백업 cron 등록 (필수)

```bash
sudo crontab -e
# 추가:
0 3 * * * cd /home/allrightclinic && bash scripts/backup.sh >> /var/log/allright-backup.log 2>&1
```

자세한 백업 정책은 §6 참조.

---

## 2. GitHub Actions 자동 배포 설정

### 2-1. Secrets 등록

GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret** 에 다음 4개 등록:

| 이름 | 값 |
|------|----|
| `SSH_HOST` | `203.245.41.221` |
| `SSH_USER` | `deploy` (또는 `root`) |
| `SSH_PORT` | `22` (선택, 기본값 22) |
| `SSH_PRIVATE_KEY` | 로컬의 `~/.ssh/id_ed25519` **개인키** 전체 내용 (BEGIN/END 라인 포함) |

### 2-2. 동작 확인

```bash
# 로컬에서 main 푸시
git push origin main
```

GitHub → Actions 탭에서 진행 상황 확인.

### 2-3. 수동 트리거

Actions → Deploy to VPS → **Run workflow** 버튼으로 언제든 재배포 가능.

---

## 3. 운영 명령

```bash
# 로그 확인
docker compose logs -f web

# 재시작만 (코드 변경 없이)
docker compose restart web

# DB 접속
docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB

# Prisma Studio (임시로 외부에서 접근하려면 ports 열기)
docker compose exec web npx prisma studio

# 전체 종료
docker compose down
```

---

## 4. 배포 실패 시 롤백

```bash
cd /home/allrightclinic
git log --oneline -5               # 커밋 확인
git reset --hard <이전-커밋-SHA>
bash scripts/deploy.sh
```

---

## 5. 도메인/HTTPS 전환 시 (나중에)

도메인 구입 후 Caddy 추가 권장 (Let's Encrypt 자동):

```yaml
# docker-compose.yml에 추가
caddy:
  image: caddy:2-alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
  depends_on:
    - web
```

`Caddyfile`:
```
queue.example.com {
    reverse_proxy web:4000
}
```

---

## 6. DB 영속성 + 백업

### 6-1. 데이터 위치 (영속)

PostgreSQL 데이터는 **Docker named volume `allright_db_data`** 에 저장됩니다:
- 호스트 경로: `/var/lib/docker/volumes/allright_db_data/_data`
- 살아남는 명령: `docker compose down`, `restart`, `up -d --force-recreate`, 서버 재부팅
- **삭제되는 명령**: ⚠️ `docker compose down -v`, `docker volume rm allright_db_data`

### 6-2. 일일 자동 백업 (필수)

```bash
# 서버에서 1회 실행
sudo crontab -e
# 다음 한 줄 추가 (매일 새벽 3시):
0 3 * * * cd /home/allrightclinic && bash scripts/backup.sh >> /var/log/allright-backup.log 2>&1
```

백업 파일: `/home/allrightclinic/backups/allright_YYYYMMDD_HHMMSS.sql.gz`
- 30일 이상 된 백업 자동 정리
- pg_dump → gzip 압축 (보통 수십 KB ~ 수 MB)

### 6-3. 수동 백업

```bash
cd /home/allrightclinic
bash scripts/backup.sh
```

### 6-4. 복구

```bash
cd /home/allrightclinic
bash scripts/restore.sh backups/allright_20260424_030000.sql.gz
# 확인 메시지 → "yes" 입력 → 복구 (웹 일시 중지 → 복구 → 재시작)
```

### 6-5. 외부 백업 (강력 권장)

VPS 자체 장애 대비 — 백업 파일을 외부로 주기 동기화:

```bash
# 옵션 A: 로컬 PC로 rsync (수동/cron)
rsync -avz deploy@203.245.41.221:/home/allrightclinic/backups/ ~/allright-backups/

# 옵션 B: AWS S3 (s3cmd 또는 awscli 설치 후)
# crontab 추가:
30 3 * * * aws s3 sync /home/allrightclinic/backups/ s3://my-bucket/allright/ --storage-class STANDARD_IA
```
