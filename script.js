'use strict';

// 管理ページ側の処理
if (document.getElementById('saveBtn')) {
  const editor = document.getElementById('editor');
  const password = document.getElementById('password');
  const status = document.getElementById('status');

  // 既存データを表示
  editor.value = localStorage.getItem('sharedText') || '';

  document.getElementById('saveBtn').addEventListener('click', () => {
    if (password.value !== 'adminpass') {
      status.textContent = 'パスワードが違います。';
      return;
    }
    localStorage.setItem('sharedText', editor.value);
    status.textContent = '保存しました！';
  });
}

// 閲覧ページ側の処理
if (document.getElementById('display')) {
  const display = document.getElementById('display');
  const text = localStorage.getItem('sharedText') || 'まだ内容がありません。';
  display.textContent = text;
}
