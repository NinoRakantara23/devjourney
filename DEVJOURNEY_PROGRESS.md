# DEVJOURNEY — Progress Verification & Audit

## Riwayat Sesi

### 2026-11-08 — Fase 3: Notification Center

**Status:** Selesai dan teruji. Menunggu persetujuan baru sebelum Fase 4 — Profil.

**Cakupan:**
- Lonceng Topbar aktif dengan badge jumlah belum dibaca.
- Panel notifikasi responsif (desktop dan mobile) dengan loading, empty, error, dan retry state.
- Notifikasi diturunkan dari data nyata: tugas terlambat, tugas terhambat, dan milestone mendatang.
- Preferensi Fase 2 terintegrasi: toggle overdue, blocked, upcoming, dan jendela 3/7/14/30 hari.
- Tandai satu notifikasi dibaca dan tandai semua dibaca; status baca bertahan setelah reload.
- ID notifikasi stabil dan dideduplikasi agar refresh/navigasi tidak membuat duplikat.
- Quick Add dan Settings diuji ulang sebagai regresi.

**Penyimpanan:**
- Tidak ada tabel, endpoint, atau migration baru.
- Notifikasi dibangun dari `GET /tasks` dan `GET /milestones?status=planned`.
- Status baca disimpan di localStorage `dj-notification-reads` (per browser/perangkat).
- Preferensi tetap memakai `dj-notification-prefs` dari Fase 2.

**File aplikasi yang berubah:**
- `src/notifications.ts` (baru)
- `src/components/notifications/NotificationCenter.tsx` (baru)
- `src/components/Header.tsx`
- `dist/*` dan artefak deployment frontend

**Pengujian:**
- `npm run typecheck`: lolos.
- `npm run build`: lolos, 1.603 modul.
- E2E terhadap database uji `devjourney_final_verify_20261028`: **21/21 PASS**.
- Smoke test produksi: **6/6 PASS**.
- Tidak ada request `POST/PATCH/DELETE`, console error, page error, atau API error selama pengujian.
- Data uji Fase 3 di database uji: 2 tugas dan 2 milestone berjudul `ZZ Notif Phase3 ...`; produksi tidak diubah.

**Deployment:**
- Frontend produksi: `C:\xampp\htdocs\devjourney`.
- Aset baru: `index-8JNqiMUp.js` dan `index-CUm8dhSV.css`.
- `api/config.php` tetap menunjuk database `devjourney`.
- Produksi tetap 4 proyek, 0 tugas, 0 milestone, 0 roadmap stage, 0 session, 0 skill, 0 resource, 0 note, 2 migration.
- Hash kedua backup di `database/backups/` tidak berubah.

### 2026-11-02 — Final pre-AI verification (lanjutan)

**Tahap terakhir:** Audit read-only aturan akses direktori Apache, `.htaccess`, dan paparan file backup di web root.

**Workspace:** `D:\belajar\devjourney\devjourney`
**Deployment:** `C:\xampp\htdocs\devjourney`
**Status:** Audit keamanan read-only sedang berjalan. Tidak ada perubahan konfigurasi, database, backup, atau kode aplikasi.

---

## Baseline Historis (belum diverifikasi ulang pada sesi ini)

- PHP lint: lolos.
- TypeScript typecheck: lolos.
- Frontend production build: lolos.
- API CRUD pada database uji: 51 PASS, 0 FAIL.
- Browser E2E: 40 PASS, 0 FAIL.
- Production smoke test: 20 PASS, 0 FAIL.
- Quick Add: 4 PASS.
- Loading state: 2 PASS.
- Deployment hash: 11 file cocok.
- Migration 001 dan 002 sudah diterapkan di produksi.
- Backup sebelum migration 001 dan 002 sudah direstore ke database terpisah.
- Produksi `devjourney`: 4 proyek; tabel aktivitas masih kosong.

Baseline ini adalah hasil historis, bukan hasil pengujian baru pada sesi ini.

---

## Pemeriksaan Sesi Ini

### 1. Progress dan kondisi workspace

**Perintah:**
- Cek keberadaan `DEVJOURNEY_PROGRESS.md`.
- List root workspace.
- `git status --short`.
- Cek file kunci.

**Hasil aktual:**
- `DEVJOURNEY_PROGRESS.md` sebelumnya tidak ada.
- Workspace berisi `api`, `database`, `dist`, `node_modules`, `public`, `src`, dan file konfigurasi frontend.
- Git repo ada, tetapi seluruh file masih untracked; belum ada commit baseline.
- `.gitignore` tidak ada.
- File kunci `api/index.php`, `api/config.php`, `database/schema.sql`, `README.md`, dan `package.json` tersedia.

**Temuan:**
- Riwayat pekerjaan sebelumnya hanya tersimpan di percakapan.
- Belum ada baseline Git untuk membandingkan perubahan.

**Risiko:**
- Perubahan kode di masa depan sulit dilacak tanpa commit awal.

**Status:** selesai untuk langkah ini.

---

### 2. Aturan akses direktori Apache

**File yang diperiksa:**
- `C:\xampp\apache\conf\httpd.conf`
- `C:\xampp\apache\conf\extra\httpd-xampp.conf`

**Perintah:**
- Ekstrak blok `<Directory>` dan directive `AllowOverride`, `Require`, `Options`, `Order`, `Allow`, `Deny`.

**Hasil aktual:**

`httpd.conf`:
- `<Directory />`: `AllowOverride none`, `Require all denied`.
- `<Directory "C:/xampp/htdocs">`:
  - `Options Indexes FollowSymLinks Includes ExecCGI`
  - `AllowOverride All`
  - `Require all granted`
- `<Directory "C:/xampp/cgi-bin">`: `AllowOverride All`, `Options None`, `Require all granted`.
- Ada directive `Require all denied` lain pada baris 296, di luar blok htdocs.

`httpd-xampp.conf`:
- `C:/xampp/php`: `AllowOverride None`, `Options None`, `Require all denied`; hanya `php-cgi.exe` yang `Require all granted`.
- `C:/xampp/htdocs/xampp`: `AllowOverride AuthConfig`.
- `C:/xampp/licenses`: `Options +Indexes`, `Require local`.
- `C:/xampp/phpMyAdmin`: `AllowOverride AuthConfig`, `Require local`.
- `C:/xampp/webalizer`: `AllowOverride AuthConfig`, `Require local`.

**Temuan:**
- `htdocs` mengizinkan semua akses (`Require all granted`) dan mengizinkan `.htaccess` override (`AllowOverride All`).
- `Options Indexes` aktif pada `htdocs`, sehingga directory listing dapat terjadi jika tidak ada file index.
- Tidak ada pembatasan khusus DevJourney pada level Apache; pembatasan hanya bergantung pada `.htaccess` aplikasi.

**Risiko:**
- Aplikasi mengikuti aturan `htdocs` yang terbuka untuk semua interface.
- Directory listing dan `ExecCGI` memperbesar permukaan serangan.

**Status:** selesai untuk langkah ini.

---

### 3. `.htaccess` dan file index

**File yang diperiksa:**
- `C:\xampp\htdocs\devjourney\.htaccess`
- `C:\xampp\htdocs\devjourney\api\.htaccess`
- Isi direktori deployment root dan `api`.

**Hasil aktual:**
- Root `.htaccess`: tidak ada.
- `api/.htaccess` hanya berisi rewrite:
  - `RewriteEngine On`
  - `RewriteCond %{REQUEST_FILENAME} !-f`
  - `RewriteRule ^ index.php [QSA,L]`
- Root deployment memiliki `index.html`, `favicon.svg`, `api`, `assets`, dan `dist`.
- API memiliki `index.php`, `config.php`, dua file `config.php.*.bak`, dan satu `index.php.*.bak`.
- Root `index.html` ada; `api/index.php` ada.

**Temuan:**
- Tidak ada autentikasi atau pembatasan IP pada `.htaccess`.
- `.htaccess` API hanya untuk rewrite, bukan keamanan.
- File backup konfigurasi dan source lama berada di direktori yang dapat diakses web.

**Risiko:**
- File `.bak` dapat diunduh jika tidak diblokir Apache.
- Konfigurasi database dan source lama berpotensi terekspos.

**Status:** selesai untuk langkah ini.

---

### 4. Verifikasi paparan file `.bak`

**Perintah:**
- HTTP HEAD/GET ke localhost untuk file `.bak`, `config.php`, `dist/`, dan `assets/`.
- Pemeriksaan boolean apakah body mengandung `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `<?php`, `projects`, `tasks` — tanpa mencetak nilai kredensial.

**Hasil aktual:**
- `api/config.php.production_20261028.bak` → HTTP 200, 266 bytes, mengandung `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`.
- `api/config.php.production_final_20261028.bak` → HTTP 200, 266 bytes, mengandung `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`.
- `api/index.php.pre_devjourney_20261027_194315.bak` → HTTP 200, 4.515 bytes, mengandung `<?php`, `projects`, `tasks`.
- `api/config.php` → HTTP 200; dieksekusi sebagai PHP, bukan source.
- `dist/` → HTTP 200, 1.760 bytes.
- `assets/` → HTTP 200, `text/html`.

**Temuan:**
- **Kritis:** dua file backup konfigurasi database dapat diunduh publik dan berisi kredensial.
- File backup source lama juga dapat diunduh.
- Tidak ada nilai kredensial yang dicatat atau ditampilkan dalam laporan ini.

**Risiko:**
- Siapa pun yang dapat menjangkau Apache dapat membaca kredensial database dan source lama.
- Jika MySQL juga terbuka, dampaknya meningkat menjadi akses database langsung.

**Status:** selesai untuk langkah ini.

---

### 5. MySQL, listener, dan firewall

**File/perintah yang diperiksa:**
- `C:\xampp\mysql\bin\my.ini`
- `Get-NetTCPConnection` untuk port 80, 443, 3306.
- `Get-NetFirewallRule` untuk `Apache HTTP Server` dan `mysqld`.
- `SHOW VARIABLES` untuk `port`, `bind_address`, `skip_networking`.
- Query `mysql.user` tanpa menampilkan password.

**Hasil aktual:**
- `my.ini`: `port=3306`; `bind-address` dikomentari.
- Listener: `0.0.0.0:80`, `[::]:80`, `0.0.0.0:443`, `[::]:443`, `[::]:3306`.
- `bind_address` kosong; `skip_networking=OFF`.
- Firewall: aturan inbound `Apache HTTP Server` dan `mysqld` aktif pada profil **Public**.
- Akun MySQL: `root` pada `localhost`, `127.0.0.1`, `::1`; `pma` pada `localhost`. Password state: **EMPTY**. Tidak ada akun `%`.

**Temuan:**
- MySQL menerima koneksi TCP pada semua interface dan firewall mengizinkannya.
- Akun database memakai password kosong.
- Tidak ada akun remote `%`, sehingga login root dari LAN tidak otomatis berhasil, tetapi port tetap terbuka dan akun lokal tanpa password tetap berisiko.

**Risiko:** tinggi jika ada akses lokal/LAN atau kesalahan konfigurasi; kredensial `.bak` yang terekspos memperbesar dampak.

**Status:** selesai untuk langkah ini.

---

### 6. Akses localhost dan LAN

**Hasil aktual:**
- IP LAN saat ini: `192.168.11.116`.
- TCP `127.0.0.1:80`, `:443`, `:3306` → berhasil.
- TCP `192.168.11.116:80`, `:443`, `:3306` → berhasil.
- `http://localhost/devjourney/` → HTTP 200.
- `http://localhost/devjourney/api/projects` → HTTP 200, 4 proyek.
- `http://192.168.11.116/devjourney/` → HTTP 200.
- `http://192.168.11.116/devjourney/api/projects` → HTTP 200, 4 proyek.
- `http://192.168.11.116/devjourney/api/config.php.production_20261028.bak` → HTTP 200, 266 bytes.

**Temuan:**
- Aplikasi dan API dapat diakses dari LAN tanpa autentikasi.
- File backup konfigurasi juga dapat diakses dari LAN.

**Status:** selesai untuk langkah ini.

---

### 7. Backend API

**File yang diperiksa:** `api/index.php`

**Hasil aktual:**
- Tidak ada `Authorization`, `session_start`, `password_verify`, `password_hash`, `login`, bearer token, atau API key.
- Tidak ada `$_FILES`, `move_uploaded_file`, atau `multipart/form-data`.
- PDO memakai `ERRMODE_EXCEPTION`.
- Sebagian besar query memakai prepared statement.
- `LIMIT` diinterpolasi setelah `input_int` dan dibatasi (`500` untuk task, `200` untuk session).
- Field `UPDATE` dibangun dari daftar field tetap, bukan nama kolom dari input pengguna.
- Validasi input tersedia: `input_text`, `input_int`, `input_enum`, `date_value`, `datetime_value`, `project_exists`, `validate_stage`, `validate_milestone`.
- Error `PDOException` ditangkap, dicatat ke `error_log`, dan API mengembalikan `{"error":"Kesalahan database"}`.
- `display_errors=1`, `display_startup_errors=1`, `log_errors=1`, `expose_php=1`.
- `assets/` menampilkan directory listing (`Index of`); `dist/` mengembalikan `index.html`.

**Temuan:**
- Tidak ada autentikasi maupun otorisasi; semua endpoint CRUD terbuka.
- Tidak ada upload handling.
- Tidak ada indikasi SQL injection langsung pada query yang diperiksa.
- `display_errors` aktif dapat membocorkan path/stack trace jika terjadi error di luar `PDOException`.
- Directory listing `assets/` terbuka.

**Status:** selesai untuk langkah ini.

---

### 8. Kesiapan File Manager

**File yang diperiksa:**
- `src/types.ts`
- `src/api.ts`
- `src/pages/ProjectsPage.tsx`
- `src/pages/JourneyPage.tsx`
- `src/components/form.tsx`
- `database/schema.sql`

**Hasil aktual:**
- Tidak ada tipe `ProjectFile`/`Attachment`.
- Tidak ada fungsi API upload/download.
- `src/api.ts` selalu mengirim `Content-Type: application/json`; belum ada jalur `FormData`.
- `ProjectsPage.tsx` hanya menampilkan detail proyek, deskripsi, teknologi, target, progres; belum ada daftar file.
- `JourneyPage.tsx` memiliki `file_refs` berupa input teks bebas, bukan file storage.
- `form.tsx` menyediakan `Modal`, `Field`, `Button`, dan `ConfirmDialog` yang dapat dipakai ulang.
- Schema memiliki 9 tabel; tidak ada tabel file.
- `work_sessions.file_refs` bertipe `TEXT`.
- PHP memiliki `fileinfo`, `mbstring`, `openssl`, `curl`, `zip`, `intl`, `pdo_mysql`.
- Batas upload aktual: `upload_max_filesize`/`post_max_size` 40M, `max_file_uploads` 20, `memory_limit` 512M, `max_execution_time` 0.
- Composer 2.8.4 tersedia.
- `pdftotext` dan `tesseract` tidak ditemukan.

**Temuan:** File Manager belum ada; desain harus additive dan tidak mengubah tabel lama.

**Status:** selesai untuk langkah ini.

---

### 9. Kesiapan AI Assistant

**Hasil aktual:**
- Ollama 0.40.13 tersedia.
- Model lokal: `qwen2.5-coder:7b` (4.7 GB).
- Tidak ada kode provider AI di backend/frontend.
- Tidak ada tabel AI.
- Data konteks tersedia: projects, tasks, milestones, roadmap_stages, work_sessions, skills, learning_resources, skill_notes.
- Dashboard memiliki `latestSession` dan `continue`.
- `Dashboard.tsx` memiliki aksi Resume yang mengubah task menjadi `in_progress`; AI nantinya tidak boleh melakukan perubahan otomatis tanpa konfirmasi.

**Temuan:** AI Assistant belum ada; Ollama lokal siap dipakai sebagai opsi awal, tetapi File Manager dan autentikasi harus lebih dulu.

**Status:** selesai untuk langkah ini.

---

## Pekerjaan yang Belum Selesai

- Fase 4 — Profil belum dimulai; menunggu persetujuan baru.
- Menyusun laporan akhir 16 bagian.
- Menunggu persetujuan sebelum perubahan konfigurasi/keamanan.
- Implementasi File Manager dan AI Assistant belum dimulai.
- Belum ada migration baru; belum ada file yang dikirim ke AI.

## Langkah Selanjutnya

1. Susun laporan akhir berdasarkan bukti di atas.
2. Ajukan rencana perbaikan keamanan dan tunggu persetujuan.
3. Setelah disetujui, prioritaskan penghapusan/pemindahan `.bak`, pembatasan akses, dan autentikasi.
4. Baru kemudian desain/implementasi File Manager, lalu AI Assistant.
