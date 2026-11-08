# DevJourney

Aplikasi manajemen proyek pribadi: proyek, tugas, roadmap, milestone, catatan sesi kerja, skill, materi belajar, dan dashboard.

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS, PHP 8 REST API, MariaDB/MySQL, XAMPP.

## Fitur

- Dashboard dengan data nyata dari API: proyek, tugas, milestone, aktivitas 7 hari, dan sesi terakhir.
- CRUD proyek, tugas, tahap roadmap, milestone, sesi kerja, skill, materi belajar, dan catatan skill.
- Quick Add tugas dari dashboard.
- Pencarian dan filter pada halaman manajemen.
- Soft delete (`archived_at`) untuk proyek, tugas, tahap roadmap, milestone, sesi, skill, materi, dan catatan.
- Loading, error, success, dan empty state.
- Dark mode, sidebar desktop, bottom navigation mobile, serta layout responsif.
- Routing berbasis hash (`#/proyek`, `#/tasks`, dan seterusnya) agar kompatibel dengan deployment statis XAMPP tanpa React Router.

## Struktur

```text
api/                 REST API PHP (front controller: api/index.php)
database/
  schema.sql         Skema lengkap untuk instalasi baru
  migrations/        Migration additive 001 dan 002
  backups/           Backup sebelum migration (jangan ditimpa)
src/
  api.ts             Client API frontend
  types.ts           Tipe data bersama
  pages/             Halaman Dashboard, Projects, Tasks, Roadmap, Milestone, Journey, Skill
  components/        Komponen UI, form, modal, dan dashboard
dist/                Hasil build Vite
```

## Instalasi baru (XAMPP)

1. Nyalakan **Apache** dan **MySQL** dari XAMPP Control Panel.
2. Import skema:
   - Buka `http://localhost/phpmyadmin`, pilih **Import**, lalu pilih `database/schema.sql`; atau
   - Dari terminal:
     ```powershell
     C:\xampp\mysql\bin\mysql.exe -uroot -e "source D:/belajar/devjourney/devjourney/database/schema.sql"
     ```
   `schema.sql` membuat database `devjourney`, tabel terbaru, dua baris `schema_migrations`, dan empat proyek awal tanpa tugas/progres palsu.
3. Sesuaikan kredensial database di `api/config.php` jika user/password MySQL berbeda dari default XAMPP (`root`, tanpa password).
4. Install dependency dan build frontend:
   ```powershell
   npm install
   npm run typecheck
   npm run build
   ```
5. Siapkan folder deployment:
   ```powershell
   New-Item -ItemType Directory -Force C:\xampp\htdocs\devjourney
   Copy-Item -Recurse -Force .\dist\* C:\xampp\htdocs\devjourney\
   Copy-Item -Recurse -Force .\api C:\xampp\htdocs\devjourney\
   Copy-Item -Force .\public\favicon.svg C:\xampp\htdocs\devjourney\
   ```
   Pastikan isi `dist/` berada langsung di `htdocs\devjourney\` (bukan di `htdocs\devjourney\dist\`), karena aplikasi disajikan dari `http://localhost/devjourney/`.
6. Buka `http://localhost/devjourney/`.

## Upgrade database yang sudah ada

Jangan menjalankan ulang `schema.sql` pada database produksi dan jangan melakukan reset, `DROP TABLE`, atau `TRUNCATE`. Gunakan migration additive:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot devjourney -e "source D:/belajar/devjourney/devjourney/database/migrations/001_devjourney_features.sql"
C:\xampp\mysql\bin\mysql.exe -uroot devjourney -e "source D:/belajar/devjourney/devjourney/database/migrations/002_devjourney_archive_metadata.sql"
```

Verifikasi:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot -B devjourney -e "SELECT * FROM schema_migrations ORDER BY id;"
```

Migration 001 dan 002 bersifat additive. Migration 001 menambahkan metadata proyek/tugas, roadmap, sesi, skill, materi, dan catatan. Migration 002 menambahkan `created_at` pada tugas serta soft delete pada sesi, materi, dan catatan.

## Backup dan restore

Backup sebelum migration tersedia di `database/backups/`:

- `devjourney_pre_migration_20261027_193351.sql`
- `devjourney_pre_migration_002_20261027_193729.sql`

Jangan menghapus atau menimpa file tersebut. Untuk membuat backup baru:

```powershell
C:\xampp\mysql\bin\mysqldump.exe -uroot --single-transaction --skip-lock-tables --result-file="C:\path\backup_devjourney.sql" devjourney
```

Untuk menguji restore, gunakan database terpisah agar produksi tidak tersentuh:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot -e "CREATE DATABASE devjourney_restore_check CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
C:\xampp\mysql\bin\mysql.exe -uroot devjourney_restore_check -e "source C:/path/backup_devjourney.sql"
C:\xampp\mysql\bin\mysql.exe -uroot -B devjourney_restore_check -e "CHECK TABLE projects, tasks, milestones;"
```

## Mode pengembangan

```powershell
npm run dev
```

Buka `http://localhost:5173/devjourney/`. Request `/devjourney/api` diteruskan ke Apache XAMPP melalui proxy Vite. Build produksi memakai `base: '/devjourney/'` dan disajikan dari `C:\xampp\htdocs\devjourney`.

## API

Base URL: `http://localhost/devjourney/api`. Semua request dan response memakai JSON. Respons sukses berupa wrapper, misalnya `{ "projects": [...] }` atau `{ "project": {...} }`. Error validasi mengembalikan `422`, ID yang tidak ditemukan `404`, dan kegagalan database `500`.

### Dashboard

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/dashboard` | Proyek, hitungan status tugas, tugas pending, tugas in-progress, milestone planned, aktivitas 7 hari, dan `latestSession`. |

### Proyek

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/projects` | Filter opsional: `status`, `priority`, `q`. |
| `POST` | `/projects` | Membuat proyek. |
| `GET` | `/projects/{id}` | Detail proyek. |
| `PATCH` | `/projects/{id}` | Update sebagian field. |
| `DELETE` | `/projects/{id}` | Arsipkan proyek; tugas lama tetap disimpan. |

Contoh:

```json
{
  "name": "Belajar TypeScript",
  "description": "Latihan harian",
  "technologies": "TypeScript, React",
  "target_date": "2026-12-31",
  "status": "active",
  "priority": "high"
}
```

### Tugas

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/tasks` | Filter opsional: `project_id`, `status`, `priority`, `q`, `limit` (maks. 500). |
| `POST` | `/tasks` | Membuat tugas; response berisi `id` dan `task`. |
| `GET` | `/tasks/{id}` | Detail tugas. |
| `PATCH` | `/tasks/{id}` | Update status, prioritas, relasi proyek/stage, dan field lainnya. |
| `DELETE` | `/tasks/{id}` | Arsipkan tugas. |

Contoh:

```json
{
  "project_id": 1,
  "roadmap_stage_id": 2,
  "title": "Implementasi form",
  "status": "todo",
  "priority": "high",
  "target_date": "2026-11-10",
  "next_step": "Buat validasi input"
}
```

Status tugas: `todo`, `in_progress`, `blocked`, `done`. Saat status menjadi `done`, `completed_at` diisi; saat dibuka kembali, `completed_at` dikosongkan. Relasi `roadmap_stage_id` harus berasal dari proyek yang sama.

### Roadmap

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/roadmap` | Filter opsional: `project_id`; response berisi `stages` dengan progres dari tugas terkait. |
| `POST` | `/roadmap` | Membuat tahap. |
| `GET` | `/roadmap/{id}` | Detail tahap. |
| `PATCH` | `/roadmap/{id}` | Update tahap, termasuk `position` dan `milestone_id`. |
| `DELETE` | `/roadmap/{id}` | Arsipkan tahap. |

Status tahap: `planned`, `in_progress`, `blocked`, `done`.

### Milestone

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/milestones` | Filter opsional: `project_id`, `status`, `q`. |
| `POST` | `/milestones` | Membuat milestone. |
| `GET` | `/milestones/{id}` | Detail milestone. |
| `PATCH` | `/milestones/{id}` | Update milestone; status `reached` mengisi `completed_at`. |
| `DELETE` | `/milestones/{id}` | Arsipkan milestone. |

### Sesi kerja / Journey

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/sessions` | Filter opsional: `project_id`, `task_id`, `limit` (maks. 200). |
| `POST` | `/sessions` | Membuat sesi; wajib memiliki `project_id` atau `task_id`. |
| `GET` | `/sessions/{id}` | Detail sesi. |
| `PATCH` | `/sessions/{id}` | Update sesi. |
| `DELETE` | `/sessions/{id}` | Arsipkan sesi. |

Field sesi: `started_at`, `ended_at`, `summary`, `result`, `blockers`, `next_step`, `file_refs`.

### Skill, materi, dan catatan

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/skills` | Filter opsional: `status`, `project_id`, `q`. |
| `POST` | `/skills` | Membuat skill; `progress` 0–100. |
| `GET` | `/skills/{id}` | Detail skill beserta `resources` dan `notes`. |
| `PATCH` | `/skills/{id}` | Update skill. |
| `DELETE` | `/skills/{id}` | Arsipkan skill. |
| `GET` | `/skills/{id}/resources` | Daftar materi skill. |
| `POST` | `/skills/{id}/resources` | Tambah materi. |
| `GET` | `/skills/{id}/notes` | Daftar catatan skill. |
| `POST` | `/skills/{id}/notes` | Tambah catatan. |
| `PATCH` | `/resources/{id}` | Update materi. |
| `DELETE` | `/resources/{id}` | Arsipkan materi. |
| `PATCH` | `/notes/{id}` | Update catatan. |
| `DELETE` | `/notes/{id}` | Arsipkan catatan. |

### Soft delete

Endpoint `DELETE` tidak menghapus baris secara fisik. Response mengembalikan `{ "ok": true, "archived": true }`. Untuk proyek, response juga berisi `retained_tasks`; tugas dan relasi lama tetap tersimpan di database. Data yang sudah diarsipkan tidak muncul di list API.

## Pengujian

### Typecheck dan build

```powershell
npm run typecheck
npm run build
```

### Lint PHP

```powershell
C:\xampp\php\php.exe -l api/index.php
```

### Uji API dengan database terisolasi

Jangan memakai database produksi sebagai data uji. Buat salinan database, arahkan sementara `htdocs/devjourney/api/config.php` ke database uji, lalu jalankan request terhadap endpoint. Setelah selesai, kembalikan konfigurasi ke `devjourney`.

Contoh pemeriksaan cepat:

```powershell
Invoke-RestMethod http://localhost/devjourney/api/dashboard
Invoke-RestMethod http://localhost/devjourney/api/projects
```

Uji minimal yang disarankan:

1. `POST /projects`, lalu `GET`, `PATCH`, dan `DELETE`.
2. `POST /tasks` dengan `project_id` dan `roadmap_stage_id`, lalu ubah status dan reload.
3. Validasi input kosong, ID tidak valid, dan ID yang tidak ada.
4. Pastikan tugas dari proyek lain tidak bisa dipakai sebagai stage tugas.
5. Pastikan `DELETE /projects/{id}` mengarsipkan proyek tetapi tugas tetap ada.
6. Pastikan data yang diarsipkan tidak muncul lagi setelah reload.

### Uji browser

Uji manual yang disarankan:

- Dashboard menampilkan data API nyata, bukan data demo.
- Quick Add membuat tugas dan dashboard ter-refresh.
- CRUD proyek dan tugas bertahan setelah reload.
- Escape menutup modal.
- Dark mode tetap aktif setelah reload.
- Layout mobile tidak memiliki horizontal overflow dan bottom navigation berfungsi.
- Saat API gagal, halaman menampilkan error state dan tombol **Coba lagi**.

## Catatan dan batasan

- API tidak memiliki autentikasi; gunakan hanya di lingkungan lokal/tepercaya.
- Aplikasi memakai hash routing, bukan React Router.
- Playwright tidak ditambahkan sebagai dependency proyek; pengujian browser dilakukan dari environment terpisah.
- `src/data/demoDashboard.ts` adalah sisa data contoh lama dan tidak dipakai oleh dashboard. Dashboard hanya menampilkan data API nyata.
- Jika `dist/` di-deploy, salin isinya langsung ke `C:\xampp\htdocs\devjourney\` agar aset `/devjourney/assets/...` ditemukan.
