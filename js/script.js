// ================================
// 初期化
// ================================

document.addEventListener('DOMContentLoaded', () => {
    setupCursorDot();
    setupScrollAnimations();
    setupRippleEffect();
    setupNavigation();
    setupContact();
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
    const targets = document.querySelectorAll('.section, .fade-up');
    if (!targets.length) return;

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const el = entry.target;
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

        const baseSize = 260; // 基本サイズ

        // クリック位置
        const x = event.clientX;
        const y = event.clientY + window.scrollY;

        // 内側の波紋 (第1波)
        const inner = document.createElement('span');
        inner.classList.add('ripple');
        inner.style.width = baseSize + 'px';
        inner.style.height = baseSize + 'px';
        inner.style.left = (x - baseSize / 2) + 'px';
        inner.style.top = (y - baseSize / 2) + 'px';

        // 外側の波紋 (第2波)
        const outer = document.createElement('span');
        outer.classList.add('ripple-outer');
        const outerSize = baseSize * 1.4;
        outer.style.width = outerSize + 'px';
        outer.style.height = outerSize + 'px';
        outer.style.left = (x - outerSize / 2) + 'px';
        outer.style.top = (y - outerSize / 2) + 'px';

        document.body.appendChild(inner);
        document.body.appendChild(outer);

        // アニメーション終了後に削除
        inner.addEventListener('animationend', () => inner.remove());
        outer.addEventListener('animationend', () => outer.remove());
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

function setupContact() {
    const copyBtn = document.getElementById('copy-email');
    const emailText = document.getElementById('email-text');
    const resultMsg = document.getElementById('copy-result');

    if (!copyBtn || !emailText) return;

    copyBtn.addEventListener('click', () => {
        const textToCopy = emailText.textContent;

        // mailtoリンクを開く
        window.location.href = `mailto:${textToCopy}`;

        // クリップボードにコピー
        navigator.clipboard.writeText(textToCopy).then(() => {
            if (resultMsg) {
                resultMsg.classList.add('show');
                setTimeout(() => {
                    resultMsg.classList.remove('show');
                }, 3000);
            }
        }).catch(err => {
            console.error('Copy failed', err);
        });
    });
}
