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
5. **İlk build:** `bash ~/zavod-src/deploy/cpanel/deploy.sh` (ilkin məzmunu — `db:seed-content` — build-dən əvvəl özü yazır), sonra admin:
   `cd ~/zavod-src && PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH npm run db:seed-admin`
6. **Domen:** Domains → Create A New Domain → `new.zavod.az`, document root `zavod-public` (AutoSSL sertifikatı verir).
7. **Node app:** Setup Node.js App → Create: Node 22.x, Production, root `zavod-app`, URL `new.zavod.az`, startup `app.js`,
   env `NODE_OPTIONS=--max-old-space-size=768 --v8-pool-size=2` → Create → Start. ("Run NPM Install" basma.)
8. **.htaccess:** `~/zavod-public/.htaccess`-in ən yuxarısına `htaccess.txt`-dəki qaydalar (`zavod.az` əvəzinə `new.zavod.az`).
9. **Backup cron:** `45 3 * * * bash $HOME/zavod-src/deploy/cpanel/backup.sh >> $HOME/backups/zavod/backup.log 2>&1`
   **Şəkil təmizləmə cron-u:** admin formunda yüklənib saxlanmayan (tərk edilmiş) şəkilləri 24 saatdan sonra silir:
   `30 4 * * * cd $HOME/zavod-src && PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH UPLOAD_DIR=$HOME/zavod-app/shared/uploads npm run --silent media:sweep >> $HOME/zavod-app/shared/media-sweep.log 2>&1`
   (`UPLOAD_DIR` `.env`-dəkindən fərqlidirsə, burada da eynisini yaz.)
10. **Yoxla:** https://new.zavod.az — header/footer, dillər, /admin girişi, robots.txt `Disallow: /`.

## B. Yeniləmə
`git push`, sonra serverdə: `bash ~/zavod-src/deploy/cpanel/deploy.sh`. Geri qaytarma: `bash ~/zavod-src/deploy/cpanel/rollback.sh [id]`.
Build 1 CPU-da bir neçə dəqiqə çəkir — yeniləmələri axşam/gecə et.

## Bilmək lazım olanlar
- **Yüklənmiş şəkillər** `UPLOAD_DIR`-dədir (`app.js` default olaraq `~/zavod-app/shared/uploads` verir; başqa yer lazımdırsa app qovluğundan kənarda mütləq yol yaz, məs. `~/zavod-uploads`). Production-da bu dəyişən məcburidir. `deploy.sh` və `rollback.sh` bu qovluğu silmir və əvəz etmir; əl ilə də `releases/` altına qoyma. `deploy.sh`-dakı `~/zavod-public/media` symlink-i və `media.htaccess` `shared/uploads`-a işarə edir: `UPLOAD_DIR` köçürülsə, onlar da (symlink hədəfi və `.htaccess` surəti) birlikdə köçürülməlidir. `backup.sh` yalnız `shared/uploads`-u yedəkləyir, başqa yol seçsən yedəyi də ona uyğunlaşdır.
- **Lüğət (şəhər, sahə, məhsul tipi, istehsalat modeli) tamamilə boşaldılsa**, növbəti `deploy.sh` seed-i onu yenidən doldurur (R6): boş lüğət səhv deyil, ilkin siyahı qayıdır. Qəsdən boş saxlamaq mümkün deyil; lazımsız yazıları ayrı-ayrı sil.
- **Host body limiti**: `/api/admin/media` (örtük şəkli yükləmə) 8 MB faylı + multipart başlığını qəbul edir, yəni LiteSpeed/Apache body limiti ≥ 8,1 MB olmalıdır (`LimitRequestBody`, LiteSpeed "Max Request Body Size"). İlk deploy-dan sonra admin paneldən bir real örtük şəkli yükləyib yoxla; 413 gəlirsə limiti qaldır.
- Yaddaş limiti 768 MB-dır (marketinq 1024): hesabda 4 GB RAM 3+ Node tətbiqi arasında bölünür.
- Thread limiti 150-dir: `deploy.sh` thread hovuzlarını kiçildir; `check-server.sh` cari istifadəni göstərir.

## Sıxılma (brotli / gzip)
JS/CSS ötürmə ölçüsünə ən çox təsir edən budur (brotli gzip-dən ~17 KB az, R13 ölçməsi).
- **Yoxla:** `curl -sI -H 'Accept-Encoding: br, gzip' https://new.zavod.az/_next/static/chunks/<fayl>.js | grep -i content-encoding`
  (fayl adını səhifə mənbəyindən götür) və eyni yoxlamanı `/` üçün et. `br` və ya `gzip` görünməlidir.
- Next.js özü gzip edir (`compress` default `true`, `next.config.ts`-də söndürülməyib), amma brotli vermir və 1 CPU-da hər
  sorğuda sıxmaq yük yaradır. Hostinq (LiteSpeed/Apache) sıxırsa, ikiqat iş olmasın deyə `compress: false` etmək olar —
  yalnız yuxarıdakı yoxlama hostinqin özünün sıxdığını göstərəndən sonra.
- **LiteSpeed / Apache:** cPanel → Software → “Optimize Website” → “Compress All Content” (domen üçün `.htaccess`-ə DEFLATE yazır;
  LiteSpeed brotli-ni server səviyyəsində verə bilər — yoxlama göstərəcək). Və ya əl ilə `~/zavod-public/.htaccess`-ə
  (Passenger blokundan yuxarı):
  ```
  <IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript application/json image/svg+xml text/xml application/xml
  </IfModule>
  <IfModule mod_brotli.c>
    AddOutputFilterByType BROTLI_COMPRESS text/html text/css application/javascript text/javascript application/json image/svg+xml text/xml application/xml
  </IfModule>
  ```
  Dəyişiklikdən sonra yoxlamanı təkrarla.

## Buraxılışdan əvvəl (zavod.az-a keçməzdən öncə)
- [ ] Seed-dəki lorem/Figma mətnlərini real məzmunla əvəz et (admin): FAQ sualları, İstifadəçi qaydaları və Məxfilik siyasəti mətni,
      Tariflər səhifəsinin giriş mətni və SEO təsviri; hər səhifədə EN və RU sahələrini doldur (boş qalan AZ-a düşür).
- [ ] `contact_messages` (şəxsi məlumat: ad, e-mail, telefon) üçün saxlama müddəti qərarlaşdır (məs. 12 ay) və köhnələrini silən
      cron qur; `rate_limits` cədvəlindən vaxtı keçmiş sətirləri təmizləyən cron əlavə et (məs. gündə bir dəfə
      `delete from rate_limits where window_start < now() - interval '1 day'`).
- [ ] Əlaqə formu limiti IP başına saatda 5 mesajdır: mobil operatorların CGNAT-ı arxasında çox istifadəçi bir IP paylaşır —
      ilk həftələrdə `rate_limits`-də limitə çatan `contact:%` açarlarını izlə, lazım olsa limiti artır.
- [ ] `shared/.env`-də `SITE_NOINDEX`-i sil (və ya `0` et), `SITE_URL=https://zavod.az` yaz, sonra `deploy.sh` ilə yenidən build et
      (hər ikisi build zamanı oxunur); robots.txt-də `Disallow: /` və cavablarda `X-Robots-Tag: noindex` başlığı olmadığını yoxla.
