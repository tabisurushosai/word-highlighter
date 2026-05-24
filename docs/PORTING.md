# 移植ガイド

word-highlighter は、Chrome 拡張の外側だけを iOS/Android アプリの外側に
差し替えられるよう、ロジック・保存・UI の境界を分けて扱う。

## core

- 語句マッチングと色割り当ての純粋ロジックは `src/core.ts` に置く。
- `src/core.ts` へ `chrome.*`、DOM、通信、プラットフォーム UI 依存を追加しない。
- `WordList` は読み取り専用の入力として扱い、core 内で保存・UI 状態を変更しない。
- 移植時も `WordItem`、`WordList`、`Match`、`getNextColor`、`findMatches` の
  契約を維持する。

## storage

- 永続化は `src/storage.ts` の `StoreAdapter`（互換名 `StorageAdapter`）越しに行う。
- `StoreAdapter` はアプリ側の境界で、保存キー1つに対する `get`、`set`、`remove`
  だけを公開する。iOS/Android ではこの IF を直接実装し、各プラットフォームの
  ローカル保存へ接続する。
- Chrome 拡張では `createChromeStorageAdapter(chrome.storage.local)` を使い、
  Chrome の map 形式 API を `StoreAdapter` に変換する。
- `src/storage.ts` の `storage` は既定では Chrome ストレージを遅延解決する。
  ネイティブ移植では起動時に `configureStorageAdapter(...)` で
  プラットフォーム実装を差し替えてから UI から利用する。
- `ChromeStorageArea`（互換名 `StorageAreaAdapter`）は Chrome の
  `{ [key]: value }` 形式だけを表す薄いブリッジ。ネイティブ保存側に
  Chrome 互換の map 形式を持ち込まない。
- 既存データ互換のため、`word_list` と `premium_status` を含む保存キーと
  値の形は変えない。

## UI

- プラットフォーム固有 API は薄い UI 層（`popup.ts`、`content.ts`、または
  ネイティブアプリの画面）に閉じ込める。
- UI から保存へアクセスするときは、プラットフォーム保存を直接呼ばず
  storage アダプタを使う。
- UI から `src/core.ts` を使うときは、テキスト・語句リスト・色だけを渡し、
  DOM、Chrome API、ネイティブビューの参照は core に渡さない。
- 完全オフラインを維持する。移植時も remote code、外部フォント、外部 CDN、
  追加 permissions は入れない。
