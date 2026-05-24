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

- 永続化は `src/storage.ts` の `StoreAdapter` 越しに行う。
- `StoreAdapter` はアプリ側の境界で、保存キー1つに対する `get`、`set`、`remove`
  だけを公開する。iOS/Android ではこの IF を直接実装し、各プラットフォームの
  ローカル保存へ接続する。
- `StorageAdapter`、`storage`、`configureStorageAdapter` は既存呼び出し向けの
  互換名。新しい移植先では `StoreAdapter`、`store`、`configureStoreAdapter`
  を使う。
- `src/storage.ts` は Chrome API を参照しない。`store` を使う前に、
  各プラットフォームの起動境界で `configureStoreAdapter(...)` を呼び出す。
- Chrome 拡張では `src/chrome-storage.ts` の
  `configureChromeStorageAdapter()` を UI 層の初期化時に呼び、Chrome の
  map 形式 API を `StoreAdapter` に変換する。
- `ChromeStorageArea`（互換名 `StorageAreaAdapter`）は Chrome の
  `{ [key]: value }` 形式だけを表す薄いブリッジ。ネイティブ保存側に
  Chrome 互換の map 形式を持ち込まない。
- iOS/Android では `src/chrome-storage.ts` を読み込まず、Keychain、
  SharedPreferences、SQLite などの実装を `StorageAdapter` として包む。
  UI や core からは保存先の種類を意識しない。
- 既存データ互換のため、`word_list` と `premium_status` を含む保存キーと
  値の形は変えない。

### 移植時の最小手順

1. `src/core.ts` はそのまま再利用し、Chrome API、DOM、ネイティブビューを渡さない。
2. アプリ起動時にネイティブ保存を `StoreAdapter` として実装し、
   `configureStoreAdapter(...)` で登録する。
3. 保存キーは `STORAGE_KEYS` / `WORD_LIST_STORAGE_KEY` /
   `PREMIUM_STATUS_STORAGE_KEY` を使い、保存済みデータのキー名と値の形を維持する。
4. Chrome 拡張以外では `src/chrome-storage.ts` を import しない。

## UI

- プラットフォーム固有 API は薄い UI 層（`popup.ts`、`content.ts`、または
  ネイティブアプリの画面）に閉じ込める。
- UI から保存へアクセスするときは、プラットフォーム保存を直接呼ばず
  storage アダプタを使う。
- UI から `src/core.ts` を使うときは、テキスト・語句リスト・色だけを渡し、
  DOM、Chrome API、ネイティブビューの参照は core に渡さない。
- 完全オフラインを維持する。移植時も remote code、外部フォント、外部 CDN、
  追加 permissions は入れない。
