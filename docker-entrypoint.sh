#!/bin/sh
set -e

echo "=== warranty-remember container started at $(date '+%Y-%m-%d %H:%M:%S %Z') ==="

# 起動時に DB マイグレーションを適用してからサーバーを起動する。
echo "マイグレーションを適用します (DATABASE_PATH=$DATABASE_PATH)"
node scripts/migrate.js

echo "サーバーを起動します (PORT=$PORT)"
exec node build
