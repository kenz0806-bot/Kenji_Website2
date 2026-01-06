// ================================
// 初期化
// ================================

// ================================
// News Data
// ================================

const NEWS_ITEMS = [
    {
        date: '2026.01.04',
        title: 'ウェブサイトを公開しました。',
        summary: '「佐藤健司 公認会計士事務所」の公式サイトを公開しました。'
    }
];

// ================================
// 初期化
// ================================

document.addEventListener('DOMContentLoaded', () => {
    setupCursorDot();
    setupScrollAnimations();
    setupRippleEffect();
    setupNavigation();
    setupContactCopy();
    renderTopNews();
    renderNewsArchive();
    setupFloatingBackButton();
    setupSpotlightEffect();
    setupMagneticButtons();
    setupParallaxEffect();
    setup3DTiltEffect();
    setupScrollReveal();
});

// ================================
// 3D Tilt Effect (Apple TV Style)
// ================================
function setup3DTiltEffect() {
    const cards = document.querySelectorAll('.service-card, .consultation-card, .glass-panel');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // 中心を0とする
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // -1 ~ 1 の範囲に正規化
            const percentX = (x - centerX) / centerX;
            const percentY = (y - centerY) / centerY;

            // 回転角度（最大 10deg）
            // Y軸回転はX成分、X軸回転は-Y成分に依存
            const rotateX = -percentY * 8;
            const rotateY = percentX * 8;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            // リセット
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        });
    });
}

// ================================
// Scroll Reveal (Staggered Text)
// ================================
function setupScrollReveal() {
    // 対象: Messageセクションのpタグなど
    const targets = document.querySelectorAll('.message .section-content p, .intro-text-block');

    targets.forEach(p => {
        p.classList.add('stagger-text');
        // テキストを行ごと、あるいは文字ごとに分割するロジックは
        // 簡易的に span で囲う形で実装
        const text = p.innerHTML;
        // <br> で分割して、それぞれを span で囲む (簡易実装)
        // 注: 既にタグが含まれている場合は要注意だが、今回はシンプルテキストと仮定
        if (!text.includes('<span')) { // 既に処理済みでなければ
            const lines = text.split('<br>');
            const wrappedText = lines.map((line, index) => {
                // 遅延時間をindexでずらす
                const delay = index * 0.2;
                return `<span style="transition-delay: ${delay}s">${line}</span>`;
            }).join('<br>');
            p.innerHTML = wrappedText;
        }
    });

    // IntersectionObserverは既存の setupScrollAnimations で処理されるが
    // .stagger-text span へのスタイル適用は CSS の .section-visible .stagger-text span で行われる
}

// ================================
// News Rendering
// ================================

function createNewsItemHTML(item) {
    return `
        <article class="news-item">
            <div class="news-date">${item.date}</div>
            <div class="news-content">
                <p class="news-title">${item.title}</p>
                <p class="news-summary">${item.summary}</p>
            </div>
        </article>
    `;
}

function renderTopNews() {
    const container = document.getElementById('top-news-list');
    if (!container || NEWS_ITEMS.length === 0) return;

    // トップページは最新1件のみ
    const latestItem = NEWS_ITEMS[0];
    container.innerHTML = createNewsItemHTML(latestItem);
}

function renderNewsArchive() {
    const container = document.getElementById('news-archive-list');
    if (!container) return;

    // 全件表示
    let html = '';
    NEWS_ITEMS.forEach(item => {
        html += createNewsItemHTML(item);
    });
    container.innerHTML = html;
}

// ================================
// カーソル追従 Youth Dot
// ================================

function setupCursorDot() {
    const cursorDot = document.querySelector('.cursor-dot');
    if (!cursorDot) return;

    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let targetX = cursorX;
    let targetY = cursorY;

    // マウス位置の追跡
    document.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
    });

    // 線形補間関数
    const lerp = (start, end, factor) => {
        return start + (end - start) * factor;
    };

    // アニメーションループ
    function animate() {
        // 0.08の係数でゆっくり追従（波のような上品な遅れ）
        cursorX = lerp(cursorX, targetX, 0.08);
        cursorY = lerp(cursorY, targetY, 0.08);

        cursorDot.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        requestAnimationFrame(animate);
    }

    animate();
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
        // モバイル時は現状の80% (160px * 0.8 = 128px)
        const baseSize = isMobile ? 128 : 260;

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
        // Spotlight/Magnetic 用のクラス付与
        link.classList.add('is-magnetic');

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
            setTimeout(() => this.classList.remove('is-clicked'), 500);

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
// Contact: メールコピー & ドラフト機能
// ================================

function setupContactCopy() {
    const copyBtn = document.getElementById("copy-email");
    const emailTextEl = document.getElementById("email-text");
    const copyResultEl = document.getElementById("copy-result");

    if (!copyBtn || !emailTextEl || !copyResultEl) return;

    // コピーボタンもMagneticにする
    copyBtn.classList.add('is-magnetic');

    copyBtn.addEventListener("click", () => {
        const email = emailTextEl.textContent.trim();
        if (!email) return;

        // Clipboard API でコピー
        navigator.clipboard.writeText(email).then(() => {
            copyResultEl.textContent = "メールアドレスをコピーしました。";
            copyResultEl.style.opacity = 1;

            setTimeout(() => {
                copyResultEl.style.opacity = 0;
            }, 1500); // 1.5秒
        }).catch(() => {
            // Clipboard API が使えない環境向けフォールバック
            copyResultEl.textContent = "コピーできませんでした。お手数ですが手動でコピーしてください。";
            copyResultEl.style.opacity = 1;

            setTimeout(() => {
                copyResultEl.style.opacity = 0;
            }, 2500);
        });
    });

    // ドラフト機能の初期化もここから呼び出し
    setupContactDrafts();
}

function setupContactDrafts() {
    const buttons = document.querySelectorAll('.draft-btn');
    const subjectEl = document.getElementById('draft-subject');
    const bodyEl = document.getElementById('draft-body');
    const copyDraftBtn = document.getElementById('copy-draft-btn');
    const displayBox = document.querySelector('.draft-display-box');
    const msgEl = document.getElementById('draft-copy-msg');

    if (!buttons.length || !subjectEl || !bodyEl || !copyDraftBtn) return;

    // テンプレート定義
    const templates = {
        audit: {
            subject: "監査法人への対応サポートのご相談",
            body: "はじめまして。【会社名】の【氏名】と申します。\n\n現在、弊社では監査法人からの資料要求や指摘対応への工数負荷が高く、経理現場が疲弊している状況です。\nつきましては、貴事務所に専門家の視点から論点の整理や、監査法人との協議・合意形成のサポートをお願いできないでしょうか。\n\nまずは現状の課題感について、Web面談等でお話しさせていただければ幸いです。"
        },
        ipo: {
            subject: "J-SOX（内部統制）構築のご相談",
            body: "はじめまして。【会社名】の【氏名】と申します。\n\n現在、IPOによる上場を目指して準備を進めておりますが、J-SOX対応の文書化やフロー整備が遅れており、監査法人からも指摘を受けている状況です。\n専門的な知見を持つリソースが不足しているため、最短距離でクリアするためのロードマップ策定と実務支援をお願いできないでしょうか。\n\n一度、詳細をご相談させていただきたく存じます。"
        },
        migration: {
            subject: "会計システム移行（freee/マネーフォワード）のご相談",
            body: "はじめまして。【会社名】の【氏名】と申します。\n\n現在使用している会計ソフトから、クラウド会計（freee/マネーフォワード等）への移行を検討しております。\n単なるデータの移行だけでなく、移行後を見据えた経理フローの再構築や初期設定の最適化も含めて、専門家のサポートをお願いしたいと考えております。\n\nまずは移行の可否や進め方についてご相談できないでしょうか。"
        },
        cfo: {
            subject: "社外CFO・経営相談のご依頼",
            body: "はじめまして。【会社名】の【氏名】と申します。\n\n事業拡大に伴い、数字に基づいた経営判断や財務戦略について継続的に相談できるパートナーを探しております。\n現在の顧問税理士とは別に、より経営・財務の視点からのアドバイスを求めており、貴事務所の社外CFOサービスに関心を持ちました。\n\n一度、Web面談等で貴事務所のサービス詳細についてお伺いできれば幸いです。"
        },
        ai: {
            subject: "AI活用および業務効率化のご相談",
            body: "はじめまして。【会社名】の【氏名】と申します。\n\n貴事務所のWebサイトを拝見し、AIを活用した経理業務の効率化に興味を持ちご連絡いたしました。\n現在、経理・バックオフィス業務が属人化しており、非効率なフローが課題となっております。\n具体的なツール導入等は未定ですが、現状の業務フローを診断いただき、改善の余地やAI活用の可能性についてご提案いただけないでしょうか。"
        }
    };

    // 【追加】初期表示のレイアウトズレ防止：auditで初期化
    if (templates.audit) {
        subjectEl.textContent = templates.audit.subject;
        bodyEl.innerHTML = templates.audit.body.replace(/\n/g, '<br>');
    }

    // ボタン切り替えロジック
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Active切り替え
            buttons.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');

            const type = btn.getAttribute('data-type');
            const data = templates[type];

            if (data) {
                // フェードアウト演出
                displayBox.style.opacity = 0.5;
                setTimeout(() => {
                    subjectEl.textContent = data.subject;
                    bodyEl.innerHTML = data.body.replace(/\n/g, '<br>');
                    displayBox.style.opacity = 1;
                }, 150);
            }
        });
    });

    // コピーロジック
    copyDraftBtn.addEventListener('click', () => {
        const subject = subjectEl.textContent;
        // HTMLタグ除去して純粋なテキストを取得（innerText推奨）
        const body = bodyEl.innerText;

        const textToCopy = `件名：${subject}\n\n${body}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            msgEl.style.opacity = 1;
            setTimeout(() => {
                msgEl.style.opacity = 0;
            }, 2000);
        });
    });
}


// ================================
// Spotlight Effect (Glass Reflection)
// ================================
function setupSpotlightEffect() {
    // Spotlightを適用したい要素
    const targets = document.querySelectorAll('.glass-panel, .service-card, .consultation-card');

    targets.forEach(card => {
        card.classList.add('has-spotlight');

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
            card.style.setProperty('--spotlight-opacity', '1');
        });

        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--spotlight-opacity', '0');
        });
    });
}

// ================================
// Magnetic Buttons (Apple-style)
// ================================
function setupMagneticButtons() {
    const magnets = document.querySelectorAll('.is-magnetic');

    magnets.forEach(magnet => {
        magnet.addEventListener('mousemove', (e) => {
            const rect = magnet.getBoundingClientRect();
            // 中心からの距離
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = e.clientX - centerX;
            const deltaY = e.clientY - centerY;

            // 動きの「重さ」 (0.2くらいが上品)
            const strength = 0.25;

            magnet.style.transform = `translate(${deltaX * strength}px, ${deltaY * strength}px)`;
        });

        magnet.addEventListener('mouseleave', () => {
            // 元の位置に戻る (CSS transitionでバネのように戻る)
            magnet.style.transform = 'translate(0, 0)';
        });
    });
}

// ================================
// Scroll Parallax (Depth)
// ================================
function setupParallaxEffect() {
    const waveBg = document.querySelector('.global-wave-bg');
    if (!waveBg) return;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        // 背景をスクロール量の半分だけで動かす → 奥行きが出る
        // translate3d でGPU加速
        waveBg.style.transform = `translate3d(0, ${scrollY * 0.15}px, 0)`;
    });
}
