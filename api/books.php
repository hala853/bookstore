<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ──────────────────────────────────────
//  GET: جلب جميع الكتب
// ──────────────────────────────────────
if ($method === 'GET' && $action === 'all') {
    $stmt = $pdo->query('SELECT * FROM books ORDER BY id DESC');
    respond($stmt->fetchAll());
}

// ──────────────────────────────────────
//  GET: جلب كتاب واحد
// ──────────────────────────────────────
if ($method === 'GET' && $action === 'single') {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) respond(['error' => 'id مطلوب'], 400);

    $stmt = $pdo->prepare('SELECT * FROM books WHERE id = ?');
    $stmt->execute([$id]);
    $book = $stmt->fetch();
    if (!$book) respond(['error' => 'الكتاب غير موجود'], 404);

    respond($book);
}

// ──────────────────────────────────────
//  GET: الأكثر مبيعاً / قراءة / مشاهدة
// ──────────────────────────────────────
if ($method === 'GET' && in_array($action, ['top_sold', 'top_read', 'top_viewed'])) {
    $col_map = [
        'top_sold'   => 'sold_count',
        'top_read'   => 'read_count',
        'top_viewed' => 'view_count',
    ];
    $col   = $col_map[$action];
    $limit = intval($_GET['limit'] ?? 10);

    $stmt = $pdo->prepare("SELECT * FROM books ORDER BY $col DESC LIMIT ?");
    $stmt->execute([$limit]);
    respond($stmt->fetchAll());
}

// ──────────────────────────────────────
//  GET: فلترة حسب التصنيف
// ──────────────────────────────────────
if ($method === 'GET' && $action === 'by_category') {
    $cat = trim($_GET['cat'] ?? '');
    if (!$cat) respond(['error' => 'التصنيف مطلوب'], 400);

    $stmt = $pdo->prepare('SELECT * FROM books WHERE category = ? ORDER BY id DESC');
    $stmt->execute([$cat]);
    respond($stmt->fetchAll());
}

// ──────────────────────────────────────
//  POST: إضافة كتاب (admin فقط)
// ──────────────────────────────────────
if ($method === 'POST' && $action === 'add') {
    requireAdmin($pdo);

    $data = json_decode(file_get_contents('php://input'), true);

    $title    = trim($data['title']  ?? '');
    $author   = trim($data['author'] ?? '');
    $category = trim($data['category'] ?? '');
    $price    = intval($data['price'] ?? 0);
    $desc     = trim($data['description'] ?? '');
    $bio      = trim($data['author_bio']  ?? '');
    $symbol   = trim($data['symbol'] ?? '*');
    $vip      = isset($data['vip']) ? (int)(bool)$data['vip'] : 0;
    $cover    = trim($data['cover_class'] ?? 'cc1');

    if (!$title || !$author || !$price) {
        respond(['error' => 'العنوان والمؤلف والسعر مطلوبة'], 400);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO books (title, author, category, price, description, author_bio, symbol, vip, cover_class)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$title, $author, $category, $price, $desc, $bio, $symbol, $vip, $cover]);

    respond(['success' => true, 'id' => $pdo->lastInsertId()], 201);
}

// ──────────────────────────────────────
//  PUT: تعديل كتاب (admin فقط)
// ──────────────────────────────────────
if ($method === 'PUT' && $action === 'update') {
    requireAdmin($pdo);

    $id   = intval($_GET['id'] ?? 0);
    if (!$id) respond(['error' => 'id مطلوب'], 400);

    $data = json_decode(file_get_contents('php://input'), true);

    // بناء الجملة ديناميكياً — نحدّث فقط الحقول الموجودة
    $allowed = ['title','author','category','price','description','author_bio','symbol','vip','cover_class'];
    $set = [];
    $values = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $set[]    = "$field = ?";
            $values[] = $data[$field];
        }
    }

    if (!$set) respond(['error' => 'لا توجد بيانات للتحديث'], 400);

    $values[] = $id;
    $stmt = $pdo->prepare('UPDATE books SET ' . implode(', ', $set) . ' WHERE id = ?');
    $stmt->execute($values);

    respond(['success' => true]);
}
// ──────────────────────────────────────
//  DELETE: حذف كتاب (admin فقط)
// ──────────────────────────────────────
if ($method === 'DELETE' && $action === 'delete') {
    requireAdmin($pdo);

    $id = intval($_GET['id'] ?? 0);
    if (!$id) respond(['error' => 'id مطلوب'], 400);

    $pdo->prepare('DELETE FROM books WHERE id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM ratings WHERE book_id = ?')->execute([$id]);

    respond(['success' => true]);
}

// ──────────────────────────────────────
//  POST: تسجيل قراءة PDF (زيادة العداد)
// ──────────────────────────────────────
if ($method === 'POST' && $action === 'view_pdf') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $book_id = intval($data['book_id'] ?? 0);
    $user_id = intval($data['user_id'] ?? 0);

    if (!$book_id || !$user_id) respond(['error' => 'book_id و user_id مطلوبان'], 400);

    // تحقق أن المستخدم عضو VIP إذا كان الكتاب VIP
    $stmt = $pdo->prepare('SELECT vip FROM books WHERE id = ?');
    $stmt->execute([$book_id]);
    $book = $stmt->fetch();

    if (!$book) respond(['error' => 'الكتاب غير موجود'], 404);

    if ($book['vip']) {
        $uStmt = $pdo->prepare('SELECT vip FROM users WHERE id = ?');
        $uStmt->execute([$user_id]);
        $user = $uStmt->fetch();
        if (!$user || !$user['vip']) {
            respond(['error' => 'هذا الكتاب لأعضاء VIP فقط'], 403);
        }
    }

    $pdo->prepare('UPDATE books SET view_count = view_count + 1 WHERE id = ?')->execute([$book_id]);
    respond(['success' => true]);
}

// ──────────────────────────────────────
//  POST: تقييم كتاب
// ──────────────────────────────────────
if ($method === 'POST' && $action === 'rate') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $user_id = intval($data['user_id'] ?? 0);
    $book_id = intval($data['book_id'] ?? 0);
    $stars   = intval($data['stars']   ?? 0);

    if (!$user_id || !$book_id || $stars < 1 || $stars > 5) {
        respond(['error' => 'بيانات التقييم غير صحيحة'], 400);
    }

    // insert or update
    $stmt = $pdo->prepare(
        'INSERT INTO ratings (user_id, book_id, stars)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE stars = VALUES(stars), rated_at = NOW()'
    );
    $stmt->execute([$user_id, $book_id, $stars]);

    // حساب متوسط التقييم وتحديثه
    $avg = $pdo->prepare(
        'SELECT ROUND(AVG(stars),1) as avg, COUNT(*) as cnt FROM ratings WHERE book_id = ?'
    );
    $avg->execute([$book_id]);
    $result = $avg->fetch();

    $pdo->prepare('UPDATE books SET avg_rating = ?, rating_count = ? WHERE id = ?')
        ->execute([$result['avg'], $result['cnt'], $book_id]);

    respond(['success' => true, 'avg' => $result['avg'], 'count' => $result['cnt']]);
}

// ──────────────────────────────────────
//  GET: جلب تقييم مستخدم لكتاب معين
// ──────────────────────────────────────
if ($method === 'GET' && $action === 'my_rating') {
    $user_id = intval($_GET['user_id'] ?? 0);
    $book_id = intval($_GET['book_id'] ?? 0);

    if (!$user_id || !$book_id) respond(['error' => 'user_id و book_id مطلوبان'], 400);

    $stmt = $pdo->prepare('SELECT stars FROM ratings WHERE user_id = ? AND book_id = ?');
    $stmt->execute([$user_id, $book_id]);
    $r = $stmt->fetch();

    respond(['stars' => $r ? (int)$r['stars'] : 0]);
}

// ──────────────────────────────────────
//  POST: شراء كتاب (إضافة لسجل المشتريات)
// ──────────────────────────────────────
if ($method === 'POST' && $action === 'purchase') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $user_id = intval($data['user_id'] ?? 0);
    $book_id = intval($data['book_id'] ?? 0);

    if (!$user_id || !$book_id) respond(['error' => 'user_id و book_id مطلوبان'], 400);

    // تحقق ألا يكون اشترى نفس الكتاب
    $check = $pdo->prepare('SELECT id FROM purchases WHERE user_id = ? AND book_id = ?');
    $check->execute([$user_id, $book_id]);
    if ($check->fetch()) respond(['error' => 'الكتاب مشترى مسبقاً'], 400);
    $pdo->prepare('INSERT INTO purchases (user_id, book_id) VALUES (?, ?)')->execute([$user_id, $book_id]);
    $pdo->prepare('UPDATE books SET sold_count = sold_count + 1 WHERE id = ?')->execute([$book_id]);

    respond(['success' => true]);
}

// ──────────────────────────────────────
//  Helper: التحقق من صلاحية Admin
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