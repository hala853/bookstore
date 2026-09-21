<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// تسجيل مستخدم جديد
if ($method === 'POST' && $action === 'register') {
    $data = json_decode(file_get_contents('php://input'), true);

    $name       = trim($data['name'] ?? '');
    $email      = trim($data['email'] ?? '');
    $password   = trim($data['password'] ?? '');
    $birth_year = intval($data['birth_year'] ?? 0);

    if (!$name || !$email || !$password) {
        respond(['error' => 'يرجى تعبئة جميع الحقول'], 400);
    }

    // تحقق إذا البريد مسجل
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        respond(['error' => 'هذا البريد مسجل مسبقا'], 400);
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password, birth_year) VALUES (?, ?, ?, ?)');
    $stmt->execute([$name, $email, $hashed, $birth_year]);

    respond([
        'success' => true,
        'user' => [
            'id'    => $pdo->lastInsertId(),
            'name'  => $name,
            'email' => $email,
            'vip'   => false
        ]
    ]);
}

// تسجيل الدخول
if ($method === 'POST' && $action === 'login') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $email    = trim($data['email'] ?? '');
    $password = trim($data['password'] ?? '');

    if (!$email || !$password) {
        respond(['error' => 'يرجى تعبئة جميع الحقول'], 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        respond(['error' => 'البريد او كلمة المرور غير صحيحة'], 401);
    }

    if ($user['is_banned']) {
        respond(['error' => 'هذا الحساب محظور'], 403);
    }

    if (!password_verify($password, $user['password'])) {
        respond(['error' => 'البريد او كلمة المرور غير صحيحة'], 401);
    }

    respond([
        'success' => true,
        'user' => [
            'id'    => $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'vip'   => (bool)$user['vip']
        ]
    ]);
}

// تفعيل VIP
if ($method === 'POST' && $action === 'activate_vip') {
    $data  = json_decode(file_get_contents('php://input'), true);
    $email = trim($data['email'] ?? '');
    $code  = trim($data['code'] ?? '');

    if ($code !== '##@hala@##') {
        respond(['error' => 'كود غير صحيح'], 400);
    }

    $stmt = $pdo->prepare('UPDATE users SET vip = 1 WHERE email = ?');
    $stmt->execute([$email]);

    respond(['success' => true]);
}

respond(['error' => 'طلب غير صحيح'], 400);
?>