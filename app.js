/* ═══════════════════════════════════════════════════════
   API CONFIG
═══════════════════════════════════════════════════════ */
const API = {
    books:  'api/books.php',
    auth:   'api/auth.php',
    users:  'api/users.php',
};

const ADMIN_CRED = { email: 'hala@gmail.com', pass: 'hala', name: 'هالة' };

/* ═══ CONSTANTS ═══ */
const SC      = ['sc0','sc1','sc2','sc3','sc4','sc5','sc6','sc7','sc8','sc9','sc10','sc11'];
const CC      = ['cc0','cc1','cc2','cc3','cc4','cc5','cc6','cc7','cc8','cc9','cc10','cc11'];
const HEIGHTS = [172,162,178,158,168,152,165,160,155,142,176,153];

/* ═══ STATE ═══ */
let USER     = null;
let VIP      = false;
let IS_ADMIN = false;
let CART     = [];
let FKEY     = 'all';
let ALL_BOOKS = [];

/* ═══════════════════════════════════════════════════════
   FETCH HELPERS
═══════════════════════════════════════════════════════ */
async function apiFetch(url, options = {}) {
    try {
        const res  = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        const data = await res.json();
        return data;
    } catch (e) {
        console.error('API Error:', e);
        return { error: 'خطأ في الاتصال بالسيرفر' };
    }
}

function apiGet(base, params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`${base}?${q}`);
}

function apiPost(base, action, body) {
    return apiFetch(`${base}?action=${action}`, {
        method: 'POST',
        body:   JSON.stringify(body),
    });
}

function apiPut(base, action, body) {
    return apiFetch(`${base}?action=${action}`, {
        method: 'PUT',
        body:   JSON.stringify(body),
    });
}

function apiDelete(base, params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`${base}?${q}`, { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
(async function init() {
    // بناء قائمة سنوات الميلاد
    const s = document.getElementById('rgY');
    for (let y = 2008; y >= 1940; y--)
        s.innerHTML += `<option value="${y}">${y}</option>`;

    // جلب الكتب من API
    await loadBooks();
})();

async function loadBooks() {
    ALL_BOOKS = [
        { id: 1, title: "عشرة أفراد صغار", cat: "جريمة وغموض", price: 60000, read: 1, sold: 1, views: 1, vip: 0, cover: "" },
        { id: 2, title: "النفوس الميتة", cat: "روايات كلاسيكية", price: 72000, read: 1, sold: 0, views: 1, vip: 1, cover: "" },
        { id: 3, title: "المعطف", cat: "روايات كلاسيكية", price: 15000, read: 1, sold: 1, views: 1, vip: 0, cover: "" },
        { id: 4, title: "الأخوة كارامازوف", cat: "روايات كلاسيكية", price: 95000, read: 1, sold: 0, views: 1, vip: 1, cover: "" },
        { id: 5, title: "موت في النيل", cat: "جريمة وغموض", price: 62000, read: 1, sold: 0, views: 1, vip: 0, cover: "" },
        { id: 6, title: "قتل على قطار الشرق", cat: "جريمة وغموض", price: 65000, read: 1, sold: 0, views: 1, vip: 1, cover: "" },
        { id: 7, title: "مزرعة الحيوانات", cat: "روايات كلاسيكية", price: 55000, read: 1, sold: 0, views: 1, vip: 0, cover: "" },
        { id: 8, title: "1984", cat: "روايات كلاسيكية", price: 70000, read: 1, sold: 0, views: 1, vip: 1, cover: "" },
        { id: 9, title: "لعبة الملاك", cat: "رعب وعلمي", price: 85000, read: 1, sold: 0, views: 1, vip: 0, cover: "" },
        { id: 10, title: "ظل الريح", cat: "رعب وعلمي", price: 90000, read: 1, sold: 0, views: 1, vip: 1, cover: "" },
        { id: 11, title: "الجريمة والعقاب", cat: "روايات كلاسيكية", price: 98000, read: 1, sold: 0, views: 1, vip: 1, cover: "" },
        { id: 12, title: "الأبله", cat: "روايات كلاسيكية", price: 92000, read: 1, sold: 0, views: 1, vip: 0, cover: "" }
    ];
    renderShelves();
    renderCards(getF(FKEY));
    updateSideCounts();
    updateStatBar();
}
/* ═══════════════════════════════════════════════════════
   PAGE SYSTEM
═══════════════════════════════════════════════════════ */
function showPage(p) {
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.getElementById('page-' + p).classList.add('active');
    if (p === 'profile') renderProfile();
    if (p === 'admin')   { if (!IS_ADMIN) { showPage('home'); return; } renderAdminFull(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══ MODAL HELPERS ═══ */
function om(id) { document.getElementById(id).classList.add('on'); }
function cm(id) { document.getElementById(id).classList.remove('on'); }
function sw2r() { cm('siModal'); om('rgModal'); }
function sw2s() { cm('rgModal'); om('siModal'); }
document.querySelectorAll('.overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('on'); })
);

/* ═══════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════ */
async function doSI() {
    const e   = document.getElementById('siE').value.trim();
    const p   = document.getElementById('siP').value.trim();
    const err = document.getElementById('siErr');
    err.textContent = '';

    if (!e || !p) { err.textContent = 'يرجى تعبئة جميع الحقول'; return; }
    // أدمن
    if (e === ADMIN_CRED.email && p === ADMIN_CRED.pass) {
        USER     = { name: ADMIN_CRED.name, email: ADMIN_CRED.email };
        IS_ADMIN = true;
        VIP      = true;
        updUI(); cm('siModal');
        ntf('مرحبا يا ' + ADMIN_CRED.name + ' — دخلت كمسؤول');
        return;
    }

    // مستخدم عادي
    const res = await apiPost(API.auth, 'login', { email: e, password: p });
    if (res.error) { err.textContent = res.error; return; }

    USER     = res.user;
    VIP      = res.user.vip;
    IS_ADMIN = false;
    updUI(); cm('siModal');
    document.getElementById('vipArea').style.display = 'block';
    ntf('اهلا بك ' + USER.name);
}

async function doRG() {
    const n   = document.getElementById('rgN').value.trim();
    const e   = document.getElementById('rgE').value.trim();
    const p   = document.getElementById('rgP').value.trim();
    const y   = document.getElementById('rgY').value;
    const err = document.getElementById('rgErr');
    err.textContent = '';

    if (!n || !e||  !p || !y) { err.textContent = 'يرجى تعبئة جميع الحقول'; return; }

    const res = await apiPost(API.auth, 'register', {
        name: n, email: e, password: p, birth_year: parseInt(y)
    });
    if (res.error) { err.textContent = res.error; return; }

    USER     = res.user;
    VIP      = false;
    IS_ADMIN = false;
    updUI(); cm('rgModal');
    ntf('مرحبا ' + USER.name + '! تم انشاء حسابك');
}

function doSO() {
    USER = null; VIP = false; IS_ADMIN = false; CART = [];
    document.getElementById('cCnt').textContent = 0;
    updUI(); loadBooks(); showPage('home');
    ntf('تم تسجيل الخروج');
}

function updUI() {
    const ad   = document.getElementById('authDiv');
    const so   = document.getElementById('soBtn');
    const ac   = document.getElementById('accBtn');
    const admb = document.getElementById('admBtn');
    const ui   = document.getElementById('uInfo');

    if (USER) {
        ad.style.display   = 'none';
        so.style.display   = 'block';
        ac.style.display   = 'block';
        admb.style.display = IS_ADMIN ? 'block' : 'none';
        ui.classList.add('on');
        document.getElementById('uName').textContent       = USER.name;
        document.getElementById('vipTag').style.display    = VIP      ? 'inline' : 'none';
        document.getElementById('adminTag').style.display  = IS_ADMIN ? 'inline' : 'none';
    } else {
        ad.style.display   = 'flex';
        so.style.display   = 'none';
        ac.style.display   = 'none';
        admb.style.display = 'none';
        ui.classList.remove('on');
        document.getElementById('vipTag').style.display   = 'none';
        document.getElementById('adminTag').style.display = 'none';
    }
}

async function doVIP() {
    const c = document.getElementById('vipInp').value.trim();
    if (!USER) { needLogin(); return; }
    const res = await apiPost(API.auth, 'activate_vip', { email: USER.email, code: c });
    if (res.error) { ntf('كود غير صحيح'); return; }
    VIP = true; USER.vip = true;
    updUI(); cm('siModal'); loadBooks();
    ntf('تم تفعيل عضوية VIP');
}

async function doVIPProf() {
    const c = document.getElementById('vipProfInp').value.trim();
    if (!USER) return;
    const res = await apiPost(API.auth, 'activate_vip', { email: USER.email, code: c });
    if (res.error) { ntf('كود غير صحيح'); return; }
    VIP = true; USER.vip = true;
    updUI(); loadBooks(); renderProfile();
    ntf('تم تفعيل عضوية VIP');
}

/* ═══════════════════════════════════════════════════════
   SHELVES
═══════════════════════════════════════════════════════ */
function spineH(b, rank, idx) {
    const sc = SC[idx % SC.length];
    const h  = HEIGHTS[idx % HEIGHTS.length];
    const rk = rank ? `<div class="spine-rank">${rank}</div>` : '';
    const lt = Math.round(h * .15), lb = Math.round(h * .85), cy = Math.round(h * .5) - 5;
    return `<div class="spine" onclick="openDet(${b.id})" onmouseenter="showTip(event,${b.id})" onmouseleave="hideTip()">
        <div class="spine-body ${sc}" style="height:${h}px;width :52px">
            ${rk}
            <div class="spine-line" style="top:${lt}px;"></div>
            <div class="spine-circle" style="top:${cy}px;"></div>
            <div class="spine-line" style="top:${lb}px;"></div>
            <div class="spine-txt">${b.title}</div>
            <div class="spine-glow"></div>
        </div>
        <div class="spine-bot"></div>
    </div>`;
}

function showTip(e, id) {
    const b = ALL_BOOKS.find(x => x.id == id);
    if (!b) return;
    const tip = document.getElementById('globalTip');
    tip.innerHTML = `
        <div class="stt-t">${b.title}</div>
        <div class="stt-a">${b.author}</div>
        ${b.translator ? `<div class="stt-tr">ترجمة: ${b.translator}</div>` : ''}
        <div class="stt-p">${parseInt(b.price).toLocaleString('ar-SY')} ل.س</div>
        <div class="stt-bs">
            <button class="stt-b stt-buy" onclick="addCart(${b.id})">+ سلة</button>
            <button class="stt-b stt-inf" onclick="openDet(${b.id})">تفاصيل</button>
        </div>`;
    tip.style.display = 'block';
    const rect = e.currentTarget.getBoundingClientRect();
    tip.style.top  = (rect.top - tip.offsetHeight - 12) + 'px';
    tip.style.left = (rect.left + rect.width / 2) + 'px';
}

function hideTip() {
    document.getElementById('globalTip').style.display = 'none';
}

function candleHTML() {
    return `<div class="spine" style="cursor:default;pointer-events:none;">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:168px;">
            <div style="width:8px;height:15px;background:radial-gradient(ellipse at 50% 85%,#f5c840,rgba(245,155,20,.4),transparent);border-radius:50% 50% 30% 30%;filter:drop-shadow(0 0 5px rgba(245,190,55,.7));animation:flicker 2s ease-in-out infinite;"></div>
            <div style="width:11px;height:55px;border-radius:1px 1px 0 0;background:linear-gradient(90deg,#f0dcc0,#c8901c 40%,#f0dcc0 70%,#c8901c);border:1px solid rgba(200,144,24,.3);animation:glow 2.5s ease-in-out infinite;"></div>
            <div style="width:16px;height:4px;background:linear-gradient(135deg,#a07018,#8a6035);border-radius:0 0 2px 2px;"></div>
        </div>
        <div class="spine-bot"></div>
    </div>`;
}

function distributeBooks(books, totalSlots) {
    // وزّع الكتب بالتساوي مع فراغات للشمعات
    const result = [];
    const step = Math.floor(totalSlots / (books.length + 1));
    let pos = 0;
    books.forEach((b, i) => {
        // أضف فراغات قبل كل كتاب
        while (result.length < (i + 1) * step - 1) result.push(null);
        result.push(b);
    });
    // أكمل الفراغات الباقية
    while (result.length < totalSlots) result.push(null);
    return result;
}

function renderShelves() {
    const byS = [...ALL_BOOKS].sort((a, b) => b.sold - a.sold).slice(0, 10);
    const byR = [...ALL_BOOKS].sort((a, b) => b.readcount - a.readcount).slice(0, 10);
    const byV = [...ALL_BOOKS].sort((a, b) => b.viewed - a.viewed).slice(0, 10);

    function buildRow(books) {
        // 14 خانة — كتب + شمعات بالفراغات
        const slots = 14;
        let html = '';
        let bookIdx = 0;
        
        for (let i = 0; i < slots; i++) {
            if (bookIdx < books.length) {
                // ضع كتاب
                html += spineH(books[bookIdx], bookIdx + 1, books[bookIdx].id - 1);
                bookIdx++;
                // إذا في فراغ بعد كل 4-5 كتب، حط شمعة
                if (bookIdx % 5 === 0 && bookIdx < books.length) {
                    html += candleHTML();
                    i++;
                }
            } else {
                // فراغ — شمعة
                html += candleHTML();
            }
        }
        return html;
    }

    document.getElementById('soldRow').innerHTML = buildRow(byS);
    document.getElementById('readRow').innerHTML = buildRow(byR);
    document.getElementById('viewRow').innerHTML = buildRow(byV);
}

/* ═══ STAT BAR ═══ */
function updateStatBar() {
    const byS = [...ALL_BOOKS].sort((a, b) => b.sold - a.sold)[0];
    const byR = [...ALL_BOOKS].sort((a, b) => b.readcount - a.readcount)[0];
    const byV = [...ALL_BOOKS].sort((a, b) => b.viewed - a.viewed)[0];
    if (byS) { document.getElementById('st-sold-name').textContent = byS.title; document.getElementById('st-sold-cnt').textContent = byS.sold + ' نسخة مباعة'; }
    if (byR) { document.getElementById('st-read-name').textContent = byR.title; document.getElementById('st-read-cnt').textContent = byR.readcount + ' قارئ نشط'; }
    if (byV) { document.getElementById('st-view-name').textContent = byV.title; document.getElementById('st-view-cnt').textContent = byV.viewed + ' مشاهدة'; }
}

/* ═══ SIDE COUNTS ═══ */
function updateSideCounts() {
    document.getElementById('cnt-all').textContent  = ALL_BOOKS.length;
    document.getElementById('cnt-r').textContent    = ALL_BOOKS.filter(b => b.cat === 'رواية').length;
    document.getElementById('cnt-j').textContent    = ALL_BOOKS.filter(b => b.cat === 'جريمة').length;
    document.getElementById('cnt-f').textContent    = ALL_BOOKS.filter(b => b.cat === 'فلسفة').length;
    document.getElementById('cnt-g').textContent    = ALL_BOOKS.filter(b => b.cat === 'رعب').length;
    document.getElementById('cnt-vip').textContent  = ALL_BOOKS.filter(b => b.vip == 1).length;
    document.getElementById('cnt-sold').textContent = ALL_BOOKS.filter(b => b.sold > 150).length;
}

/* ═══════════════════════════════════════════════════════
   CARDS
═══════════════════════════════════════════════════════ */
function getF(k) {
    if (k === 'all')  return ALL_BOOKS;
    if (k === 'vip')  return ALL_BOOKS.filter(b => b.vip == 1);
    if (k === 'sold') return ALL_BOOKS.filter(b => b.sold > 150);
    return ALL_BOOKS.filter(b => b.cat === k);
}

function getBadges(b) {
    let bs = [];
    if (b.sold > 150)     bs.push('<span class="bdg bdg-s">الاكثر مبيعا</span>');
    if (b.readcount > 130) bs.push('<span class="bdg bdg-r">الاكثر قراءة</span>');
    if (b.vip == 1)        bs.push('<span class="bdg bdg-v">VIP</span>');
    return bs.join('');
}
function coverHTML(b, height) {
    const cc = CC[(b.id - 1) % CC.length];
    const h  = height || 200;
    return `<div class="card-cover ${cc}" style="height:${h}px;">
        <div class="cover-spine-strip"></div>
        <div class="cover-main">
            <div class="cover-bg"></div>
            <div class="cover-texture"></div>
            <div class="cover-inner-border"><div class="cib-bl"></div><div class="cib-br"></div></div>
            <div class="cover-top">
                <div class="cover-lib-name">مكتبة الظلال</div>
                <div class="cover-divider"></div>
            </div>
            <div class="cover-title-area">
                <div class="cover-title">${b.title}</div>
                <div class="cover-author">${b.author}</div>
                ${b.translator ? `<div class="cover-translator">ترجمة: ${b.translator}</div>` : ''}
            </div>
            <div class="cover-bottom">
                <div class="cover-bottom-line"></div>
                <div class="cover-year">${b.year || ''}</div>
            </div>
        </div>
    </div>`;
}

function renderCards(list) {
    const g = document.getElementById('cardsGrid');
    if (!list.length) {
        g.innerHTML = '<div style="color:var(--cream1);padding:36px;text-align:center;grid-column:1/-1;">لا توجد كتب في هذا التصنيف</div>';
        return;
    }
    g.innerHTML = list.map((b, i) => {
        const pdfBtn = b.vip == 1
            ? (VIP
                ? `<button class="bpdf" onclick="event.stopPropagation();readPDF(${b.id})">قراءة PDF</button>`
                : `<button class="blck" onclick="event.stopPropagation();needVIP()">VIP</button>`)
            : `<button class="bpdf" onclick="event.stopPropagation();readPDF(${b.id})">قراءة PDF</button>`;

        return `<div class="book-card" style="animation-delay:${i * .04}s;" onclick="openDet(${b.id})">
            <div class="c-geo-tl"></div><div class="c-geo-br"></div>
            <div class="card-badges">${getBadges(b)}</div>
            ${coverHTML(b, 200)}
            <div class="card-info">
                <div class="ci-title">${b.title}</div>
                <div class="ci-author">${b.author}</div>
                ${b.translator ? `<div class="ci-translator">ترجمة: ${b.translator}</div>` : ''}
                <div class="ci-desc">${b.description}</div>
                <div class="card-foot">
                    <div class="ci-price">${parseInt(b.price).toLocaleString('ar-SY')} <small>ل.س</small></div>
                    <div class="card-btns">
                        <button class="bc" onclick="event.stopPropagation();addCart(${b.id})">+ سلة</button>
                        ${pdfBtn}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function fcat(el, k) {
    document.querySelectorAll('.cat').forEach(c => c.classList.remove('on'));
    el.classList.add('on'); FKEY = k; renderCards(getF(k)); gt('s-all');
}
function swTab(btn, k) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    btn.classList.add('on'); FKEY = k; renderCards(getF(k));
}

/* ═══════════════════════════════════════════════════════
   BOOK DETAIL
═══════════════════════════════════════════════════════ */
function starsHTML(bid, currentStars) {
    let h = '<div class="user-rating-row"><div style="color:var(--cream1);font-size:.8rem;margin-bottom:5px;">قيّم هذا الكتاب:</div><div class="stars">';
    for (let i = 1; i <= 5; i++)
        h += `<span class="star ${i <= currentStars ? 'lit' : ''}" onclick="setRating(${bid},${i})">&#9733;</span>`;
    h += `</div><div class="rating-lbl" id="rating-lbl">${currentStars ? 'تقييمك: ' + currentStars + ' من 5' : 'لم تقيّم بعد'}</div></div>`;
    return h;
}

async function openDet(id) {
    const b = ALL_BOOKS.find(x => x.id == id);
    if (!b) return;
    // جلب تقييم المستخدم الحالي
    let currentStars = 0;
    if (USER && !IS_ADMIN) {
        const rData = await apiGet(API.users, { action: 'my_ratings', user_id: USER.id });
        if (!rData.error) {
            const r = rData.find(x => x.book_id == id);
            if (r) currentStars = r.stars;
        }
    }

    const pdfBtn = b.vip == 1
        ? (VIP
            ? `<button class="bpdf" style="padding:7px 14px;" onclick="readPDF(${b.id})">قراءة PDF الكامل</button>`
            : `<button class="blck" style="padding:7px 14px;width:100%;margin-top:6px;" onclick="needVIP()">متاح لاعضاء VIP فقط</button>`)
        : `<button class="bpdf" style="padding:7px 14px;" onclick="readPDF(${b.id})">قراءة PDF</button>`;

    document.getElementById('detBody').innerHTML = 
    `<div style="border:1px solid var(--gold1);border-radius:2px;overflow:hidden;">
        <div class="det-top">
            <div class="det-cover-wrap">${coverHTML(b, 250)}</div>
            <div class="det-info">
                <div class="det-title">${b.title}</div>
                <div class="det-author">${b.author}</div>
                ${b.translator ? `<div class="det-translator">ترجمة: ${b.translator}</div>` : ''}
                <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:11px;">${getBadges(b)}</div>
                <div style="font-family:'Playfair Display',serif;color:var(--gold3);font-size:1.2rem;margin-bottom:11px;">
                    ${parseInt(b.price).toLocaleString('ar-SY')} <span style="font-size:.75rem;color:var(--cream1);">ل.س</span>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="bc" style="padding:7px 14px;" onclick="addCart(${b.id})">+ اضف للسلة</button>
                    ${pdfBtn}
                </div>
                ${USER && !IS_ADMIN ? starsHTML(b.id, currentStars) : `<div style="color:var(--cream1);font-size:.78rem;margin-top:12px;">سجل دخولك لتقييم هذا الكتاب</div>`}
            </div>
        </div>
        <div class="det-body">
            <div class="det-sec">عن الرواية</div>
            <div class="det-txt">${b.description}</div>
            <div class="det-sec">عن المؤلف</div>
            <div class="det-txt">${b.bio}</div>
            <div class="det-stats">
                <div><div class="ds-n">${b.sold}</div><div class="ds-l">نسخة مباعة</div></div>
                <div><div class="ds-n" style="color:var(--beige2);">${b.readcount}</div><div class="ds-l">قارئ نشط</div></div>
                <div><div class="ds-n" style="color:var(--cream1);">${b.viewed}</div><div class="ds-l">مشاهدة PDF</div></div>
            </div>
        </div>
    </div>`;
    om('detModal');
}

async function setRating(bid, stars) {
    if (!USER) { needLogin(); return; }
    const res = await apiPost(API.books, 'rate', { user_id: USER.id, book_id: bid, stars });
    if (res.error) { ntf(res.error); return; }
    document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('lit', i < stars));
    document.getElementById('rating-lbl').textContent = 'تقييمك: ' + stars + ' من 5';
    ntf('تم حفظ تقييمك');
}

/* ═══════════════════════════════════════════════════════
   PDF / VIP
═══════════════════════════════════════════════════════ */
async function readPDF(id) {
    const b = ALL_BOOKS.find(x => x.id == id);
    if (!USER) { needLogin(); return; }
    if (b.vip == 1 && !VIP) { needVIP(); return; }
    // زيادة عداد المشاهدات
    await apiPut(API.books, 'update', { id: b.id, viewed: parseInt(b.viewed) + 1, readcount: parseInt(b.readcount) + 1 });
    await loadBooks();
    cm('detModal');
    ntf('جار فتح "' + b.title + '" للقراءة...');
}

function needVIP() {
    if (!USER) { needLogin(); return; }
    ntf('فعّل عضوية VIP للوصول لهذا الكتاب');
    om('siModal');
    document.getElementById('vipArea').style.display = 'block';
}
function needLogin() { ntf('يرجى تسجيل الدخول اولا'); om('siModal'); }
/* ═══════════════════════════════════════════════════════
   CART
═══════════════════════════════════════════════════════ */
function addCart(id) {
    const b = ALL_BOOKS.find(x => x.id == id);
    if (!USER) { needLogin(); return; }
    if (CART.find(x => x.id == id)) { ntf('الكتاب في السلة بالفعل'); return; }
    CART.push(b);
    document.getElementById('cCnt').textContent = CART.length;
    ntf('تمت اضافة "' + b.title + '"');
}

function openCart() {
    const el = document.getElementById('cartBody');
    if (!CART.length) {
        el.innerHTML = `<div class="c-empty">السلة فارغة</div>`;
    } else {
        const tot = CART.reduce((s, b) => s + parseInt(b.price), 0);
        el.innerHTML = CART.map(b =>` 
        <div class="ci-row">
            <div class="ci-mini"><div class="ci-mini-inner ${CC[(b.id - 1) % CC.length]}">${b.title}</div></div>
            <div class="ci-inf">
                <div class="ci-t">${b.title}</div>
                <div class="ci-a">${b.author}</div>
                <div class="ci-p">${parseInt(b.price).toLocaleString('ar-SY')} ل.س</div>
            </div>
            <button class="xrm" onclick="rmCart(${b.id})">&#215;</button>
        </div>`).join('') + `<div class="c-tot">المجموع: ${tot.toLocaleString('ar-SY')} ل.س</div>`;
    }
    om('cartModal');
}

function rmCart(id) {
    CART = CART.filter(x => x.id != id);
    document.getElementById('cCnt').textContent = CART.length;
    openCart();
    ntf('تم الحذف من السلة');
}

async function checkout() {
    if (!CART.length) return;
    for (const b of CART) {
        await apiPost(API.books, 'purchase', { user_id: USER.id, book_id: b.id });
    }
    CART = [];
    document.getElementById('cCnt').textContent = 0;
    cm('cartModal');
    await loadBooks();
    ntf('شكرا لشرائك! طلبك قيد المعالجة');
}

/* ═══════════════════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════════════════ */
async function renderProfile() {
    if (!USER) { showPage('home'); return; }

    document.getElementById('profName').textContent   = USER.name;
    document.getElementById('profEmail').textContent  = USER.email;
    document.getElementById('profAvatar').textContent = USER.name.charAt(0) || 'م';

    let pb = '';
    if (VIP)      pb += `<span class="vip-tag" style="display:inline;">VIP</span>`;
    if (IS_ADMIN) pb += `<span class="admin-tag" style="display:inline;">مسؤول</span>`;
    document.getElementById('profBadges').innerHTML = pb;

    // VIP status
    const vs  = document.getElementById('vipStatusProf');
    const vab = document.getElementById('vipActBox');
    if (VIP) {
        vs.innerHTML   = `<div style="color:var(--gold3);margin-bottom:10px;">عضويتك VIP مفعّلة — تمتع بقراءة جميع الكتب</div>`;
        vab.style.display = 'none';
    } else {
        vs.innerHTML   = `<div style="color:var(--cream1);margin-bottom:10px;">لا تملك عضوية VIP حاليا</div>`;
        vab.style.display = 'block';
    }

    if (IS_ADMIN) {
        document.getElementById('ps-bought').textContent = '—';
        document.getElementById('ps-read').textContent   = '—';
        document.getElementById('ps-rated').textContent  = '—';
        document.getElementById('purchaseList').innerHTML = `<div style="color:var(--cream0);font-size:.85rem;">حساب المسؤول</div>`;
        document.getElementById('ratingsList').innerHTML  = `<div style="color:var(--cream0);font-size:.85rem;">حساب المسؤول</div>`;
        return;
    }

    // جلب بروفايل من API
    const profile = await apiGet(API.users, { action: 'profile', user_id: USER.id });
    if (!profile.error) {
        document.getElementById('ps-bought').textContent = profile.purchases_count || 0;
        document.getElementById('ps-read').textContent   = profile.purchases_count || 0;
        document.getElementById('ps-rated').textContent  = profile.ratings_count   || 0;
    }
    // المشتريات
    const purchases = await apiGet(API.users, { action: 'purchases', user_id: USER.id });
    const pl = document.getElementById('purchaseList');
    if (!purchases.length) {
        pl.innerHTML = `<div style="color:var(--cream0);font-size:.85rem;">لم تقم باي شراء بعد.</div>`;
    } else {
        pl.innerHTML = purchases.map(p => `
        <div class="bought-item">
            <div style="width:36px;height:50px;overflow:hidden;">${coverHTML(p, 50)}</div>
            <div class="bought-info">
                <div style="color:var(--ivory);font-size:.88rem;">${p.title}</div>
                <div class="bought-date">${p.purchased_at}</div>
            </div>
            <div style="color:var(--gold3);font-size:.82rem;">${parseInt(p.price).toLocaleString('ar-SY')} ل.س</div>
        </div>`).join('');
    }

    // التقييمات
    const ratings = await apiGet(API.users, { action: 'my_ratings', user_id: USER.id });
    const rl = document.getElementById('ratingsList');
    if (!ratings.length) {
        rl.innerHTML = '<div style="color:var(--cream0);font-size:.85rem;">لم تقم باي تقييم بعد.</div>';
    } else {
        rl.innerHTML = ratings.map(r => `
        <div class="rated-item">
            <div style="width:30px;height:44px;overflow:hidden;flex-shrink:0;">${coverHTML(r, 44)}</div>
            <div class="rated-info">
                <div class="rated-title">${r.title}</div>
                <div class="rated-author">${r.author}</div>
                <div style="color:var(--gold3);font-size:.9rem;margin-top:2px;">
                    ${'&#9733;'.repeat(r.stars)}${'&#9734;'.repeat(5 - r.stars)}
                </div>
            </div>
        </div>`).join('');
    }
}

/* ═══════════════════════════════════════════════════════
   ADMIN
═══════════════════════════════════════════════════════ */
async function renderAdminFull() {
    // Stats
    const users = await apiGet(API.users, { action: 'all' });
    document.getElementById('adm-s1').textContent = ALL_BOOKS.length;
    document.getElementById('adm-s2').textContent = users.error ? '—' : users.length;
    document.getElementById('adm-s3').textContent = '—';
    document.getElementById('adm-s4').textContent = users.error ? '—' : users.filter(u => u.vip == 1).length;

    renderActivity();
    renderBooksTable();
    renderUsersTable(users);
}

async function renderActivity() {
    const el  = document.getElementById('recentActivity');
    const act = await apiGet(API.books, { action: 'activity' });
    if (!act.length) {
        el.innerHTML = `<div style="color:var(--cream0);text-align:center;padding:20px;font-size:.85rem;">لا يوجد نشاط بعد.</div>`;
        return;
    }
    const map = { add: { cls: 'rt-add', lbl: 'اضافة' }, edit: { cls: 'rt-edit', lbl: 'تعديل' }, del: { cls: 'rt-del', lbl: 'حذف' } };
    el.innerHTML = act.map(a => `
    <div class="recent-item">
        <span class="recent-type ${map[a.action_type]?.cls || 'rt-edit'}">${map[a.action_type]?.lbl || a.action_type}</span>
        <div class="recent-name">${a.book_title} <span style="color:var(--cream0);font-size:.78rem;">— ${a.book_author}</span></div>
        <div class="recent-date">${a.done_at}</div>
    </div>`).join('');
}

function renderBooksTable() {
    const bt = document.getElementById('booksTableBody');
    bt.innerHTML = ALL_BOOKS.map(b =>` <tr>
        <td>${b.title}</td>
        <td>${b.author}</td>
        <td>${b.translator || '—'}</td>
        <td>${b.cat}</td>
        <td>${parseInt(b.price).toLocaleString('ar-SY')} ل.س</td>
        <td>${b.vip == 1 ? 'نعم' : 'لا'}</td>
        <td>
            <button class="adm-action a-edit" onclick="openEdit(${b.id})">تعديل</button>
            <button class="adm-action a-del"  onclick="delBook(${b.id})">حذف</button>
        </td>
    </tr>`).join('');
}
function renderUsersTable(users) {
    const ut = document.getElementById('usersTableBody');
    if (!users  ||users.error || !users.length) {
        ut.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--cream1);padding:20px;">لا يوجد مستخدمون مسجلون بعد</td></tr>`;
        return;
    }
    ut.innerHTML = users.map(u => `<tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.birth_year || '—'}</td>
        <td>${u.vip == 1 ? 'نعم' : 'لا'}</td>
        <td>${u.is_banned == 1 ? `<span class="banned-badge">محظور</span>` : 'نشط'}</td>
        <td>${u.is_banned == 1
            ? `<button class="adm-action a-unban" onclick="toggleBan(${u.id},0)">رفع الحظر</button>`
            : `<button class="adm-action a-ban"   onclick="toggleBan(${u.id},1)">حظر</button>`
        }</td>
    </tr>`).join('');
}

function swAdmTab(btn, id) {
    document.querySelectorAll('.adm-tab').forEach(t => t.classList.remove('on'));
    document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('on'));
    if (btn) btn.classList.add('on');
    const panel = document.getElementById(id);
    if (panel) panel.classList.add('on');
    if (id === 'adm-recent') renderActivity();
    if (id === 'adm-books')  renderBooksTable();
    if (id === 'adm-users')  renderAdminFull();
}

function openEdit(id) {
    const b = ALL_BOOKS.find(x => x.id == id);
    if (!b) return;
    document.getElementById('editFormBody').innerHTML =` 
    <div class="form-grid">
        <div class="ff"><label>العنوان</label><input type="text" id="ed-title" value="${b.title}"></div>
        <div class="ff"><label>المؤلف</label><input type="text" id="ed-author" value="${b.author}"></div>
        <div class="ff"><label>المترجم</label><input type="text" id="ed-translator" value="${b.translator || ''}"></div>
        <div class="ff"><label>التصنيف</label><select id="ed-cat">
            <option ${b.cat === 'رواية'  ? 'selected' : ''}>رواية</option>
            <option ${b.cat === 'جريمة' ? 'selected' : ''}>جريمة</option>
            <option ${b.cat === 'فلسفة' ? 'selected' : ''}>فلسفة</option>
            <option ${b.cat === 'رعب'   ? 'selected' : ''}>رعب</option>
        </select></div>
        <div class="ff"><label>السعر</label><input type="number" id="ed-price" value="${b.price}"></div>
        <div class="ff"><label>سنة النشر</label><input type="number" id="ed-year" value="${b.year || ''}"></div>
        <div class="ff"><label>VIP</label><select id="ed-vip">
            <option value="0" ${b.vip == 0 ? 'selected' : ''}>عام</option>
            <option value="1" ${b.vip == 1 ? 'selected' : ''}>VIP</option>
        </select></div>
        <div class="ff"><label>اللغة</label><select id="ed-lang">
            <option ${b.lang === 'روسية'     ? 'selected' : ''}>روسية</option>
            <option ${b.lang === 'اسبانية'   ? 'selected' : ''}>اسبانية</option>
            <option ${b.lang === 'انجليزية'  ? 'selected' : ''}>انجليزية</option>
            <option ${b.lang === 'فرنسية'    ? 'selected' : ''}>فرنسية</option>
            <option ${b.lang === 'عربية'     ? 'selected' : ''}>عربية</option>
        </select></div>
        <div class="ff full"><label>الوصف</label><textarea id="ed-desc" rows="3">${b.description}</textarea></div>
        <div class="ff full"><label>عن المؤلف</label><textarea id="ed-bio" rows="2">${b.bio}</textarea></div>
    </div>
    <button class="adm-submit" onclick="saveEdit(${id})">حفظ التعديلات</button>`;
    om('editModal');
}

async function saveEdit(id) {
    const data = {
        id,
        title:      document.getElementById('ed-title').value.trim(),
        author:     document.getElementById('ed-author').value.trim(),
        translator: document.getElementById('ed-translator').value.trim(),
        cat:        document.getElementById('ed-cat').value,
       price:      parseInt(document.getElementById('ed-price').value),
        year:       parseInt(document.getElementById('ed-year').value) || null,
        vip:        parseInt(document.getElementById('ed-vip').value),
        lang:       document.getElementById('ed-lang').value,
        description: document.getElementById('ed-desc').value.trim(),
        bio:        document.getElementById('ed-bio').value.trim(),
    };
    if (!data.title || !data.author||  !data.price) { ntf('يرجى تعبئة الحقول الاساسية'); return; }
    const res = await apiPut(API.books, 'update', data);
    if (res.error) { ntf(res.error); return; }
    cm('editModal');
    await loadBooks();
    renderBooksTable();
    ntf('تم حفظ التعديلات');
}

async function delBook(id) {
    if (!confirm('هل انت متاكد من حذف هذا الكتاب؟')) return;
    const res = await apiDelete(API.books, { action: 'delete', id });
    if (res.error) { ntf(res.error); return; }
    await loadBooks();
    renderBooksTable();
    renderActivity();
    ntf('تم حذف الكتاب');
}

async function toggleBan(userId, ban) {
    const res = await apiPut(API.users, 'ban', { user_id: userId, ban });
    if (res.error) { ntf(res.error); return; }
    renderAdminFull();
    ntf(ban ? 'تم حظر المستخدم' : 'تم رفع الحظر');
}

async function addBook() {
    const t  = document.getElementById('nb-title').value.trim();
    const a  = document.getElementById('nb-author').value.trim();
    const tr = document.getElementById('nb-translator').value.trim();
    const c  = document.getElementById('nb-cat').value;
    const p  = parseInt(document.getElementById('nb-price').value);
    const y  = parseInt(document.getElementById('nb-year').value) || null;
    const v  = document.getElementById('nb-vip').value;
    const la = document.getElementById('nb-lang').value;
    const d  = document.getElementById('nb-desc').value.trim();
    const bi = document.getElementById('nb-bio').value.trim();

    if (!t||  !a||  !p || !d) { ntf('يرجى تعبئة الحقول الاساسية (*)'); return; }

    const res = await apiPost(API.books, 'add', {
        title: t, author: a, translator: tr, cat: c,
        price: p, year: y, vip: v, lang: la,
        description: d, bio: bi || 'مؤلف معروف'
    });
    if (res.error) { ntf(res.error); return; }

    ['nb-title','nb-author','nb-translator','nb-price','nb-year','nb-desc','nb-bio']
        .forEach(id => document.getElementById(id).value = '');

    await loadBooks();
    renderAdminFull();
    ntf('تم اضافة الكتاب بنجاح');
    swAdmTab(document.querySelector('.adm-tab'), 'adm-recent');
}

/* ═══ HELPERS ═══ */
function ntf(msg) {
    const el = document.getElementById('notif');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(window._nt);
    window._nt = setTimeout(() => el.classList.remove('on'), 3200);
}
function gt(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
