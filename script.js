'use strict';

const USER = "nonakagw";
const REPO = "text-share";
const FILE_PATH = "info.txt";

// =========================
// 管理ページ
// =========================
if (document.getElementById("saveBtn")) {
  const tokenInput = document.getElementById("token");
  const editor = document.getElementById("editor");
  const status = document.getElementById("status");

  // 既存内容を取得して表示
  fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}`)
    .then(res => res.json())
    .then(data => {
      if (data.content) {
        const content = atob(data.content);
        editor.value = content;
      } else {
        status.textContent = "ファイルが見つかりません。";
      }
    })
    .catch(err => {
      console.error("読み込み失敗:", err);
      status.textContent = "内容の読み込みに失敗しました。";
    });

  // 保存ボタン処理
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      status.textContent = "トークンを入力してください。";
      return;
    }

    // 現在のSHAを取得
    const getRes = await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}`);
    const fileData = await getRes.json();

    // 新しい内容をBase64にエンコード
    const updatedContent = editor.value;
    const encodedContent = btoa(unescape(encodeURIComponent(updatedContent)));

    // PUTで更新
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

    if (updateRes.ok) {
      status.textContent = "✅ GitHubに保存しました！";
    } else {
      const errText = await updateRes.text();
      console.error("更新失敗:", errText);
      status.textContent = "⚠️ エラーが発生しました。";
    }
  });
}

// =========================
// 閲覧ページ
// =========================
if (document.getElementById("display")) {
  const display = document.getElementById("display");
  const update = document.getElementById("update");

  // info.txtの内容を取得して表示
  fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}`)
    .then(res => res.json())
    .then(data => {
      if (!data.content) throw new Error("no content");
      const content = atob(data.content);
      display.textContent = content;

      // コミット履歴を別APIで取得
      return fetch(`https://api.github.com/repos/${USER}/${REPO}/commits?path=${FILE_PATH}`);
    })
    .then(res => res.json())
    .then(commits => {
      if (Array.isArray(commits) && commits.length > 0) {
        update.textContent = "最終更新：" + new Date(commits[0].commit.committer.date).toLocaleString();
      } else {
        update.textContent = "最終更新情報なし";
      }
    })
    .catch(err => {
      console.error("読み込みエラー:", err);
      display.textContent = "内容を取得できませんでした。";
    });
}
