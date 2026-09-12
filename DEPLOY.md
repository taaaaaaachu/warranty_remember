# Warranty Remember デプロイ手順書(Synology NAS・SSH不要)

stockify と同じ Synology NAS(Container Manager + 共用 cloudflared + 共用 Watchtower)に同居させる想定です。
GHCR の**ビルド済みイメージ**を参照するだけなので、NAS 側でのビルドやソースコードのアップロードは不要です。

---

## 1. 前提

- stockify と同じ NAS(Container Manager・共用 cloudflared・共用 Watchtower が既に動いている)。
- GitHub Actions が `ghcr.io/taaaaaaachu/warranty_remember:latest` を push 済み(`main` push で自動)。
- このリポジトリは **private** なので、GHCR のイメージも private。NAS からの `pull` には認証が要る。

---

## 2. GHCR 用アクセストークンを発行(ブラウザ)

1. GitHub → 右上アイコン → **Settings → Developer settings → Personal access tokens → Tokens (classic)**。
2. **Generate new token (classic)**。スコープは **`read:packages`** のみ。
3. 発行されたトークン(`ghp_...`)を控える。**この画面を閉じると二度と表示されません。**

---

## 3. Container Manager にレジストリを登録(NAS・GUI)

1. **Container Manager** → **レジストリ** → **設定** → **追加**。
2. URL: `https://ghcr.io`、ユーザー名: `taaaaaaachu`、パスワード: 手順2のトークン。
3. 追加後、この登録が private イメージの `pull` に使われます。

---

## 4. File Station で compose ファイルだけ配置(NAS)

ソース一式は不要です。**`docker-compose.yml` 1枚だけ**を置きます。

1. File Station で `/docker/warranty_remember` フォルダを作成。
2. Windows 側のプロジェクト直下にある `docker-compose.yml` をアップロード(`docker-compose.local.yml` はNAS側では不要)。
3. 同じ場所に `.env` を作成:
   ```dotenv
   ORIGIN=https://warranty.example.com
   ```
   (ドメインは cloudflared 側の設定に合わせる。第5章で決める。)

---

## 5. 共用 cloudflared に公開ホスト名を追加(ブラウザ)

Cloudflare Zero Trust ダッシュボード → **Networks → Tunnels** → 既存の共用トンネルを開く → **Public Hostname** を追加。

- Subdomain: `warranty`、Domain: `example.com`(例)
- Service: **HTTP** → `warranty_remember-app:3000`
  (Container Manager が付けるコンテナ名。実際の名前は起動後に Container Manager で確認・調整する)

---

## 6. Container Manager でプロジェクトを作成・起動(NAS)

1. **Container Manager** → **プロジェクト** → **作成**。
2. プロジェクト名: `warranty_remember`。
3. パス: `/docker/warranty_remember`。
4. ソース: 「既存の docker-compose.yml を使用」。
5. **起動**(ビルドではなく `pull` のみで数十秒程度)。
6. `app` コンテナが起動時に DB マイグレーションを自動適用します。

---

## 7. 初回セットアップ(ブラウザ)

1. `https://warranty.example.com/register` を開く。
2. 最初のユーザーは招待コード不要で登録でき、**インスタンス管理者(super_admin)**になり、入力した名前で最初の世帯が作られる。
3. ほかの人を招くには `/account` で招待コードを発行し、相手に `/register` で使ってもらう。

---

## 8. 自動更新(Watchtower)

`docker-compose.yml` の `app` サービスには `com.centurylinklabs.watchtower.enable=true` ラベルが付いています。
NAS 上の共用 Watchtower プロジェクトが `ghcr.io/taaaaaaachu/warranty_remember` の新しい `:latest` を検知すると、
**自動で pull → コンテナ再作成**します。手動更新は基本的に不要です。

今すぐ反映したい場合だけ、Container Manager → プロジェクト `warranty_remember` → コンテナを**再作成**(pull し直し)。

---

## 9. バックアップ / リストア

SQLite と添付画像はどちらも `/docker/warranty_remember/data/` 配下(`app.sqlite` と `uploads/`)にバインドマウントされます。

- **バックアップ**: File Station で `data/` フォルダごと別の場所へコピー(コピー前に `app` を一時停止すると確実)。
- **リストア**: `app` を停止 → `data/` をバックアップと差し替え → 起動。

---

## 10. トラブルシューティング

| 症状 | 原因 / 対処 |
|---|---|
| プロジェクト起動時に `pull` が失敗する | 手順2〜3のGHCR認証が未設定、またはトークンの `read:packages` スコース漏れ。 |
| ログイン/登録で 403 | `.env` の `ORIGIN` が公開URLと不一致。修正して `app` を再起動。 |
| 画像が表示されない | `data/uploads` の権限やボリュームマウントを確認。`UPLOAD_DIR=/data/uploads` はcompose側で固定済み。 |
| Watchtowerが更新してくれない | 共用Watchtowerが動いているか、ラベル `com.centurylinklabs.watchtower.enable=true` が付いているかを確認。 |
| 最初からやり直したい | プロジェクト停止 → File Station で `data/` を削除 → 起動(全データ消去)。 |

## 付録: ローカルでの動作確認(任意)

NASに上げる前に手元で確認したい場合、こちらはその場でビルドします。

```powershell
docker compose -f docker-compose.local.yml up --build
```

→ `http://localhost:3000`
