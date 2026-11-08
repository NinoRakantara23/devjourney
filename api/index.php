<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function out(mixed $data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $code = 422): never {
    out(['error' => $message], $code);
}

function input_text(array $body, string $key, int $max, bool $required = false): ?string {
    if (!array_key_exists($key, $body)) {
        if ($required) fail("$key wajib diisi");
        return null;
    }
    $value = $body[$key];
    if ($value === null) {
        if ($required) fail("$key wajib diisi");
        return null;
    }
    if (!is_string($value)) fail("$key tidak valid");
    $value = trim($value);
    if ($value === '') {
        if ($required) fail("$key wajib diisi");
        return null;
    }
    if (mb_strlen($value) > $max) fail("$key maksimal $max karakter");
    return $value;
}

function input_int(mixed $value, string $field, int $min = 1): int {
    if (is_int($value)) {
        $number = $value;
    } elseif (is_string($value) && ctype_digit($value)) {
        $number = (int) $value;
    } else {
        fail("$field tidak valid");
    }
    if ($number < $min) fail("$field tidak valid");
    return $number;
}

function nullable_int(mixed $value, string $field): ?int {
    if ($value === null || $value === '') return null;
    return input_int($value, $field, 0);
}

function input_enum(mixed $value, array $allowed, string $field): string {
    if (!is_string($value) || !in_array($value, $allowed, true)) fail("$field tidak valid");
    return $value;
}

function date_value(mixed $value, string $field): ?string {
    if ($value === null || $value === '') return null;
    if (!is_string($value)) fail("$field harus berformat YYYY-MM-DD");
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if ($date === false || $date->format('Y-m-d') !== $value) fail("$field harus berformat YYYY-MM-DD");
    return $value;
}

function datetime_value(mixed $value, string $field): ?string {
    if ($value === null || $value === '') return null;
    if (!is_string($value)) fail("$field tidak valid");
    $normalized = str_replace('T', ' ', trim($value));
    $timestamp = strtotime($normalized);
    if ($timestamp === false) fail("$field tidak valid");
    return date('Y-m-d H:i:s', $timestamp);
}

function segment_id(array $segments, int $index): ?int {
    if (!isset($segments[$index]) || !ctype_digit($segments[$index])) return null;
    return (int) $segments[$index];
}

function project_exists(PDO $pdo, int $projectId): void {
    $stmt = $pdo->prepare('SELECT 1 FROM projects WHERE id = ? AND archived_at IS NULL');
    $stmt->execute([$projectId]);
    if (!$stmt->fetchColumn()) fail('Proyek tidak ditemukan', 404);
}

function project_row(PDO $pdo, int $projectId): array {
    $stmt = $pdo->prepare(
        "SELECT p.*, COUNT(t.id) AS total, COALESCE(SUM(t.status = 'done'), 0) AS done
         FROM projects p
         LEFT JOIN tasks t ON t.project_id = p.id AND t.archived_at IS NULL
         WHERE p.id = ? AND p.archived_at IS NULL
         GROUP BY p.id"
    );
    $stmt->execute([$projectId]);
    $row = $stmt->fetch();
    if (!$row) fail('Proyek tidak ditemukan', 404);
    return format_project($row);
}

function task_row(PDO $pdo, int $taskId): array {
    $stmt = $pdo->prepare(
        "SELECT t.*, p.name AS project, s.title AS stage_title
         FROM tasks t
         JOIN projects p ON p.id = t.project_id AND p.archived_at IS NULL
         LEFT JOIN roadmap_stages s ON s.id = t.roadmap_stage_id AND s.archived_at IS NULL
         WHERE t.id = ? AND t.archived_at IS NULL"
    );
    $stmt->execute([$taskId]);
    $row = $stmt->fetch();
    if (!$row) fail('Tugas tidak ditemukan', 404);
    return format_task($row);
}

function milestone_row(PDO $pdo, int $milestoneId): array {
    $stmt = $pdo->prepare(
        "SELECT m.*, p.name AS project,
                COUNT(DISTINCT s.id) AS stage_total,
                COALESCE(SUM(s.status = 'done'), 0) AS stage_done
         FROM milestones m
         JOIN projects p ON p.id = m.project_id AND p.archived_at IS NULL
         LEFT JOIN roadmap_stages s ON s.milestone_id = m.id AND s.archived_at IS NULL
         WHERE m.id = ? AND m.archived_at IS NULL
         GROUP BY m.id"
    );
    $stmt->execute([$milestoneId]);
    $row = $stmt->fetch();
    if (!$row) fail('Milestone tidak ditemukan', 404);
    return format_milestone($row);
}

function stage_row(PDO $pdo, int $stageId): array {
    $stmt = $pdo->prepare(
        "SELECT s.*, p.name AS project, m.title AS milestone_title,
                COUNT(t.id) AS task_total,
                COALESCE(SUM(t.status = 'done'), 0) AS task_done
         FROM roadmap_stages s
         JOIN projects p ON p.id = s.project_id AND p.archived_at IS NULL
         LEFT JOIN milestones m ON m.id = s.milestone_id AND m.archived_at IS NULL
         LEFT JOIN tasks t ON t.roadmap_stage_id = s.id AND t.archived_at IS NULL
         WHERE s.id = ? AND s.archived_at IS NULL
         GROUP BY s.id"
    );
    $stmt->execute([$stageId]);
    $row = $stmt->fetch();
    if (!$row) fail('Tahap roadmap tidak ditemukan', 404);
    return format_stage($row);
}

function session_row(PDO $pdo, int $sessionId): array {
    $stmt = $pdo->prepare(
        "SELECT s.*, p.name AS project, t.title AS task
         FROM work_sessions s
         LEFT JOIN projects p ON p.id = s.project_id
         LEFT JOIN tasks t ON t.id = s.task_id
         WHERE s.id = ? AND s.archived_at IS NULL"
    );
    $stmt->execute([$sessionId]);
    $row = $stmt->fetch();
    if (!$row) fail('Catatan sesi tidak ditemukan', 404);
    return format_session($row);
}

function skill_row(PDO $pdo, int $skillId): array {
    $stmt = $pdo->prepare(
        "SELECT sk.*, p.name AS project,
                (SELECT COUNT(*) FROM learning_resources r WHERE r.skill_id = sk.id AND r.archived_at IS NULL) AS resource_total,
                (SELECT COUNT(*) FROM learning_resources r WHERE r.skill_id = sk.id AND r.status = 'completed' AND r.archived_at IS NULL) AS resource_done,
                (SELECT COUNT(*) FROM skill_notes n WHERE n.skill_id = sk.id AND n.archived_at IS NULL) AS note_count
         FROM skills sk
         LEFT JOIN projects p ON p.id = sk.project_id AND p.archived_at IS NULL
         WHERE sk.id = ? AND sk.archived_at IS NULL"
    );
    $stmt->execute([$skillId]);
    $row = $stmt->fetch();
    if (!$row) fail('Skill tidak ditemukan', 404);
    return format_skill($row);
}

function format_project(array $row): array {
    $total = (int) ($row['total'] ?? 0);
    $done = (int) ($row['done'] ?? 0);
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'description' => $row['description'],
        'technologies' => $row['technologies'] ?? null,
        'target_date' => $row['target_date'] ?? null,
        'status' => $row['status'],
        'priority' => $row['priority'] ?? 'medium',
        'total' => $total,
        'done' => $done,
        'progress' => $total > 0 ? (int) round($done / $total * 100) : null,
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
        'archived_at' => $row['archived_at'] ?? null,
    ];
}

function format_task(array $row): array {
    return [
        'id' => (int) $row['id'],
        'project_id' => (int) $row['project_id'],
        'project' => $row['project'] ?? null,
        'roadmap_stage_id' => $row['roadmap_stage_id'] === null ? null : (int) $row['roadmap_stage_id'],
        'stage_title' => $row['stage_title'] ?? null,
        'title' => $row['title'],
        'status' => $row['status'],
        'priority' => $row['priority'] ?? 'medium',
        'blocked_reason' => $row['blocked_reason'],
        'next_step' => $row['next_step'],
        'note' => $row['note'],
        'target_date' => $row['target_date'] ?? null,
        'completed_at' => $row['completed_at'] ?? null,
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ];
}

function format_milestone(array $row): array {
    return [
        'id' => (int) $row['id'],
        'project_id' => (int) $row['project_id'],
        'project' => $row['project'] ?? null,
        'title' => $row['title'],
        'description' => $row['description'] ?? null,
        'target_date' => $row['target_date'] ?? null,
        'status' => $row['status'],
        'completed_at' => $row['completed_at'] ?? null,
        'stage_total' => (int) ($row['stage_total'] ?? 0),
        'stage_done' => (int) ($row['stage_done'] ?? 0),
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ];
}

function format_stage(array $row): array {
    $total = (int) ($row['task_total'] ?? 0);
    $done = (int) ($row['task_done'] ?? 0);
    return [
        'id' => (int) $row['id'],
        'project_id' => (int) $row['project_id'],
        'project' => $row['project'] ?? null,
        'title' => $row['title'],
        'description' => $row['description'] ?? null,
        'position' => (int) $row['position'],
        'status' => $row['status'],
        'target_date' => $row['target_date'] ?? null,
        'milestone_id' => $row['milestone_id'] === null ? null : (int) $row['milestone_id'],
        'milestone_title' => $row['milestone_title'] ?? null,
        'task_total' => $total,
        'task_done' => $done,
        'progress' => $total > 0 ? (int) round($done / $total * 100) : null,
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ];
}

function format_session(array $row): array {
    return [
        'id' => (int) $row['id'],
        'project_id' => $row['project_id'] === null ? null : (int) $row['project_id'],
        'project' => $row['project'] ?? null,
        'task_id' => $row['task_id'] === null ? null : (int) $row['task_id'],
        'task' => $row['task'] ?? null,
        'started_at' => $row['started_at'],
        'ended_at' => $row['ended_at'],
        'summary' => $row['summary'],
        'result' => $row['result'],
        'blockers' => $row['blockers'],
        'next_step' => $row['next_step'],
        'file_refs' => $row['file_refs'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}

function format_skill(array $row): array {
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'description' => $row['description'],
        'target' => $row['target'],
        'status' => $row['status'],
        'progress' => (int) $row['progress'],
        'notes' => $row['notes'],
        'project_id' => $row['project_id'] === null ? null : (int) $row['project_id'],
        'project' => $row['project'] ?? null,
        'resource_total' => (int) ($row['resource_total'] ?? 0),
        'resource_done' => (int) ($row['resource_done'] ?? 0),
        'note_count' => (int) ($row['note_count'] ?? 0),
        'created_at' => $row['created_at'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
    ];
}

function format_resource(array $row): array {
    return [
        'id' => (int) $row['id'],
        'skill_id' => (int) $row['skill_id'],
        'title' => $row['title'],
        'url' => $row['url'],
        'type' => $row['type'],
        'status' => $row['status'],
        'notes' => $row['notes'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}

function format_note(array $row): array {
    return [
        'id' => (int) $row['id'],
        'skill_id' => (int) $row['skill_id'],
        'note' => $row['note'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}

function validate_stage(PDO $pdo, ?int $stageId, int $projectId): ?int {
    if ($stageId === null) return null;
    $stmt = $pdo->prepare('SELECT 1 FROM roadmap_stages WHERE id = ? AND project_id = ? AND archived_at IS NULL');
    $stmt->execute([$stageId, $projectId]);
    if (!$stmt->fetchColumn()) fail('Tahap roadmap tidak ditemukan pada proyek ini', 422);
    return $stageId;
}

function validate_milestone(PDO $pdo, ?int $milestoneId, int $projectId): ?int {
    if ($milestoneId === null) return null;
    $stmt = $pdo->prepare('SELECT 1 FROM milestones WHERE id = ? AND project_id = ? AND archived_at IS NULL');
    $stmt->execute([$milestoneId, $projectId]);
    if (!$stmt->fetchColumn()) fail('Milestone tidak ditemukan pada proyek ini', 422);
    return $milestoneId;
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $pdo = new PDO(DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException) {
    out(['error' => 'Koneksi database gagal'], 500);
}

$path = trim((string) preg_replace('#^.*?/api(/index\.php)?#', '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)), '/');
$seg = explode('/', $path);
$body = json_decode(file_get_contents('php://input') ?: '{}', true);
$body = is_array($body) ? $body : [];

const STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
const PROJECT_STATUSES = ['active', 'paused', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STAGE_STATUSES = ['planned', 'in_progress', 'blocked', 'done'];
const MILESTONE_STATUSES = ['planned', 'reached'];
const SKILL_STATUSES = ['not_started', 'learning', 'practicing', 'completed'];
const RESOURCE_TYPES = ['course', 'article', 'video', 'book', 'other'];
const RESOURCE_STATUSES = ['planned', 'in_progress', 'completed'];

try {
    // GET /api/dashboard
    if ($method === 'GET' && $path === 'dashboard') {
        $projects = $pdo->query(
            "SELECT p.*, COUNT(t.id) AS total, COALESCE(SUM(t.status = 'done'), 0) AS done
             FROM projects p
             LEFT JOIN tasks t ON t.project_id = p.id AND t.archived_at IS NULL
             WHERE p.archived_at IS NULL
             GROUP BY p.id ORDER BY p.id"
        )->fetchAll();
        $projects = array_map('format_project', $projects);

        $counts = array_fill_keys(STATUSES, 0);
        foreach ($pdo->query(
            "SELECT t.status, COUNT(*) AS c
             FROM tasks t JOIN projects p ON p.id = t.project_id
             WHERE t.archived_at IS NULL AND p.archived_at IS NULL
             GROUP BY t.status"
        ) as $row) {
            $counts[$row['status']] = (int) $row['c'];
        }

        $cols = 't.*, p.name AS project, s.title AS stage_title';
        $pendingStmt = $pdo->query(
            "SELECT $cols
             FROM tasks t
             JOIN projects p ON p.id = t.project_id AND p.archived_at IS NULL
             LEFT JOIN roadmap_stages s ON s.id = t.roadmap_stage_id AND s.archived_at IS NULL
             WHERE t.status IN ('blocked', 'todo') AND t.archived_at IS NULL
             ORDER BY (t.status = 'blocked') DESC, FIELD(t.priority, 'critical', 'high', 'medium', 'low'), t.updated_at DESC
             LIMIT 4"
        );
        $pending = array_map('format_task', $pendingStmt->fetchAll());

        $continueStmt = $pdo->query(
            "SELECT $cols
             FROM tasks t
             JOIN projects p ON p.id = t.project_id AND p.archived_at IS NULL
             LEFT JOIN roadmap_stages s ON s.id = t.roadmap_stage_id AND s.archived_at IS NULL
             WHERE t.status = 'in_progress' AND t.archived_at IS NULL
             ORDER BY t.updated_at DESC LIMIT 1"
        );
        $continueRow = $continueStmt->fetch();
        $continue = $continueRow ? format_task($continueRow) : null;

        $milestones = $pdo->query(
            "SELECT m.*, p.name AS project,
                    COUNT(DISTINCT s.id) AS stage_total,
                    COALESCE(SUM(s.status = 'done'), 0) AS stage_done
             FROM milestones m
             JOIN projects p ON p.id = m.project_id AND p.archived_at IS NULL
             LEFT JOIN roadmap_stages s ON s.milestone_id = m.id AND s.archived_at IS NULL
             WHERE m.status = 'planned' AND m.archived_at IS NULL
             GROUP BY m.id
             ORDER BY m.target_date IS NULL, m.target_date, m.id
             LIMIT 4"
        )->fetchAll();
        $milestones = array_map('format_milestone', $milestones);

        $byDay = [];
        foreach ($pdo->query(
            "SELECT DATE(t.completed_at) AS d, COUNT(*) AS c
             FROM tasks t JOIN projects p ON p.id = t.project_id
             WHERE t.completed_at >= CURDATE() - INTERVAL 6 DAY
               AND t.archived_at IS NULL AND p.archived_at IS NULL
             GROUP BY d"
        ) as $row) {
            $byDay[$row['d']] = (int) $row['c'];
        }
        $names = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        $weekly = [];
        for ($i = 6; $i >= 0; $i--) {
            $ts = strtotime("-$i day");
            $weekly[] = ['label' => $names[(int) date('w', $ts)], 'count' => $byDay[date('Y-m-d', $ts)] ?? 0];
        }

        $sessionStmt = $pdo->query(
            "SELECT s.*, p.name AS project, t.title AS task
             FROM work_sessions s
             LEFT JOIN projects p ON p.id = s.project_id
             LEFT JOIN tasks t ON t.id = s.task_id
             WHERE s.archived_at IS NULL
             ORDER BY s.started_at DESC, s.id DESC LIMIT 1"
        );
        $sessionRow = $sessionStmt->fetch();
        $latestSession = $sessionRow ? format_session($sessionRow) : null;

        out(compact('projects', 'counts', 'pending', 'continue', 'milestones', 'weekly', 'latestSession'));
    }

    // /api/projects
    if (($seg[0] ?? '') === 'projects') {
        $projectId = segment_id($seg, 1);

        if ($method === 'GET' && $projectId === null) {
            $where = ['p.archived_at IS NULL'];
            $params = [];
            if (isset($_GET['status']) && $_GET['status'] !== '') {
                $params[] = input_enum($_GET['status'], PROJECT_STATUSES, 'status');
                $where[] = 'p.status = ?';
            }
            if (isset($_GET['priority']) && $_GET['priority'] !== '') {
                $params[] = input_enum($_GET['priority'], PRIORITIES, 'priority');
                $where[] = 'p.priority = ?';
            }
            if (isset($_GET['q']) && trim((string) $_GET['q']) !== '') {
                $q = '%' . trim((string) $_GET['q']) . '%';
                $where[] = '(p.name LIKE ? OR p.description LIKE ? OR p.technologies LIKE ?)';
                array_push($params, $q, $q, $q);
            }
            $stmt = $pdo->prepare(
                "SELECT p.*, COUNT(t.id) AS total, COALESCE(SUM(t.status = 'done'), 0) AS done
                 FROM projects p
                 LEFT JOIN tasks t ON t.project_id = p.id AND t.archived_at IS NULL
                 WHERE " . implode(' AND ', $where) . "
                 GROUP BY p.id ORDER BY p.id DESC"
            );
            $stmt->execute($params);
            $projects = array_map('format_project', $stmt->fetchAll());
            out(['projects' => $projects]);
        }

        if ($method === 'POST' && $projectId === null) {
            $name = input_text($body, 'name', 150, true);
            $description = input_text($body, 'description', 10000);
            $technologies = input_text($body, 'technologies', 255);
            $targetDate = date_value($body['target_date'] ?? null, 'target_date');
            $status = input_enum($body['status'] ?? 'active', PROJECT_STATUSES, 'status');
            $priority = input_enum($body['priority'] ?? 'medium', PRIORITIES, 'priority');

            $stmt = $pdo->prepare(
                'INSERT INTO projects (name, description, technologies, target_date, status, priority)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$name, $description, $technologies, $targetDate, $status, $priority]);
            $created = project_row($pdo, (int) $pdo->lastInsertId());
            out(['project' => $created], 201);
        }

        if ($projectId !== null) {
            project_exists($pdo, $projectId);

            if ($method === 'GET') {
                out(['project' => project_row($pdo, $projectId)]);
            }

            if ($method === 'PATCH') {
                $fields = [];
                $params = [];
                if (array_key_exists('name', $body)) {
                    $fields[] = 'name = ?';
                    $params[] = input_text($body, 'name', 150, true);
                }
                if (array_key_exists('description', $body)) {
                    $fields[] = 'description = ?';
                    $params[] = input_text($body, 'description', 10000);
                }
                if (array_key_exists('technologies', $body)) {
                    $fields[] = 'technologies = ?';
                    $params[] = input_text($body, 'technologies', 255);
                }
                if (array_key_exists('target_date', $body)) {
                    $fields[] = 'target_date = ?';
                    $params[] = date_value($body['target_date'], 'target_date');
                }
                if (array_key_exists('status', $body)) {
                    $fields[] = 'status = ?';
                    $params[] = input_enum($body['status'], PROJECT_STATUSES, 'status');
                }
                if (array_key_exists('priority', $body)) {
                    $fields[] = 'priority = ?';
                    $params[] = input_enum($body['priority'], PRIORITIES, 'priority');
                }
                if ($fields === []) fail('Tidak ada perubahan yang dikirim');
                $params[] = $projectId;
                $stmt = $pdo->prepare('UPDATE projects SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ?');
                $stmt->execute($params);
                out(['project' => project_row($pdo, $projectId)]);
            }

            if ($method === 'DELETE') {
                $retained = $pdo->prepare('SELECT COUNT(*) FROM tasks WHERE project_id = ? AND archived_at IS NULL');
                $retained->execute([$projectId]);
                $retainedTasks = (int) $retained->fetchColumn();
                $stmt = $pdo->prepare('UPDATE projects SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL');
                $stmt->execute([$projectId]);
                out(['ok' => true, 'archived' => true, 'retained_tasks' => $retainedTasks]);
            }
        }
    }

    // /api/tasks
    if (($seg[0] ?? '') === 'tasks') {
        $taskId = segment_id($seg, 1);

        if ($method === 'GET' && $taskId === null) {
            $where = ['t.archived_at IS NULL', 'p.archived_at IS NULL'];
            $params = [];
            if (isset($_GET['project_id']) && $_GET['project_id'] !== '') {
                $params[] = input_int($_GET['project_id'], 'project_id');
                $where[] = 't.project_id = ?';
            }
            if (isset($_GET['status']) && $_GET['status'] !== '') {
                $params[] = input_enum($_GET['status'], STATUSES, 'status');
                $where[] = 't.status = ?';
            }
            if (isset($_GET['priority']) && $_GET['priority'] !== '') {
                $params[] = input_enum($_GET['priority'], PRIORITIES, 'priority');
                $where[] = 't.priority = ?';
            }
            if (isset($_GET['q']) && trim((string) $_GET['q']) !== '') {
                $q = '%' . trim((string) $_GET['q']) . '%';
                $where[] = '(t.title LIKE ? OR t.note LIKE ? OR t.next_step LIKE ? OR t.blocked_reason LIKE ? OR p.name LIKE ?)';
                array_push($params, $q, $q, $q, $q, $q);
            }
            $limit = isset($_GET['limit']) ? input_int($_GET['limit'], 'limit', 1) : 500;
            $limit = min($limit, 500);
            $stmt = $pdo->prepare(
                "SELECT t.*, p.name AS project, s.title AS stage_title
                 FROM tasks t
                 JOIN projects p ON p.id = t.project_id AND p.archived_at IS NULL
                 LEFT JOIN roadmap_stages s ON s.id = t.roadmap_stage_id AND s.archived_at IS NULL
                 WHERE " . implode(' AND ', $where) . "
                 ORDER BY FIELD(t.status, 'in_progress', 'blocked', 'todo', 'done'),
                          FIELD(t.priority, 'critical', 'high', 'medium', 'low'),
                          t.updated_at DESC
                 LIMIT $limit"
            );
            $stmt->execute($params);
            $tasks = array_map('format_task', $stmt->fetchAll());
            out(['tasks' => $tasks, 'count' => count($tasks)]);
        }

        if ($method === 'POST' && $taskId === null) {
            $projectId = input_int($body['project_id'] ?? null, 'project_id');
            project_exists($pdo, $projectId);
            $title = input_text($body, 'title', 255, true);
            $status = input_enum($body['status'] ?? 'todo', STATUSES, 'status');
            $priority = input_enum($body['priority'] ?? 'medium', PRIORITIES, 'priority');
            $targetDate = date_value($body['target_date'] ?? null, 'target_date');
            $stageId = nullable_int($body['roadmap_stage_id'] ?? null, 'roadmap_stage_id');
            $stageId = validate_stage($pdo, $stageId, $projectId);
            $blockedReason = input_text($body, 'blocked_reason', 255);
            $nextStep = input_text($body, 'next_step', 255);
            $note = input_text($body, 'note', 10000);

            $stmt = $pdo->prepare(
                "INSERT INTO tasks
                 (project_id, roadmap_stage_id, title, status, priority, blocked_reason, next_step, note, target_date, completed_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, IF(? = 'done', NOW(), NULL))"
            );
            $stmt->execute([
                $projectId, $stageId, $title, $status, $priority,
                $blockedReason, $nextStep, $note, $targetDate, $status,
            ]);
            $created = task_row($pdo, (int) $pdo->lastInsertId());
            out(['id' => $created['id'], 'task' => $created], 201);
        }

        if ($taskId !== null) {
            $current = task_row($pdo, $taskId);

            if ($method === 'GET') {
                out(['task' => $current]);
            }

            if ($method === 'PATCH') {
                $fields = [];
                $params = [];
                $projectId = $current['project_id'];
                $projectChanged = false;

                if (array_key_exists('project_id', $body)) {
                    $projectId = input_int($body['project_id'], 'project_id');
                    project_exists($pdo, $projectId);
                    $projectChanged = $projectId !== $current['project_id'];
                    $fields[] = 'project_id = ?';
                    $params[] = $projectId;
                }
                if (array_key_exists('title', $body)) {
                    $fields[] = 'title = ?';
                    $params[] = input_text($body, 'title', 255, true);
                }
                if (array_key_exists('status', $body)) {
                    $status = input_enum($body['status'], STATUSES, 'status');
                    $fields[] = 'status = ?';
                    $params[] = $status;
                    $fields[] = $status === 'done' ? 'completed_at = COALESCE(completed_at, NOW())' : 'completed_at = NULL';
                }
                if (array_key_exists('priority', $body)) {
                    $fields[] = 'priority = ?';
                    $params[] = input_enum($body['priority'], PRIORITIES, 'priority');
                }
                if (array_key_exists('target_date', $body)) {
                    $fields[] = 'target_date = ?';
                    $params[] = date_value($body['target_date'], 'target_date');
                }
                if (array_key_exists('blocked_reason', $body)) {
                    $fields[] = 'blocked_reason = ?';
                    $params[] = input_text($body, 'blocked_reason', 255);
                }
                if (array_key_exists('next_step', $body)) {
                    $fields[] = 'next_step = ?';
                    $params[] = input_text($body, 'next_step', 255);
                }
                if (array_key_exists('note', $body)) {
                    $fields[] = 'note = ?';
                    $params[] = input_text($body, 'note', 10000);
                }
                if (array_key_exists('roadmap_stage_id', $body)) {
                    $stageId = nullable_int($body['roadmap_stage_id'], 'roadmap_stage_id');
                    $stageId = validate_stage($pdo, $stageId, $projectId);
                    $fields[] = 'roadmap_stage_id = ?';
                    $params[] = $stageId;
                } elseif ($projectChanged) {
                    $fields[] = 'roadmap_stage_id = NULL';
                }

                if ($fields === []) fail('Tidak ada perubahan yang dikirim');
                $params[] = $taskId;
                $stmt = $pdo->prepare('UPDATE tasks SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ?');
                $stmt->execute($params);
                out(['ok' => true, 'task' => task_row($pdo, $taskId)]);
            }

            if ($method === 'DELETE') {
                $stmt = $pdo->prepare('UPDATE tasks SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL');
                $stmt->execute([$taskId]);
                out(['ok' => true, 'archived' => true]);
            }
        }
    }

    // /api/roadmap
    if (($seg[0] ?? '') === 'roadmap') {
        $stageId = segment_id($seg, 1);

        if ($method === 'GET' && $stageId === null) {
            $where = ['s.archived_at IS NULL', 'p.archived_at IS NULL'];
            $params = [];
            if (isset($_GET['project_id']) && $_GET['project_id'] !== '') {
                $params[] = input_int($_GET['project_id'], 'project_id');
                $where[] = 's.project_id = ?';
            }
            $stmt = $pdo->prepare(
                "SELECT s.*, p.name AS project, m.title AS milestone_title,
                        COUNT(t.id) AS task_total,
                        COALESCE(SUM(t.status = 'done'), 0) AS task_done
                 FROM roadmap_stages s
                 JOIN projects p ON p.id = s.project_id AND p.archived_at IS NULL
                 LEFT JOIN milestones m ON m.id = s.milestone_id AND m.archived_at IS NULL
                 LEFT JOIN tasks t ON t.roadmap_stage_id = s.id AND t.archived_at IS NULL
                 WHERE " . implode(' AND ', $where) . "
                 GROUP BY s.id ORDER BY s.project_id, s.position, s.id"
            );
            $stmt->execute($params);
            $stages = array_map('format_stage', $stmt->fetchAll());
            out(['stages' => $stages]);
        }

        if ($method === 'POST' && $stageId === null) {
            $projectId = input_int($body['project_id'] ?? null, 'project_id');
            project_exists($pdo, $projectId);
            $title = input_text($body, 'title', 255, true);
            $description = input_text($body, 'description', 10000);
            $status = input_enum($body['status'] ?? 'planned', STAGE_STATUSES, 'status');
            $targetDate = date_value($body['target_date'] ?? null, 'target_date');
            $milestoneId = nullable_int($body['milestone_id'] ?? null, 'milestone_id');
            $milestoneId = validate_milestone($pdo, $milestoneId, $projectId);

            if (array_key_exists('position', $body)) {
                $position = input_int($body['position'], 'position', 0);
            } else {
                $stmt = $pdo->prepare(
                    'SELECT COALESCE(MAX(position), 0) + 1 FROM roadmap_stages WHERE project_id = ? AND archived_at IS NULL'
                );
                $stmt->execute([$projectId]);
                $position = (int) $stmt->fetchColumn();
            }

            $stmt = $pdo->prepare(
                'INSERT INTO roadmap_stages
                 (project_id, title, description, position, status, target_date, milestone_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$projectId, $title, $description, $position, $status, $targetDate, $milestoneId]);
            out(['stage' => stage_row($pdo, (int) $pdo->lastInsertId())], 201);
        }

        if ($stageId !== null) {
            $current = stage_row($pdo, $stageId);

            if ($method === 'GET') {
                out(['stage' => $current]);
            }

            if ($method === 'PATCH') {
                $fields = [];
                $params = [];
                if (array_key_exists('title', $body)) {
                    $fields[] = 'title = ?';
                    $params[] = input_text($body, 'title', 255, true);
                }
                if (array_key_exists('description', $body)) {
                    $fields[] = 'description = ?';
                    $params[] = input_text($body, 'description', 10000);
                }
                if (array_key_exists('position', $body)) {
                    $fields[] = 'position = ?';
                    $params[] = input_int($body['position'], 'position', 0);
                }
                if (array_key_exists('status', $body)) {
                    $fields[] = 'status = ?';
                    $params[] = input_enum($body['status'], STAGE_STATUSES, 'status');
                }
                if (array_key_exists('target_date', $body)) {
                    $fields[] = 'target_date = ?';
                    $params[] = date_value($body['target_date'], 'target_date');
                }
                if (array_key_exists('milestone_id', $body)) {
                    $milestoneId = nullable_int($body['milestone_id'], 'milestone_id');
                    $milestoneId = validate_milestone($pdo, $milestoneId, $current['project_id']);
                    $fields[] = 'milestone_id = ?';
                    $params[] = $milestoneId;
                }
                if ($fields === []) fail('Tidak ada perubahan yang dikirim');
                $params[] = $stageId;
                $stmt = $pdo->prepare('UPDATE roadmap_stages SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ?');
                $stmt->execute($params);
                out(['stage' => stage_row($pdo, $stageId)]);
            }

            if ($method === 'DELETE') {
                $stmt = $pdo->prepare('UPDATE roadmap_stages SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL');
                $stmt->execute([$stageId]);
                out(['ok' => true, 'archived' => true]);
            }
        }
    }

    // /api/milestones
    if (($seg[0] ?? '') === 'milestones') {
        $milestoneId = segment_id($seg, 1);

        if ($method === 'GET' && $milestoneId === null) {
            $where = ['m.archived_at IS NULL', 'p.archived_at IS NULL'];
            $params = [];
            if (isset($_GET['project_id']) && $_GET['project_id'] !== '') {
                $params[] = input_int($_GET['project_id'], 'project_id');
                $where[] = 'm.project_id = ?';
            }
            if (isset($_GET['status']) && $_GET['status'] !== '') {
                $params[] = input_enum($_GET['status'], MILESTONE_STATUSES, 'status');
                $where[] = 'm.status = ?';
            }
            if (isset($_GET['q']) && trim((string) $_GET['q']) !== '') {
                $q = '%' . trim((string) $_GET['q']) . '%';
                $where[] = '(m.title LIKE ? OR m.description LIKE ? OR p.name LIKE ?)';
                array_push($params, $q, $q, $q);
            }
            $stmt = $pdo->prepare(
                "SELECT m.*, p.name AS project,
                        COUNT(DISTINCT s.id) AS stage_total,
                        COALESCE(SUM(s.status = 'done'), 0) AS stage_done
                 FROM milestones m
                 JOIN projects p ON p.id = m.project_id AND p.archived_at IS NULL
                 LEFT JOIN roadmap_stages s ON s.milestone_id = m.id AND s.archived_at IS NULL
                 WHERE " . implode(' AND ', $where) . "
                 GROUP BY m.id ORDER BY m.target_date IS NULL, m.target_date, m.id"
            );
            $stmt->execute($params);
            $milestones = array_map('format_milestone', $stmt->fetchAll());
            out(['milestones' => $milestones]);
        }

        if ($method === 'POST' && $milestoneId === null) {
            $projectId = input_int($body['project_id'] ?? null, 'project_id');
            project_exists($pdo, $projectId);
            $title = input_text($body, 'title', 255, true);
            $description = input_text($body, 'description', 10000);
            $targetDate = date_value($body['target_date'] ?? null, 'target_date');
            $status = input_enum($body['status'] ?? 'planned', MILESTONE_STATUSES, 'status');

            $stmt = $pdo->prepare(
                "INSERT INTO milestones (project_id, title, description, target_date, status, completed_at)
                 VALUES (?, ?, ?, ?, ?, IF(? = 'reached', NOW(), NULL))"
            );
            $stmt->execute([$projectId, $title, $description, $targetDate, $status, $status]);
            out(['milestone' => milestone_row($pdo, (int) $pdo->lastInsertId())], 201);
        }

        if ($milestoneId !== null) {
            $current = milestone_row($pdo, $milestoneId);

            if ($method === 'GET') {
                out(['milestone' => $current]);
            }

            if ($method === 'PATCH') {
                $fields = [];
                $params = [];
                if (array_key_exists('title', $body)) {
                    $fields[] = 'title = ?';
                    $params[] = input_text($body, 'title', 255, true);
                }
                if (array_key_exists('description', $body)) {
                    $fields[] = 'description = ?';
                    $params[] = input_text($body, 'description', 10000);
                }
                if (array_key_exists('target_date', $body)) {
                    $fields[] = 'target_date = ?';
                    $params[] = date_value($body['target_date'], 'target_date');
                }
                if (array_key_exists('status', $body)) {
                    $status = input_enum($body['status'], MILESTONE_STATUSES, 'status');
                    $fields[] = 'status = ?';
                    $params[] = $status;
                    $fields[] = $status === 'reached' ? 'completed_at = COALESCE(completed_at, NOW())' : 'completed_at = NULL';
                }
                if ($fields === []) fail('Tidak ada perubahan yang dikirim');
                $params[] = $milestoneId;
                $stmt = $pdo->prepare('UPDATE milestones SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ?');
                $stmt->execute($params);
                out(['milestone' => milestone_row($pdo, $milestoneId)]);
            }

            if ($method === 'DELETE') {
                $stmt = $pdo->prepare('UPDATE milestones SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL');
                $stmt->execute([$milestoneId]);
                out(['ok' => true, 'archived' => true]);
            }
        }
    }

    // /api/sessions
    if (($seg[0] ?? '') === 'sessions') {
        $sessionId = segment_id($seg, 1);

        if ($method === 'GET' && $sessionId === null) {
            $where = ['s.archived_at IS NULL'];
            $params = [];
            if (isset($_GET['project_id']) && $_GET['project_id'] !== '') {
                $params[] = input_int($_GET['project_id'], 'project_id');
                $where[] = 's.project_id = ?';
            }
            if (isset($_GET['task_id']) && $_GET['task_id'] !== '') {
                $params[] = input_int($_GET['task_id'], 'task_id');
                $where[] = 's.task_id = ?';
            }
            $limit = isset($_GET['limit']) ? input_int($_GET['limit'], 'limit', 1) : 50;
            $limit = min($limit, 200);
            $stmt = $pdo->prepare(
                "SELECT s.*, p.name AS project, t.title AS task
                 FROM work_sessions s
                 LEFT JOIN projects p ON p.id = s.project_id
                 LEFT JOIN tasks t ON t.id = s.task_id
                 WHERE " . implode(' AND ', $where) . "
                 ORDER BY s.started_at DESC, s.id DESC LIMIT $limit"
            );
            $stmt->execute($params);
            $sessions = array_map('format_session', $stmt->fetchAll());
            out(['sessions' => $sessions]);
        }

        if ($method === 'POST' && $sessionId === null) {
            $taskId = nullable_int($body['task_id'] ?? null, 'task_id');
            $projectId = nullable_int($body['project_id'] ?? null, 'project_id');
            $task = null;

            if ($taskId !== null) {
                $task = task_row($pdo, $taskId);
                if ($projectId === null) {
                    $projectId = $task['project_id'];
                } elseif ($projectId !== $task['project_id']) {
                    fail('Proyek tidak sesuai dengan tugas');
                }
            }
            if ($projectId !== null) project_exists($pdo, $projectId);
            if ($projectId === null) fail('project_id atau task_id wajib diisi');

            $startedAt = datetime_value($body['started_at'] ?? null, 'started_at') ?? date('Y-m-d H:i:s');
            $endedAt = datetime_value($body['ended_at'] ?? null, 'ended_at');
            if ($endedAt !== null && strtotime($endedAt) < strtotime($startedAt)) {
                fail('ended_at tidak boleh lebih awal dari started_at');
            }
            $summary = input_text($body, 'summary', 10000);
            $result = input_text($body, 'result', 10000);
            $blockers = input_text($body, 'blockers', 10000);
            $nextStep = input_text($body, 'next_step', 10000);
            $fileRefs = input_text($body, 'file_refs', 5000);

            $stmt = $pdo->prepare(
                'INSERT INTO work_sessions
                 (project_id, task_id, started_at, ended_at, summary, result, blockers, next_step, file_refs)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$projectId, $taskId, $startedAt, $endedAt, $summary, $result, $blockers, $nextStep, $fileRefs]);
            out(['session' => session_row($pdo, (int) $pdo->lastInsertId())], 201);
        }

        if ($sessionId !== null) {
            $current = session_row($pdo, $sessionId);

            if ($method === 'GET') {
                out(['session' => $current]);
            }

            if ($method === 'PATCH') {
                $fields = [];
                $params = [];
                $taskId = $current['task_id'];
                $projectId = $current['project_id'];

                if (array_key_exists('task_id', $body)) {
                    $taskId = nullable_int($body['task_id'], 'task_id');
                    if ($taskId !== null) {
                        $task = task_row($pdo, $taskId);
                        $projectId = $task['project_id'];
                        $fields[] = 'task_id = ?';
                        $params[] = $taskId;
                        $fields[] = 'project_id = ?';
                        $params[] = $projectId;
                    } else {
                        $fields[] = 'task_id = NULL';
                    }
                }
                if (array_key_exists('project_id', $body)) {
                    $projectId = nullable_int($body['project_id'], 'project_id');
                    if ($projectId !== null) project_exists($pdo, $projectId);
                    if ($taskId !== null) {
                        $task = task_row($pdo, $taskId);
                        if ($projectId !== null && $task['project_id'] !== $projectId) {
                            fail('Proyek tidak sesuai dengan tugas');
                        }
                    }
                    $fields[] = 'project_id = ?';
                    $params[] = $projectId;
                }
                if ($taskId === null && $projectId === null) fail('project_id atau task_id wajib diisi');

                $startedAt = array_key_exists('started_at', $body)
                    ? datetime_value($body['started_at'], 'started_at')
                    : $current['started_at'];
                $endedAt = array_key_exists('ended_at', $body)
                    ? datetime_value($body['ended_at'], 'ended_at')
                    : $current['ended_at'];
                if ($startedAt === null) fail('started_at tidak valid');
                if ($endedAt !== null && strtotime($endedAt) < strtotime($startedAt)) {
                    fail('ended_at tidak boleh lebih awal dari started_at');
                }
                if (array_key_exists('started_at', $body)) {
                    $fields[] = 'started_at = ?';
                    $params[] = $startedAt;
                }
                if (array_key_exists('ended_at', $body)) {
                    $fields[] = 'ended_at = ?';
                    $params[] = $endedAt;
                }
                foreach (['summary', 'result', 'blockers', 'next_step'] as $key) {
                    if (array_key_exists($key, $body)) {
                        $fields[] = "$key = ?";
                        $params[] = input_text($body, $key, 10000);
                    }
                }
                if (array_key_exists('file_refs', $body)) {
                    $fields[] = 'file_refs = ?';
                    $params[] = input_text($body, 'file_refs', 5000);
                }
                if ($fields === []) fail('Tidak ada perubahan yang dikirim');
                $params[] = $sessionId;
                $stmt = $pdo->prepare('UPDATE work_sessions SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ?');
                $stmt->execute($params);
                out(['session' => session_row($pdo, $sessionId)]);
            }

            if ($method === 'DELETE') {
                $stmt = $pdo->prepare('UPDATE work_sessions SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL');
                $stmt->execute([$sessionId]);
                out(['ok' => true, 'archived' => true]);
            }
        }
    }

    // /api/skills
    if (($seg[0] ?? '') === 'skills') {
        $skillId = segment_id($seg, 1);
        $sub = $seg[2] ?? null;

        if ($method === 'GET' && $skillId === null) {
            $where = ['sk.archived_at IS NULL'];
            $params = [];
            if (isset($_GET['status']) && $_GET['status'] !== '') {
                $params[] = input_enum($_GET['status'], SKILL_STATUSES, 'status');
                $where[] = 'sk.status = ?';
            }
            if (isset($_GET['project_id']) && $_GET['project_id'] !== '') {
                $params[] = input_int($_GET['project_id'], 'project_id');
                $where[] = 'sk.project_id = ?';
            }
            if (isset($_GET['q']) && trim((string) $_GET['q']) !== '') {
                $q = '%' . trim((string) $_GET['q']) . '%';
                $where[] = '(sk.name LIKE ? OR sk.description LIKE ? OR sk.target LIKE ?)';
                array_push($params, $q, $q, $q);
            }
            $stmt = $pdo->prepare(
                "SELECT sk.*, p.name AS project,
                        (SELECT COUNT(*) FROM learning_resources r WHERE r.skill_id = sk.id AND r.archived_at IS NULL) AS resource_total,
                        (SELECT COUNT(*) FROM learning_resources r WHERE r.skill_id = sk.id AND r.status = 'completed' AND r.archived_at IS NULL) AS resource_done,
                        (SELECT COUNT(*) FROM skill_notes n WHERE n.skill_id = sk.id AND n.archived_at IS NULL) AS note_count
                 FROM skills sk
                 LEFT JOIN projects p ON p.id = sk.project_id AND p.archived_at IS NULL
                 WHERE " . implode(' AND ', $where) . "
                 ORDER BY FIELD(sk.status, 'learning', 'practicing', 'not_started', 'completed'), sk.updated_at DESC"
            );
            $stmt->execute($params);
            $skills = array_map('format_skill', $stmt->fetchAll());
            out(['skills' => $skills]);
        }

        if ($method === 'POST' && $skillId === null) {
            $name = input_text($body, 'name', 150, true);
            $description = input_text($body, 'description', 10000);
            $target = input_text($body, 'target', 255);
            $status = input_enum($body['status'] ?? 'not_started', SKILL_STATUSES, 'status');
            $progress = input_int($body['progress'] ?? 0, 'progress', 0);
            if ($progress > 100) fail('progress maksimal 100');
            $notes = input_text($body, 'notes', 10000);
            $projectId = nullable_int($body['project_id'] ?? null, 'project_id');
            if ($projectId !== null) project_exists($pdo, $projectId);

            $stmt = $pdo->prepare(
                'INSERT INTO skills (name, description, target, status, progress, notes, project_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$name, $description, $target, $status, $progress, $notes, $projectId]);
            out(['skill' => skill_row($pdo, (int) $pdo->lastInsertId())], 201);
        }

        if ($skillId !== null) {
            skill_row($pdo, $skillId);

            if ($method === 'GET' && $sub === null) {
                $stmt = $pdo->prepare(
                    'SELECT * FROM learning_resources WHERE skill_id = ? AND archived_at IS NULL ORDER BY id'
                );
                $stmt->execute([$skillId]);
                $resources = array_map('format_resource', $stmt->fetchAll());
                $stmt = $pdo->prepare(
                    'SELECT * FROM skill_notes WHERE skill_id = ? AND archived_at IS NULL ORDER BY created_at DESC, id DESC'
                );
                $stmt->execute([$skillId]);
                $notes = array_map('format_note', $stmt->fetchAll());
                out(['skill' => skill_row($pdo, $skillId), 'resources' => $resources, 'notes' => $notes]);
            }

            if ($method === 'GET' && $sub === 'resources') {
                $stmt = $pdo->prepare(
                    'SELECT * FROM learning_resources WHERE skill_id = ? AND archived_at IS NULL ORDER BY id'
                );
                $stmt->execute([$skillId]);
                out(['resources' => array_map('format_resource', $stmt->fetchAll())]);
            }

            if ($method === 'POST' && $sub === 'resources') {
                $title = input_text($body, 'title', 255, true);
                $url = input_text($body, 'url', 500);
                $type = input_enum($body['type'] ?? 'other', RESOURCE_TYPES, 'type');
                $status = input_enum($body['status'] ?? 'planned', RESOURCE_STATUSES, 'status');
                $notes = input_text($body, 'notes', 10000);
                $stmt = $pdo->prepare(
                    'INSERT INTO learning_resources (skill_id, title, url, type, status, notes)
                     VALUES (?, ?, ?, ?, ?, ?)'
                );
                $stmt->execute([$skillId, $title, $url, $type, $status, $notes]);
                $stmt = $pdo->prepare('SELECT * FROM learning_resources WHERE id = ?');
                $stmt->execute([(int) $pdo->lastInsertId()]);
                out(['resource' => format_resource($stmt->fetch())], 201);
            }

            if ($method === 'GET' && $sub === 'notes') {
                $stmt = $pdo->prepare(
                    'SELECT * FROM skill_notes WHERE skill_id = ? AND archived_at IS NULL ORDER BY created_at DESC, id DESC'
                );
                $stmt->execute([$skillId]);
                out(['notes' => array_map('format_note', $stmt->fetchAll())]);
            }

            if ($method === 'POST' && $sub === 'notes') {
                $note = input_text($body, 'note', 10000, true);
                $stmt = $pdo->prepare('INSERT INTO skill_notes (skill_id, note) VALUES (?, ?)');
                $stmt->execute([$skillId, $note]);
                $stmt = $pdo->prepare('SELECT * FROM skill_notes WHERE id = ?');
                $stmt->execute([(int) $pdo->lastInsertId()]);
                out(['note' => format_note($stmt->fetch())], 201);
            }

            if ($method === 'PATCH' && $sub === null) {
                $fields = [];
                $params = [];
                if (array_key_exists('name', $body)) {
                    $fields[] = 'name = ?';
                    $params[] = input_text($body, 'name', 150, true);
                }
                if (array_key_exists('description', $body)) {
                    $fields[] = 'description = ?';
                    $params[] = input_text($body, 'description', 10000);
                }
                if (array_key_exists('target', $body)) {
                    $fields[] = 'target = ?';
                    $params[] = input_text($body, 'target', 255);
                }
                if (array_key_exists('status', $body)) {
                    $fields[] = 'status = ?';
                    $params[] = input_enum($body['status'], SKILL_STATUSES, 'status');
                }
                if (array_key_exists('progress', $body)) {
                    $progress = input_int($body['progress'], 'progress', 0);
                    if ($progress > 100) fail('progress maksimal 100');
                    $fields[] = 'progress = ?';
                    $params[] = $progress;
                }
                if (array_key_exists('notes', $body)) {
                    $fields[] = 'notes = ?';
                    $params[] = input_text($body, 'notes', 10000);
                }
                if (array_key_exists('project_id', $body)) {
                    $projectId = nullable_int($body['project_id'], 'project_id');
                    if ($projectId !== null) project_exists($pdo, $projectId);
                    $fields[] = 'project_id = ?';
                    $params[] = $projectId;
                }
                if ($fields === []) fail('Tidak ada perubahan yang dikirim');
                $params[] = $skillId;
                $stmt = $pdo->prepare('UPDATE skills SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ?');
                $stmt->execute($params);
                out(['skill' => skill_row($pdo, $skillId)]);
            }

            if ($method === 'DELETE' && $sub === null) {
                $stmt = $pdo->prepare('UPDATE skills SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL');
                $stmt->execute([$skillId]);
                out(['ok' => true, 'archived' => true]);
            }
        }
    }

    // /api/resources/{id}
    if (($seg[0] ?? '') === 'resources') {
        $resourceId = segment_id($seg, 1);
        if ($resourceId !== null) {
            $stmt = $pdo->prepare('SELECT * FROM learning_resources WHERE id = ? AND archived_at IS NULL');
            $stmt->execute([$resourceId]);
            $resource = $stmt->fetch();
            if (!$resource) fail('Materi belajar tidak ditemukan', 404);

            if ($method === 'PATCH') {
                $fields = [];
                $params = [];
                if (array_key_exists('title', $body)) {
                    $fields[] = 'title = ?';
                    $params[] = input_text($body, 'title', 255, true);
                }
                if (array_key_exists('url', $body)) {
                    $fields[] = 'url = ?';
                    $params[] = input_text($body, 'url', 500);
                }
                if (array_key_exists('type', $body)) {
                    $fields[] = 'type = ?';
                    $params[] = input_enum($body['type'], RESOURCE_TYPES, 'type');
                }
                if (array_key_exists('status', $body)) {
                    $fields[] = 'status = ?';
                    $params[] = input_enum($body['status'], RESOURCE_STATUSES, 'status');
                }
                if (array_key_exists('notes', $body)) {
                    $fields[] = 'notes = ?';
                    $params[] = input_text($body, 'notes', 10000);
                }
                if ($fields === []) fail('Tidak ada perubahan yang dikirim');
                $params[] = $resourceId;
                $stmt = $pdo->prepare('UPDATE learning_resources SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = ?');
                $stmt->execute($params);
                $stmt = $pdo->prepare('SELECT * FROM learning_resources WHERE id = ?');
                $stmt->execute([$resourceId]);
                out(['resource' => format_resource($stmt->fetch())]);
            }

            if ($method === 'DELETE') {
                $stmt = $pdo->prepare('UPDATE learning_resources SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL');
                $stmt->execute([$resourceId]);
                out(['ok' => true, 'archived' => true]);
            }
        }
    }

    // /api/notes/{id}
    if (($seg[0] ?? '') === 'notes') {
        $noteId = segment_id($seg, 1);
        if ($noteId !== null) {
            $stmt = $pdo->prepare('SELECT * FROM skill_notes WHERE id = ? AND archived_at IS NULL');
            $stmt->execute([$noteId]);
            $note = $stmt->fetch();
            if (!$note) fail('Catatan belajar tidak ditemukan', 404);

            if ($method === 'PATCH') {
                $value = input_text($body, 'note', 10000, true);
                $stmt = $pdo->prepare('UPDATE skill_notes SET note = ?, updated_at = NOW() WHERE id = ?');
                $stmt->execute([$value, $noteId]);
                $stmt = $pdo->prepare('SELECT * FROM skill_notes WHERE id = ?');
                $stmt->execute([$noteId]);
                out(['note' => format_note($stmt->fetch())]);
            }

            if ($method === 'DELETE') {
                $stmt = $pdo->prepare('UPDATE skill_notes SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL');
                $stmt->execute([$noteId]);
                out(['ok' => true, 'archived' => true]);
            }
        }
    }

    out(['error' => 'Endpoint tidak ditemukan'], 404);
} catch (PDOException $error) {
    error_log($error->getMessage());
    out(['error' => 'Kesalahan database'], 500);
}
