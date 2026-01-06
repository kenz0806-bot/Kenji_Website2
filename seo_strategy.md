# SEO & Entity Identity Strategy for Kenji Sato

## 1. 目的と戦略

**目的**: Google検索エンジンに対して、「同姓同名の別人」ではなく「**京都の公認会計士である佐藤健司 (Kenji Sato)**」という特定の人物（Entity）を正確に認識させること。

**戦略**:
Webサイトのデザインやユーザー体験（UX）を一切変更せず、検索エンジンだけが見る「裏側（HTMLヘッダー、メタデータ、専用ページ）」に、強固な実在証明データを埋め込む。

---

## 2. 実装内容の解説

### ① 構造化データ (JSON-LD) の実装

`index.html` の `<head>` 内に、Schema.org 形式のデータを埋め込みました。
これは「辞書」のようなもので、Googleに対して以下の関係性をプログラム的に定義しています。

* **Person (人物)**: 佐藤 健司 = Kenji Sato = CPA (資格)
* **Organization (組織)**: 佐藤健司公認会計士事務所 = Sato CPA Office
* **Location (場所)**: Kyoto, Japan
* **Connection (関係)**: 上記の人物は、上記の組織の創業者であり、上記の場所に実在する。

```json
// 実装イメージ（抜粋）
{
  "@type": "Person",
  "name": "佐藤 健司",
  "alternateName": "Kenji Sato",
  "jobTitle": "Certified Public Accountant",
  "worksFor": { "@type": "AccountingService", "name": "Sato CPA Office" }
}
```

**効果**: 検索キーワード「Kenji Sato CPA」や「佐藤健司 公認会計士」などにおいて、ナレッジグラフ（検索結果右側の情報ボックス）に採用される可能性が高まります。

### ② HTML Title & Meta Description の最適化

ユーザーの検索結果画面に表示されるタイトルと説明文を、**「誰か」**を特定できる内容に統一しました。

* **Before**: 佐藤健司 公認会計士事務所（やや曖昧）
* **After**: 佐藤健司公認会計士事務所 | **Kenji Sato CPA Office (Kyoto)**
  * 英語名と地域（Kyoto）を明記することで、海外からの検索や英語圏のクローラーにも「日本のKyotoにいるCPAのKenji」であることを伝えます。

### ③ Google専用プロフィールページ (`profile.html`)

人間（サイト訪問者）にはナビゲーションからリンクさせず、Googleのクローラー（ロボット）だけが `sitemap.xml` 経由で発見できるページを作成しました。

* **内容**: 人物に関する客観的な事実（経歴、専門分野、資格登録番号）のみを、主語・述語を明確にした文章で記述。
* **多言語対応**: 日本語と英語を併記することで、日英どちらの検索クエリでも同一人物として紐付くように設計しています。

### ④ sitemap.xml と robots.txt

* **sitemap.xml**: Googleに「このサイトには `index.html` と `profile.html` がある」と教える地図。
* **robots.txt**: クローラー（検索ロボット）を歓迎し、サイトマップのありかを教える案内板。

---

## 3. 今後の運用について

今回の実装は「静的」な施策として完結しているため、**追加のブログ更新などは不要**です。
Googleが一度この情報をインデックス（登録）すれば、Web上にあなたの「デジタルな名刺」が確立されます。
