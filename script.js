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

document.getElementById("saveBtn").addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  if (!token) {
    status.textContent = "トークンを入力してください。";
    return;
  }

  // 最新SHAを再取得（409対策）
  const getRes = await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}?timestamp=${Date.now()}`);
  const fileData = await getRes.json();

  const updatedContent = editor.value;
  const encodedContent = btoa(unescape(encodeURIComponent(updatedContent)));

  const updateRes = await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}`, {
    method: "PUT",
    headers: {
      "Authorization": `token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "update via web",
      content: encodedContent,
      sha: fileData.sha // ← 常に最新を使用！
    })
  });

  const result = await updateRes.json();

  if (updateRes.ok) {
    status.textContent = "✅ GitHubに保存しました！";
  } else {
    console.error(result);
    status.textContent = `❌ 更新失敗: ${result.message}`;
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

