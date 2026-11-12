# cPanel-də yerləşdirmə (hosting.com / A2) — Zavod.az

Zavod.az marketinq.az ilə **eyni cPanel hesabında** işləyir: Setup Node.js App (Node 22) + PostgreSQL.
Hesabdakı digər saytlara (marketinq.az, podcast.az, …) toxunulmur.

## Serverdə qovluqlar
```
~/zavod-src/      git checkout — yalnız build üçün
~/zavod-app/      Node app root: app.js, current → releases/<id>, releases/, shared/.env, shared/uploads/
~/zavod-public/   saytın document root-u (yalnız .htaccess + media linki)
~/backups/zavod/  gündəlik baza backup-ı
```

## A. İlk quraşdırma
1. **Resurs yoxlaması:** `DATABASE_URL` hələ olmadığı üçün 4-cü addımdan sonra et (aşağıya bax).
2. **PostgreSQL:** PostgreSQL Database Wizard → baza `zavod`, istifadəçi `zavodapp` (adlar fərqli olmalıdır), ALL PRIVILEGES. Parolu yalnız `shared/.env`-ə yaz.
3. **Kod:** deploy key (yalnız oxuma) ilə private repo-nu klonla:
   ```
   ssh-keygen -q -t ed25519 -N "" -f ~/.ssh/zavod_deploy -C "zavod cpanel deploy (read-only)"
   printf 'Host github-zavod\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/zavod_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
   cat ~/.ssh/zavod_deploy.pub     → GitHub → repo → Settings → Deploy keys (write access YOX)
   git clone github-zavod:<OWNER>/<REPO>.git ~/zavod-src
   ```
4. **Qovluqlar və .env:**
   ```
   mkdir -p ~/zavod-app/{shared/uploads,releases,tmp} ~/zavod-public ~/backups/zavod
   cp ~/zavod-src/deploy/cpanel/{app.js,package.json} ~/zavod-app/
   cp ~/zavod-src/deploy/cpanel/env.example ~/zavod-app/shared/.env && chmod 600 ~/zavod-app/shared/.env
   ```
   `.env`-i File Manager-də doldur (DATABASE_URL, IP_HASH_SALT, ADMIN_EMAIL, ADMIN_PASSWORD). `SITE_URL` və `SITE_NOINDEX` build zamanı oxunur.
   **Resurs yoxlaması** (`.env` doldurulandan sonra): Terminal → `DATABASE_URL="$(grep -E '^DATABASE_URL=' ~/zavod-app/shared/.env | cut -d= -f2- | tr -d "'\"")" bash ~/zavod-src/deploy/cpanel/check-server.sh` — nəticəni developer-ə göndər.
5. **İlk build:** `bash ~/zavod-src/deploy/cpanel/deploy.sh`, sonra
   `cd ~/zavod-src && PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH npm run db:seed-admin`
6. **Domen:** Domains → Create A New Domain → `new.zavod.az`, document root `zavod-public` (AutoSSL sertifikatı verir).
7. **Node app:** Setup Node.js App → Create: Node 22.x, Production, root `zavod-app`, URL `new.zavod.az`, startup `app.js`,
   env `NODE_OPTIONS=--max-old-space-size=768 --v8-pool-size=2` → Create → Start. ("Run NPM Install" basma.)
8. **.htaccess:** `~/zavod-public/.htaccess`-in ən yuxarısına `htaccess.txt`-dəki qaydalar (`zavod.az` əvəzinə `new.zavod.az`).
9. **Backup cron:** `45 3 * * * bash $HOME/zavod-src/deploy/cpanel/backup.sh >> $HOME/backups/zavod/backup.log 2>&1`
10. **Yoxla:** https://new.zavod.az — header/footer, dillər, /admin girişi, robots.txt `Disallow: /`.

## B. Yeniləmə
`git push`, sonra serverdə: `bash ~/zavod-src/deploy/cpanel/deploy.sh`. Geri qaytarma: `bash ~/zavod-src/deploy/cpanel/rollback.sh [id]`.
Build 1 CPU-da bir neçə dəqiqə çəkir — yeniləmələri axşam/gecə et.

## Bilmək lazım olanlar
- Yaddaş limiti 768 MB-dır (marketinq 1024): hesabda 4 GB RAM 3+ Node tətbiqi arasında bölünür.
- Thread limiti 150-dir: `deploy.sh` thread hovuzlarını kiçildir; `check-server.sh` cari istifadəni göstərir.
