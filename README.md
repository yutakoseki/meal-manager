# ミールマネージャー PoC モック

Next.js (App Router) + TypeScript で構築した「冷蔵庫在庫・特売情報・献立更新」体験のためのモックアプリです。DynamoDB をデータストアとし、Route Handlers を API として利用します。開発用にはインメモリ mock モードも備えています。

## 主な機能
- **冷蔵庫画面**: 食材 CRUD（カテゴリプルダウン、カード表示でスマホでも見やすい）。
- **特売情報画面**: 割引率入力で割引後価格を自動計算する特売 CRUD。
- **献立提案画面**: 家族プロフィールを一人ずつ登録、食べるメンバーを選択して AI 風献立提案→在庫更新。
- **API**: `/api/ingredients`, `/api/sales`, `/api/family`, `/api/menu/suggest` (+ 在庫一括更新)。

## 技術スタック
- Next.js 16 (App Router) / React 19 / TypeScript
- DynamoDB (AWS SDK v3) ※`MOCK_DYNAMO_DB=true` の場合はインメモリ実装
- Tailwind CSS 4 (Uno styling)
- Zod による API バリデーション

## ローカル開発
```bash
npm install
npm run dev
# http://localhost:3000 へアクセス
```

### 環境変数
| 変数名 | 説明 | デフォルト |
| --- | --- | --- |
| `AWS_REGION` | 本番時の DynamoDB リージョン | 未設定でも可（mock モードにフォールバック） |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS 認証情報 |  |
| `DYNAMODB_INGREDIENTS_TABLE` | 食材テーブル名 | `meal-manager-ingredients` |
| `DYNAMODB_SALES_TABLE` | 特売テーブル名 | `meal-manager-sales` |
| `DYNAMODB_FAMILY_PROFILES_TABLE` | 家族プロフィールテーブル名 | `meal-manager-family-profiles` |
| `MOCK_DYNAMO_DB` | `true` の場合は DynamoDB の代わりにインメモリ DB を使用。`false` で強制的に DynamoDB に接続。 | `true` (AWS_REGION 未設定時) |

本番相当環境では `MOCK_DYNAMO_DB=false` とし、AWS 側に 3 テーブルを用意してください。PoC 用のシンプルなスキーマのため、PK は `id` のみです。

## API 概要
| エンドポイント | メソッド | 説明 |
| --- | --- | --- |
| `/api/ingredients` | GET / POST | 食材一覧取得、追加 |
| `/api/ingredients/:id` | PUT / DELETE | 食材更新・削除 |
| `/api/ingredients/bulk-update` | PUT | 献立採用後の在庫一括更新 |
| `/api/sales` | GET / POST | 特売一覧取得、追加 |
| `/api/sales/:id` | PUT / DELETE | 特売更新・削除 |
| `/api/family` | GET / POST | 家族プロフィール一覧取得 / 追加 |
| `/api/family/:id` | PUT / DELETE | 家族プロフィール更新・削除 |
| `/api/menu/suggest` | POST | 食材・特売・子供情報を受け取り AI 風献立候補 (最大 3 件) を返す |

`/api/menu/suggest` は後から本物の AI API に差し替え可能なインターフェイスにしており、現在は単純なルールベースロジックでレスポンスを構成しています。

## DynamoDB スキーマ (例)
```text
ingredients:      { id (PK), name, quantity, unit, expiryDate, category, memo, createdAt, updatedAt }
sales:            { id (PK), name, price, discountRate, discountedPrice, startDate, endDate, category, memo, createdAt, updatedAt }
family_profiles:  { id (PK), name, lifeStage, appetite, notes, createdAt, updatedAt }
```

多テナント化を見据えて `userId` や `storeId` を追加できる想定です。献立提案 API ではライフステージ別の平均摂取量 + 食欲レベルから食べる量を計算し、使用量を自動スケーリングします。

## テスト / 品質チェック
```bash
npm run lint
```

UI から主要フロー (食材 CRUD・特売 CRUD・献立提案→在庫更新) を確認してください。mock モードではサンプルデータが自動投入されるためすぐに動作確認できます。
# meal-manager
