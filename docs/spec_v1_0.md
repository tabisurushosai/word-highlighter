# word-highlighter (みつけるマーカー) v1_0
ページ内の登録語を自動ハイライト。API/通信なし・完全オフライン・権限activeTab/scripting/storage。MV3/TS/Vite。
## 移植可能構造(必須/アプリ化前提)
- ロジックは src/core.ts に純粋TS(chrome.*/DOM非依存): 語リスト管理・マッチ判定・色割当。
- 保存は src/storage.ts の store アダプタ経由(get/set/remove)。拡張=chrome.storage.local。アプリ差替前提。
- UI(popup.ts/content.ts)は薄い層。core を呼ぶだけ。タッチ前提の大きなボタン。
- 文言 ja/en 再利用可。docs/store_listing.md(ja/en)を用意。決済呼び出しは1箇所に隔離・購入状態はstorage経由。
完了条件: build成功/dist、登録語の追加/削除、ページ自動ハイライト、release/word-highlighter.zip。
