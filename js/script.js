// ================================
// 初期化
// ================================

document.addEventListener('DOMContentLoaded', () => {
    setupCursorDot();
    setupScrollAnimations();
    setupRippleEffect();
    setupNavigation();
    setupNavigation();
    setupContactCopy();
});

// ================================
// カーソル追従 Youth Dot
// ================================

function setupCursorDot() {
    const cursorDot = document.querySelector('.cursor-dot');
    if (!cursorDot) return;

    // スマホではCSSでdisplay:noneにしているため、JSはシンプルに
    document.addEventListener('mousemove', (e) => {
        // 遅延はCSSのtransition: transform 0.15s ease-out で実現
        cursorDot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });
}

// ================================
// スクロールアニメーション
// ================================

function setupScrollAnimations() {
    const targets = document.querySelectorAll('.section, .fade-up, .section-title, .section-content');
    if (!targets.length) return;

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const el = entry.target;

                // 要素自体に is-visible を付与
                el.classList.add('is-visible');

                // 親セクションにも section-visible を付与（セクション単位の制御用）
                if (el.classList.contains('section')) {
                    el.classList.add('section-visible');
                } else {
                    const section = el.closest('.section');
                    if (section) {
                        section.classList.add('section-visible');
                    }
                }
                obs.unobserve(el);
            });
        }, {
        threshold: 0.15,
    }
    );

    targets.forEach((el) => observer.observe(el));
}

// ================================
// 全画面 2段階波紋（青春ドット Ripple）
// ================================

function setupRippleEffect() {
    document.addEventListener('click', function (event) {
        // コピーボタンなどは除外
        if (event.target.closest('.copy-btn')) return;
        if (event.target.closest('a')) return; // リンククリック時は邪魔しない

        const isMobile = window.innerWidth <= 768;
        const baseSize = isMobile ? 160 : 260; // モバイルは小さめ

        // クリック位置
        const x = event.clientX;
        const y = event.clientY + window.scrollY;

        // 波紋要素の生成
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        if (isMobile) {
            ripple.classList.add('ripple--mobile');
        }

        ripple.style.width = baseSize + 'px';
        ripple.style.height = baseSize + 'px';
        ripple.style.left = (x - baseSize / 2) + 'px';
        ripple.style.top = (y - baseSize / 2) + 'px';

        document.body.appendChild(ripple);

        // アニメーション終了後に削除
        ripple.addEventListener('animationend', () => ripple.remove());
    });
}

// ================================
// ナビゲーション
// ================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.kg-nav-link');
    const header = document.querySelector('.kg-header');

    // 初期状態で1つ目をアクティブに
    if (navLinks.length > 0) {
        navLinks[0].classList.add('is-active');
    }

    navLinks.forEach(link => {
        if (!link.querySelector('.nav-dot')) {
            const dot = document.createElement('span');
            dot.classList.add('nav-dot');
            link.appendChild(dot);
        }

        link.addEventListener('click', function (e) {
            e.preventDefault();

            // 他のリンクのactiveを外す
            navLinks.forEach(l => l.classList.remove('is-active'));
            this.classList.add('is-active');

            // クリック演出（ポンと光る）
            this.classList.add('is-clicked');
            setTimeout(() => this.classList.remove('is-clicked'), 300);

            // ヘッダーフラッシュ (0.12s)
            if (header) {
                header.classList.add('is-flashing');
                setTimeout(() => header.classList.remove('is-flashing'), 120);
            }

            // スムーススクロール
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
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

// ================================
// Contact: メールコピー
// ================================

function setupContactCopy() {
    const copyBtn = document.getElementById("copy-email");
    const emailTextEl = document.getElementById("email-text");
    const copyResultEl = document.getElementById("copy-result");

    if (!copyBtn || !emailTextEl || !copyResultEl) return;

    copyBtn.addEventListener("click", () => {
        const email = emailTextEl.textContent.trim();
        if (!email) return;

        // Clipboard API でコピー
        navigator.clipboard.writeText(email).then(() => {
            copyResultEl.textContent = "メールアドレスをコピーしました。";
            copyResultEl.style.opacity = 1;

            setTimeout(() => {
                copyResultEl.style.opacity = 0;
            }, 1800);
        }).catch(() => {
            // Clipboard API が使えない環境向けフォールバック
            copyResultEl.textContent = "コピーできませんでした。お手数ですが手動でコピーしてください。";
            copyResultEl.style.opacity = 1;

            setTimeout(() => {
                copyResultEl.style.opacity = 0;
            }, 2500);
        });
    });
}
