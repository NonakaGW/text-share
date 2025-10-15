'use strict';

/*
  script.js
  - ENC_DATA: put the JSON produced by encrypt_token.js here
  - Admin page MUST be opened with ?key=<passphrase>
*/

const USER = "nonakagw";
const REPO = "text-share";
const FILE_PATH = "info.txt";

// ==== ここに encrypt_token.js の出力をコピペ ====
const ENC_DATA = {
  "ciphertext": "v6qtw4jz3wnulyKH7KLGWyordVsFyTxPIgc1VIoV6oVHrFk7lgHz1DNcu90y3QqLxe2oH4WuP8s=",
  "iv": "hYWVOgWQUiNcXNpZ",
  "salt": "B8HY4clmJaMn3Rv0jXiGbg==",
  "kdfIterations": 120000
};
// ===============================================

// UTF-8 Base64 helpers for content (same as before)
function encodeBase64Unicode(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}
function decodeBase64Unicode(str) {
  const binary = atob(str);
  const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

// --- webcrypto: derive key from passphrase (PBKDF2) ---
async function deriveKeyFromPassphrase(passphrase, saltB64, iterations) {
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), {name:'PBKDF2'}, false, ['deriveKey']
  );
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const derived = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    passKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
  return derived;
}

// --- decrypt ciphertextWithTag (base64) with AES-GCM ---
async function decryptToken(passphrase) {
  try {
    const {ciphertext, iv, salt, kdfIterations} = ENC_DATA;
    const key = await deriveKeyFromPassphrase(passphrase, salt, kdfIterations || 120000);

    const ctWithTag = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      ctWithTag
    );
    const dec = new TextDecoder().decode(new Uint8Array(plainBuffer));
    return dec; // this is the original token string
  } catch (e) {
    console.error('decryptToken error', e);
    throw new Error('復号失敗');
  }
}

// --- GitHub API helpers ---
async function fetchFileJson(headers = {}) {
  const res = await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}?t=${Date.now()}`, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GET failed: ${res.status} ${txt}`);
  }
  return res.json();
}

async function putFileJson(bodyObj, headers = {}) {
  const res = await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
    body: JSON.stringify(bodyObj)
  });
  const json = await res.json();
  if (!res.ok) throw json;
  return json;
}

// ===== 管理ページ: 復号→保存処理 =====
if (document.getElementById('saveBtn')) {
  const editor = document.getElementById('editor');
  const status = document.getElementById('status');

  // ページは ?key=passphrase で開く想定
  const passphrase = new URL(location.href).searchParams.get('key');
  if (!passphrase) {
    document.body.innerHTML = "<h2 style='color:red;margin:60px auto;text-align:center;'>アクセス拒否：?key が必要です。</h2>";
    throw new Error('no key');
  }

  // 初期ロード：復号してトークン取得し、ファイル読み込み
  (async () => {
    try {
      const token = await decryptToken(passphrase);
      const headers = { Authorization: `token ${token}` };
      const data = await fetchFileJson(headers);
      editor.value = decodeBase64Unicode(data.content);
      editor.dataset.sha = data.sha;
    } catch (err) {
      console.error(err);
      status.textContent = '読み込みか復号に失敗しました。keyを確認してください。';
    }
  })();

  // 保存ボタン
  document.getElementById('saveBtn').addEventListener('click', async () => {
    status.textContent = '保存中…';
    try {
      const token = await decryptToken(new URL(location.href).searchParams.get('key'));
      const headers = { Authorization: `token ${token}` };

      // 最新SHA取得（競合対策）
      const fileData = await fetchFileJson(headers);
      const updatedContent = editor.value;
      const encodedContent = encodeBase64Unicode(updatedContent);

      const body = {
        message: 'update via web',
        content: encodedContent,
        sha: fileData.sha
      };
      const res = await putFileJson(body, headers);
      editor.dataset.sha = res.content.sha;
      status.textContent = '✅ 保存しました！';
    } catch (e) {
      console.error(e);
      status.textContent = '❌ 保存失敗: ' + (e.message || JSON.stringify(e));
    }
  });
}

// ===== 閲覧ページ: 普通にGETで表示（非認証 or raw版へ切替可）=====
if (document.getElementById('display')) {
  const display = document.getElementById('display');
  const update = document.getElementById('update');

  // Option A: 速く簡単 → raw.githubusercontent.com を使って直接 text を取得（no API rate limit）
  (async () => {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${USER}/${REPO}/main/${FILE_PATH}?t=${Date.now()}`;
      const r = await fetch(rawUrl);
      if (!r.ok) throw new Error('raw fetch failed ' + r.status);
      const txt = await r.text();
      display.textContent = txt;
      update.textContent = '';
    } catch (err) {
      console.error(err);
      display.textContent = '内容を取得できませんでした。';
    }
  })();
}
