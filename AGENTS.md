# Codex operating rules

## 実行環境

このリポジトリでは、Codexは次の条件で起動される。

* Sandbox: `workspace-write`または`read-only`
* Approval policy: `never`
* Network access: disabled
* Writable root: このリポジトリ内のみ

権限不足、ネットワーク不足、またはサンドボックス境界外の操作が必要になった場合は、回避や権限昇格を試みず停止し、必要な操作を報告すること。

## Codexが担当する作業

Codexが実行してよい作業は、依頼範囲内の次の操作に限定する。

* プロジェクト内ファイルの読み取り
* 明示された範囲のファイル編集
* `npm run build`
* プロジェクト既存のテスト
* lintおよびtype check
* `git status`
* `git diff`
* `git diff --check`

## Codexが担当しない作業

次の操作はCodexでは行わない。

* `git add`
* `git commit`
* `git push`
* `git pull`
* `git fetch`
* `git merge`
* `git rebase`
* `git cherry-pick`
* `git stash`
* branchやtagの作成・削除
* remoteの変更
* `.git`内部への直接書き込み
* 外部ネットワーク通信
* パッケージの追加または更新
* プロジェクト外への書き込み

これらはユーザーが通常のターミナルから実行する。

## 絶対禁止

以下を実行しない。

* `codex --dangerously-bypass-approvals-and-sandbox`
* `sudo`
* `git reset --hard`
* `git clean`
* force push
* 既存の未コミット変更の削除
* ユーザー変更の上書き
* サンドボックス制限の回避
* ネットワーク制限の回避
* シェル、OS、Xcodeその他のグローバル設定変更
* 認証情報や秘密鍵の読み取り
* 無関係なリファクタリング
* 依頼されていない機能追加

## 作業開始時

最初に次を実行し、現在地を確認する。

```bash
pwd
git status --short
git status --branch --short
git diff --stat
