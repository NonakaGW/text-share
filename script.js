'use strict';

// ======== GitHub設定 ========
const USER = "nonakagw";  // 例: "nonakagw"
const REPO = "text-share";                 // リポジトリ名
const FILE_PATH = "info.txt";              // ファイル名（ルート直下）

// ======== UTF-8対応のBase64関数 ========

// 文字列 → Base64（UTF-8対応）
function encodeBase64Unicode(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

// Base64 → 文字列（UTF-8対応）
function decodeBase64Unicode(str) {
  const binary = atob(str);
  const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

// ======== 管理ページ側の処理 ========
if (document.getElementById("saveBtn")) {
  const tokenInput = document.getElementById("token");
  const editor = document.getElementById("editor");
  const status = document.getElementById("status");

  // 現在の内容をGitHubから読み込む
  fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}?t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
      const content = decodeBase64Unicode(data.content);
      editor.value = content;
    })
    .catch(err => {
      console.error(err);
      status.textContent = "内容を読み込めませんでした。";
    });

  // 保存ボタン押下時
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      status.textContent = "トークンを入力してください。";
      return;
    }

    try {
      // 最新SHAを取得（409対策）
      const getRes = await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}?t=${Date.now()}`);
      const fileData = await getRes.json();

      const updatedContent = editor.value;
      const encodedContent = encodeBase64Unicode(updatedContent);

      // PUTでファイル更新
      const updateRes = await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}`, {
        method: "PUT",
        headers: {
          "Authorization": `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "update via web",
          content: encodedContent,
          sha: fileData.sha
        })
      });

      const result = await updateRes.json();

      if (updateRes.ok) {
        status.textContent = "✅ GitHubに保存しました！";
      } else {
        console.error(result);
        status.textContent = `❌ 更新失敗: ${result.message}`;
      }
    } catch (e) {
      console.error(e);
      status.textContent = "❌ 通信エラーが発生しました。";
    }
  });
}

// ======== 閲覧ページ側の処理 ========
if (document.getElementById("display")) {
  const display = document.getElementById("display");
  const update = document.getElementById("update");

  fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}?t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
      const content = decodeBase64Unicode(data.content);
      display.textContent = content;
      if (data.commit && data.commit.committer) {
        update.textContent = "最終更新: " + new Date(data.commit.committer.date).toLocaleString();
      }
    })
    .catch(err => {
      console.error(err);
      display.textContent = "内容を取得できませんでした。";
    });
}

