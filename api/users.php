<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ──────────────────────────────────────
//  GET: جلب بروفايل المستخدم
// ──────────────────────────────────────
if ($method === 'GET' && $action === 'profile') {
    $user_id = intval($_GET['user_id'] ?? 0);
    if (!$user_id) respond(['error' => 'user_id مطلوب'], 400);

    $stmt = $pdo->prepare(
        'SELECT id, name, email, birth_year, vip, is_banned, created_at FROM users WHERE id = ?'
    );
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    if (!$user) respond(['error' => 'المستخدم غير موجود'], 404);

    // عدد المشتريات
    $pc = $pdo->prepare('SELECT COUNT(*) as cnt FROM purchases WHERE user_id = ?');
    $pc->execute([$user_id]);
    $user['purchases_count'] = (int)$pc->fetch()['cnt'];

    // عدد التقييمات
    $rc = $pdo->prepare('SELECT COUNT(*) as cnt FROM ratings WHERE user_id = ?');
    $rc->execute([$user_id]);
    $user['ratings_count'] = (int)$rc->fetch()['cnt'];

    respond($user);
}

// ──────────────────────────────────────
//  GET: مشتريات المستخدم
// ──────────────────────────────────────
if ($method === 'GET' && $action === 'purchases') {
    $user_id = intval($_GET['user_id'] ?? 0);
    if (!$user_id) respond(['error' => 'user_id مطلوب'], 400);

    $stmt = $pdo->prepare(
        'SELECT b.id, b.title, b.author, b.price, b.cover_class, b.symbol,
                p.purchased_at
         FROM purchases p
         JOIN books b ON b.id = p.book_id
         WHERE p.user_id = ?
         ORDER BY p.purchased_at DESC'
    );
    $stmt->execute([$user_id]);
    respond($stmt->fetchAll());
}

// ──────────────────────────────────────
//  GET: تقييمات المستخدم
// ──────────────────────────────────────
if ($method === 'GET' && $action === 'my_ratings') {
    $user_id = intval($_GET['user_id'] ?? 0);
    if (!$user_id) respond(['error' => 'user_id مطلوب'], 400);

    $stmt = $pdo->prepare(
        'SELECT r.stars, r.rated_at,
                b.id as book_id, b.title, b.author, b.cover_class, b.symbol
         FROM ratings r
         JOIN books b ON b.id = r.book_id
         WHERE r.user_id = ?
         ORDER BY r.rated_at DESC'
    );
    $stmt->execute([$user_id]);
    respond($stmt->fetchAll());
}

// ──────────────────────────────────────
//  GET: جميع المستخدمين (admin فقط)
// ──────────────────────────────────────
if ($method === 'GET' && $action === 'all') {
    requireAdmin($pdo);

    $stmt = $pdo->query(
        'SELECT id, name, email, birth_year, vip, is_banned, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    respond($stmt->fetchAll());
}

// ──────────────────────────────────────
//  PUT: حظر / رفع حظر مستخدم (admin)
// ──────────────────────────────────────
if ($method === 'PUT' && $action === 'ban') {
    requireAdmin($pdo);

    $data    = json_decode(file_get_contents('php://input'), true);
    $user_id = intval($data['user_id'] ?? 0);
    $ban     = isset($data['ban']) ? (int)(bool)$data['ban'] : null;

    if (!$user_id || $ban === null) respond(['error' => 'user_id و ban مطلوبان'], 400);

    // لا يمكن حظر Admin
    $check = $pdo->prepare('SELECT is_admin FROM users WHERE id = ?');
    $check->execute([$user_id]);
    $u = $check->fetch();
    if (!$u) respond(['error' => 'المستخدم غير موجود'], 404);
    if ($u['is_admin']) respond(['error' => 'لا يمكن حظر المسؤول'], 403);

    $pdo->prepare('UPDATE users SET is_banned = ? WHERE id = ?')->execute([$ban, $user_id]);

    respond(['success' => true, 'banned' => (bool)$ban]);
}

// ──────────────────────────────────────
//  PUT: منح / سحب VIP (admin)
// ──────────────────────────────────────
if ($method === 'PUT' && $action === 'set_vip') {
    requireAdmin($pdo);

    $data    = json_decode(file_get_contents('php://input'), true);
    $user_id = intval($data['user_id'] ?? 0);
    $vip     = isset($data['vip']) ? (int)(bool)$data['vip'] : null;

    if (!$user_id || $vip === null) respond(['error' => 'user_id و vip مطلوبان'], 400);
    $pdo->prepare('UPDATE users SET vip = ? WHERE id = ?')->execute([$vip, $user_id]);
    respond(['success' => true]);
}

// ──────────────────────────────────────
//  DELETE: حذف مستخدم (admin)
// ──────────────────────────────────────
if ($method === 'DELETE' && $action === 'delete') {
    requireAdmin($pdo);

    $user_id = intval($_GET['user_id'] ?? 0);
    if (!$user_id) respond(['error' => 'user_id مطلوب'], 400);

    // لا يمكن حذف Admin
    $check = $pdo->prepare('SELECT is_admin FROM users WHERE id = ?');
    $check->execute([$user_id]);
    $u = $check->fetch();
    if (!$u) respond(['error' => 'المستخدم غير موجود'], 404);
    if ($u['is_admin']) respond(['error' => 'لا يمكن حذف المسؤول'], 403);

    // حذف متسلسل
    $pdo->prepare('DELETE FROM purchases WHERE user_id = ?')->execute([$user_id]);
    $pdo->prepare('DELETE FROM ratings   WHERE user_id = ?')->execute([$user_id]);
    $pdo->prepare('DELETE FROM users     WHERE id = ?')    ->execute([$user_id]);

    respond(['success' => true]);
}

// ──────────────────────────────────────
//  PUT: تعديل بيانات المستخدم (المستخدم نفسه)
// ──────────────────────────────────────
if ($method === 'PUT' && $action === 'update_profile') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $user_id = intval($data['user_id'] ?? 0);
    if (!$user_id) respond(['error' => 'user_id مطلوب'], 400);

    $allowed = ['name', 'birth_year'];
    $set     = [];
    $values  = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $set[]    = "$field = ?";
            $values[] = $data[$field];
        }
    }

    // تغيير كلمة المرور
    if (!empty($data['new_password'])) {
        $set[]    = 'password = ?';
        $values[] = password_hash($data['new_password'], PASSWORD_DEFAULT);
    }

    if (!$set) respond(['error' => 'لا توجد بيانات للتحديث'], 400);

    $values[] = $user_id;
    $pdo->prepare('UPDATE users SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($values);

    respond(['success' => true]);
}

// ──────────────────────────────────────
//  Helper
// ──────────────────────────────────────
function requireAdmin($pdo) {
    $email = $_SERVER['HTTP_X_ADMIN_EMAIL'] ?? '';
    if (!$email) respond(['error' => 'غير مصرح'], 401);

    $stmt = $pdo->prepare('SELECT is_admin FROM users WHERE email = ? AND is_admin = 1');
    $stmt->execute([$email]);
    if (!$stmt->fetch()) respond(['error' => 'غير مصرح'], 403);
}

respond(['error' => 'طلب غير صحيح'], 400);
?>