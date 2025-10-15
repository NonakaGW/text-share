'use strict';

const USER = "nonakagw";
const REPO = "text-share";
const FILE_PATH = "info.txt";

// 管理ページ
if (document.getElementById("saveBtn")) {
  const tokenInput = document.getElementById("token");
  const editor = document.getElementById("editor");
  const status = document.getElementById("status");

  // 既存内容を取得して表示
  fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}`)
    .then(res => res.json())
    .then(data => {
      const content = atob(data.content);
      editor.value = content;
    });

  // 保存ボタン処理
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    if (!token) {
      status.textContent = "トークンを入力してください。";
      return;
    }

    const getRes = await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}`);
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
        sha: fileData.sha
      })
    });

    if (updateRes.ok) {
      status.textContent = "GitHubに保存しました！";
    } else {
      status.textContent = "エラーが発生しました。";
    }
  });
}

// 閲覧ページ
if (document.getElementById("display")) {
  const display = document.getElementById("display");
  const update = document.getElementById("update");

  fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}`)
    .then(res => res.json())
    .then(data => {
      const content = atob(data.content);
      display.textContent = content;
      update.textContent = "最終更新：" + new Date(data.commit.committer.date).toLocaleString();
    })
    .catch(err => {
      display.textContent = "内容を取得できませんでした。";
    });
}


