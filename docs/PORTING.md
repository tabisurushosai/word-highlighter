# 移植ガイド

word-highlighter は、Chrome 拡張の外側だけを iOS/Android アプリの外側に
差し替えられるよう、ロジック・保存・UI の境界を分けて扱う。

## core

- 語句マッチングと色割り当ての純粋ロジックは `src/core.ts` に置く。
- `src/core.ts` へ `chrome.*`、DOM、通信、プラットフォーム UI 依存を追加しない。
- 移植時も `WordItem`、`WordList`、`Match`、`getNextColor`、`findMatches` の
  契約を維持する。

## storage

- 永続化は `src/storage.ts` の `StorageAdapter` 越しに行う。
- Chrome 拡張では `createChromeStorageAdapter(chrome.storage.local)` を使う。
- iOS/Android では同じ `get`、`set`、`remove` を持つアダプタを用意し、
  各プラットフォームのローカル保存へ接続する。
- 既存データ互換のため、`word_list` と `premium_status` を含む保存キーと
  値の形は変えない。

## UI

- プラットフォーム固有 API は薄い UI 層（`popup.ts`、`content.ts`、または
  ネイティブアプリの画面）に閉じ込める。
- UI から保存へアクセスするときは、プラットフォーム保存を直接呼ばず
  storage アダプタを使う。
- 完全オフラインを維持する。移植時も remote code、外部フォント、外部 CDN、
  追加 permissions は入れない。
