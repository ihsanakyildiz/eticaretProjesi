#!/usr/bin/env bash
# Canlı sunucu güncellemesi — public/uploads içeriğine DOKUNMAZ.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

UPLOADS_DIR="$ROOT/public/uploads"
PM2_NAME="${PM2_NAME:-ihsanakyildiz}"
BRANCH="${DEPLOY_BRANCH:-main}"

if [[ ! -d "$UPLOADS_DIR" ]]; then
  mkdir -p "$UPLOADS_DIR"
  echo "Uyarı: $UPLOADS_DIR yoktu, boş klasör oluşturuldu."
fi

# Güvenlik: uploads içindeki dosya sayısını not et (silinmediğini doğrulamak için)
before_count="$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')"

echo "==> Git durumu"
git status --short

# uploads untracked kalır; pull'u engelleyen tipik şeyler: package-lock.json, public favicon vb.
# Bu yerel farkları geçici stash'e al (uploads dahil edilmez), pull sonrası stash silinir —
# canlıda kaynak olarak Git'teki sürüm kullanılır; npm ci lock dosyasını yeniden kurar.
blocking="$(git status --porcelain | grep -vE '^\?\? (public/)?uploads/' || true)"
STASHED=0
if [[ -n "$blocking" ]]; then
  echo "Uyarı: pull'u engelleyebilecek yerel değişiklikler var — stash'leniyor:"
  echo "$blocking"
  # Yalnızca tracked değişiklikler; uploads untracked olduğu için buraya girmez
  if git stash push -m "pre-deploy $(date -u +%Y%m%dT%H%M%SZ)" -- package-lock.json public/ 2>/dev/null; then
    STASHED=1
    echo "Stash alındı (uploads dokunulmadı)."
  else
    # pathspec eşleşmezse tüm tracked değişikleri dene (uploads yine untracked kalır)
    git stash push -m "pre-deploy $(date -u +%Y%m%dT%H%M%SZ)" -- .
    STASHED=1
    echo "Stash alındı (geniş pathspec)."
  fi
fi

echo "==> git pull origin ${BRANCH}"
git pull origin "$BRANCH"

if [[ "$STASHED" -eq 1 ]]; then
  echo "==> Geçici stash atılıyor (sunucu yerel kopyası yerine repo sürümü kullanılacak)"
  git stash drop || true
fi

echo "==> npm bağımlılıkları"
if [[ -f package-lock.json ]]; then
  if ! npm ci; then
    echo "Uyarı: npm ci başarısız (lock senkron değil). npm install ile devam ediliyor."
    rm -rf node_modules
    npm install
  fi
else
  npm install
fi

if [[ -f prisma/schema.prisma ]]; then
  echo "==> prisma generate"
  npx prisma generate
  echo "==> prisma db push"
  npx prisma db push --skip-generate
fi

echo "==> npm run build"
npm run build

echo "==> pm2 restart ${PM2_NAME}"
pm2 restart "$PM2_NAME"

after_count="$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')"
echo "==> public/uploads dosya sayısı: önce=${before_count} sonra=${after_count}"
if [[ "$after_count" -lt "$before_count" ]]; then
  echo "HATA: uploads dosya sayısı azaldı! Deploy uploads'a dokunmamalı."
  exit 1
fi

echo "Tamam. uploads korundu."
