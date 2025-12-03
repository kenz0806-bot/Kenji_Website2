// ================================
// 初期化
// ================================

document.addEventListener('DOMContentLoaded', () => {
    setupCursorDot();
    setupScrollAnimations();
    setupRippleEffect();
    setupNavigation();
});

// ================================
// カーソル追従 Youth Dot
// ================================

function setupCursorDot() {
    const cursorDot = document.querySelector('.cursor-dot');
    if (!cursorDot) return;

    document.addEventListener('mousemove', (e) => {
        cursorDot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });
}

// ================================
// スクロールアニメーション
//  - Intersection Observer で .section-visible を付与
// ================================

function setupScrollAnimations() {
    const targets = document.querySelectorAll('.section');
    if (!targets.length) return;

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const el = entry.target;
                el.classList.add('section-visible');
                obs.unobserve(el);
            });
        },
        {
            threshold: 0.15, // 少し早めに発火
        }
    );

    targets.forEach((el) => observer.observe(el));
}

// ================================
// ボタン・リンクの Youth Ripple Effect
// ================================

function setupRippleEffect() {
    // ============================
    // 全画面 青春ドット（水の波紋）
    // ============================
    document.addEventListener('click', function (event) {
        // 必要であれば、波紋を出したくない要素があればここで除外できます
        // 例：コピー用ボタンなど
        // if (event.target.closest('#copy-email')) return;

        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        // 画面全体をベタ塗りにしないように、サイズは「ほどよい円」にとどめる
        const size = 260; // 必要に応じて 220〜320 程度で微調整可
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';

        // スクロール位置を考慮しつつ、クリック位置を中心に配置
        const x = event.clientX - size / 2;
        const y = event.clientY + window.scrollY - size / 2;
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        document.body.appendChild(ripple);

        // CSS のアニメーション終了後に削除
        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    });
}

// ================================
// ナビゲーションのインタラクション
// ================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.kg-nav-link');
    const header = document.querySelector('.kg-header');

    // ナビリンクにドット要素を追加
    navLinks.forEach(link => {
        const dot = document.createElement('span');
        dot.classList.add('nav-dot');
        link.appendChild(dot);

        link.addEventListener('click', function (e) {
            e.preventDefault(); // スムーススクロールを自前で制御するため

            // 1. ドットがポンッと光る (is-clicked クラス)
            this.classList.add('is-clicked');

            // 2. 下線が走る (is-active クラス)
            // 他のリンクのactiveを外す
            navLinks.forEach(l => l.classList.remove('is-active'));
            this.classList.add('is-active');

            // 3. 背景が一瞬淡いアクアに (header is-flashing)
            if (header) {
                header.classList.add('is-flashing');
                setTimeout(() => {
                    header.classList.remove('is-flashing');
                }, 100);
            }

            // ドットのアニメーションリセット
            setTimeout(() => {
                this.classList.remove('is-clicked');
            }, 300);

            // 4. スムーススクロール
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    // 少し遅延させてスクロール開始（演出を見せるため）
                    setTimeout(() => {
                        targetSection.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }, 200);
                }
            }
        });
    });
}

// ============================
// Contact: メールアドレスコピー
// ============================
document.addEventListener("DOMContentLoaded", () => {
    const copyBtn = document.getElementById("copy-email");
    const emailTextEl = document.getElementById("email-text");
    const copyResultEl = document.getElementById("copy-result");

    if (!copyBtn || !emailTextEl || !copyResultEl) return;

    copyBtn.addEventListener("click", () => {
        const email = emailTextEl.textContent.trim();
        if (!email) return;

        // Clipboard API を使ってコピー
        navigator.clipboard.writeText(email).then(() => {
            // メッセージを一時的に表示
            copyResultEl.style.opacity = 1;
            setTimeout(() => {
                copyResultEl.style.opacity = 0;
            }, 1800);
        }).catch(() => {
            // もし Clipboard API が使えない場合は、控えめなフォールバックだけ
            alert("メールアドレスをコピーできませんでした。お手数ですが手動でコピーしてください。");
        });
    });
});
