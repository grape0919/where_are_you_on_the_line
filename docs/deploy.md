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

## 6. DB 백업

```bash
# 일일 백업 cron (서버에서)
crontab -e
# 추가:
0 2 * * * docker exec allright-db pg_dump -U allright allright | gzip > /home/allrightclinic/backups/allright-$(date +\%Y\%m\%d).sql.gz
```
