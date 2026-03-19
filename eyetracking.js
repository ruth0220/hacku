const gaze = document.getElementById("gaze");
const overlay = document.getElementById("calibration-overlay");
const points = document.querySelectorAll(".cal-point");

const overlay20 = document.getElementById("rule20-overlay");
const timerUI = document.getElementById("rule20-timer");
const warningUI = document.getElementById("rule20-warning");

const nextHint = document.getElementById("nextHint");
const prevHint = document.getElementById("prevHint");

// ==========================================
// AI解説用UIと変数
// ==========================================
const hintUI = document.getElementById("translation-hint");
const hintBar = hintUI.querySelector(".gaze-bar");
const aiModal = document.getElementById("translation-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const backBtn = document.getElementById("back-to-viewer-btn"); // 追加：戻るボタン

let isHintShowing = false;
let isModalOpen = false;

let hintTimeoutId = null;       // ポップアップが自然に消えるまでのタイマー用
let hintFocusStart = null;      // ポップアップを見つめ始めた時間を記録する用
const HINT_CONFIRM_TIME = 1500; // ポップアップを何秒見つめたら解説を開くか（例：1500 = 1.5秒）

// 1. ページ滞在（迷い）検知用の変数
let currentLookingPage = null; // "left" または "right"
let pageStayStartTime = null;
const PAGE_STAY_TIME_MS = 4000; // 同じページに何秒留まったらポップアップを出すか
let lastKnownX = window.innerWidth / 2; // AI解説用に最後に見ていたX座標を保持

// ==========================================
// ページ滞在（迷い）検知関数：同じページを長く見ていたら
// ==========================================
function detectPageFixation(x, y) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // 画面下部のページめくりエリアを見ている時は反応させず、タイマーもリセット
  if (y > h * 0.65 && (x < w * 0.35 || x > w * 0.65)) {
    resetPageFixation();
    return;
  }

  // 現在見ているのが「左ページ」か「右ページ」か判定
  const lookingPage = (x < w / 2) ? "left" : "right";

  // 見ているページが変わった、または計測開始前ならリセットして新しく計測開始
  if (currentLookingPage !== lookingPage) {
    currentLookingPage = lookingPage;
    pageStayStartTime = Date.now();
    return;
  }

  // 同じページを見続けている場合
  if (pageStayStartTime) {
    const elapsed = Date.now() - pageStayStartTime;
    lastKnownX = x; // 最後に見ていた場所を記憶（AIモーダルでの左右判定用）

    // 規定の時間同じページに留まったら
    if (elapsed >= PAGE_STAY_TIME_MS) {
      showTranslationHint(x, y); // 現在の視線の近くにポップアップを出す
      resetPageFixation();
    }
  }
}

function resetPageFixation() {
  currentLookingPage = null;
  pageStayStartTime = null;
}

// ==========================================
// ポップアップ表示と、ポップアップ注視の検知
// ==========================================
function showTranslationHint(x, y) {
  isHintShowing = true;
  hintUI.style.display = "block";
  if (hintBar) hintBar.style.width = "0%";
  
  // 視線の少し下にポップアップを出す
  const popX = Math.min(Math.max(x - 100, 20), window.innerWidth - 250);
  const popY = Math.min(y + 60, window.innerHeight - 100);
  
  hintUI.style.left = popX + "px";
  hintUI.style.top = popY + "px";
  
  // 5秒間見つめられなかったら自然に消える
  if (hintTimeoutId) clearTimeout(hintTimeoutId);
  hintTimeoutId = setTimeout(() => {
    // もし注視（ゲージが溜まり途中）でなければ消す
    if (!hintFocusStart) hideTranslationHint();
  }, 5000);
}

function hideTranslationHint() {
  isHintShowing = false;
  hintUI.style.display = "none";
  if (hintBar) hintBar.style.width = "0%";
  hintFocusStart = null;
}

// ポップアップを見つめているかチェックする関数
function checkHintFocus(x, y) {
  const rect = hintUI.getBoundingClientRect();
  const padding = 40; // 少し広めに判定をとる（見つめやすくするため）

  // 視線がポップアップの範囲内にあるか
  if (x >= rect.left - padding && x <= rect.right + padding &&
      y >= rect.top - padding && y <= rect.bottom + padding) {
    
    if (!hintFocusStart) hintFocusStart = Date.now();
    
    const elapsed = Date.now() - hintFocusStart;
    const percentage = Math.min(100, (elapsed / HINT_CONFIRM_TIME) * 100);
    
    if (hintBar) hintBar.style.width = percentage + "%";

    // 規定時間見つめきったら、解説モーダルを開く！
    if (elapsed >= HINT_CONFIRM_TIME) {
      hideTranslationHint();
      openTranslationModal();
    }
  } else {
    // 視線が外れたらゲージを戻す
    hintFocusStart = null;
    if (hintBar) hintBar.style.width = "0%";
  }
}

// ==========================================
// AI解説モーダルの制御
// ==========================================

async function openTranslationModal() {
  isModalOpen = true;
  aiModal.style.display = "flex";
  
  // ★背景のスクロールをロックする
  document.body.style.overflow = "hidden";
  
  const explanationText = document.getElementById("ai-explanation-text");

  explanationText.style.maxHeight = "60vh";    // 画面の高さの60%を上限にする（必要に応じて70vhなどに調整してください）
  explanationText.style.overflowY = "auto";    // 縦スクロールを有効にする
  explanationText.style.paddingRight = "10px"; // スクロールバーと文字が被らないように少し余白をあける
  // ローディング表示
  explanationText.innerHTML = "AIが文脈を読み取って解説を生成しています...<br>少しお待ちください。";

  // 1. 視線が左ページ(画面左半分)にあったか、右ページ(右半分)にあったかを判定
  const isLeftPage = lastKnownX < window.innerWidth / 2;
  
  // 2. script.js で定義している pages配列と currentPage変数 から、対象のテキストを取得
  let targetText = "";
  try {
    if (isLeftPage) {
      targetText = pages[currentPage]; // 左ページ
    } else {
      targetText = pages[currentPage + 1]; // 右ページ
    }
  } catch (e) {
    targetText = "テキストの取得に失敗しました。";
  }

  // 3. Geminiにお願いするプロンプト（指示書）を作成
  const prompt = `
以下の英文は、ユーザーが現在読んでいる小説（オズの魔法使い）の一部です。
ユーザーがこの部分で意味が分からず立ち止まりました。
この英文の「自然な日本語訳」と、「難しい単語や表現の解説」を分かりやすく簡潔に教えてください。
見やすいようにHTMLタグ（<h3>, <ul>, <li>, <strong>, <br>など）を使って装飾して出力してください。
html などのマークダウン記法は含めないでください。

【ユーザーが読んでいた英文】
"${targetText}"
  `;

  // 4. Gemini APIを呼び出す
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    // 5. 結果を画面に表示
    let htmlContent = data.candidates[0].content.parts[0].text;
    
    // もしGeminiが不要なマークダウン(```html)をつけてきたら削る
    htmlContent = htmlContent.replace(/```html/g, "").replace(/```/g, "");
    
    explanationText.innerHTML = htmlContent;

  } catch (error) {
    console.error("Gemini APIエラー:", error);
    explanationText.innerHTML = "<span style='color:red;'>ごめんなさい、解説の取得に失敗しました。APIキーやネットワークを確認してください。</span>";
  }
}

// モーダルを閉じて初期化する関数
function closeAiModal() {
  isModalOpen = false;
  aiModal.style.display = "none";
  
  // ★背景のスクロールロックを解除する
  document.body.style.overflow = "";
  
  resetPageFixation(); // 前回変更したページ滞在リセット関数
}

// ★視線判定を廃止し、手動クリックで閉じるように設定
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeAiModal);
}
if (backBtn) {
  backBtn.addEventListener("click", closeAiModal);
}


// ==========================================
// 睡眠検知用UIとロジック
// ==========================================
const sleepOverlay = document.createElement("div");
sleepOverlay.id = "sleep-overlay";
sleepOverlay.style.position = "fixed";
sleepOverlay.style.top = "0";
sleepOverlay.style.left = "0";
sleepOverlay.style.width = "100vw";
sleepOverlay.style.height = "100vh";
sleepOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.85)"; 
sleepOverlay.style.color = "#fff";
sleepOverlay.style.display = "none";
sleepOverlay.style.flexDirection = "column";
sleepOverlay.style.justifyContent = "center";
sleepOverlay.style.alignItems = "center";
sleepOverlay.style.zIndex = "10000";
sleepOverlay.style.transition = "opacity 1s ease-in-out";
sleepOverlay.style.opacity = "0";
sleepOverlay.innerHTML = `<h1 style="font-size: 3rem; margin-bottom: 20px;">そろそろ寝る時間です🌙</h1>`;
document.body.appendChild(sleepOverlay);

const sleepAudio = new Audio("piano26.mp3");
sleepAudio.volume = 0.5;
let isSleeping = false;
const SLEEP_LIMIT_MS = 5000; 

function triggerSleepMode() {
  isSleeping = true;
  sleepOverlay.style.display = "flex";
  sleepAudio.currentTime = 0; 
  sleepAudio.play().catch(e => console.log(e));
  setTimeout(() => sleepOverlay.style.opacity = "1", 50);
}

function wakeUp() {
  if (!isSleeping) return;
  isSleeping = false;
  sleepOverlay.style.opacity = "0";
  sleepAudio.pause();
  setTimeout(() => { if (!isSleeping) sleepOverlay.style.display = "none"; }, 1000);
}

// ==========================================
// 視線スムージングと各種タイマー用変数
// ==========================================
let smoothX = window.innerWidth / 2;
let smoothY = window.innerHeight / 2;
let gazeHistory = [];
const historyLength = 5;
const baseSmooth = 0.1;

let isCalibrated = false;
let isLookingAtScreen = false;
let totalViewingTimeMs = 0;

const WORK_LIMIT_MS = 60 * 1000;
const REST_LIMIT_MS = 20 * 1000;
let restTimeRemainingMs = REST_LIMIT_MS;
let isRestingPhase = false;
let lastTick = Date.now();

let eyeCloseStart = null;
let prevX = window.innerWidth / 2;
let prevY = window.innerHeight / 2;
const STILL_THRESHOLD = 4;
const EYE_CLOSE_LIMIT_MS = 5000;

let blinkStart = null;
let blinkCount = 0;
let lastBlinkTime = 0;
const BLINK_MIN = 50;
const BLINK_MAX = 400;

function detectBlink(faceDetected){
  const now = Date.now();
  if(!faceDetected){
    if(!blinkStart) blinkStart = now;
  } else {
    wakeUp();
    if(blinkStart){
      const duration = now - blinkStart;
      if(duration > BLINK_MIN && duration < BLINK_MAX){
        if(now - lastBlinkTime > 100){
          if (now - lastBlinkTime > 1000) blinkCount = 1;
          else blinkCount++;
          lastBlinkTime = now;
        }
      }
      blinkStart = null;
    }
  }
}

// ==========================================
// ページめくり判定
// ==========================================
let gazeStartLeftBottom = null;
let gazeStartRightBottom = null;
let leaveLeftBottomTime = null; 
let leaveRightBottomTime = null;

const holdTime = 2000; 
const LEAVE_TOLERANCE = 500; 

let isPageTurnCooldown = false;

function checkPageTurn(x, y) {
  if (!isCalibrated || isPageTurnCooldown) return; 

  const w = window.innerWidth;
  const h = window.innerHeight;
  const now = Date.now();

  const nextBar = nextHint.querySelector(".gaze-bar");
  const prevBar = prevHint.querySelector(".gaze-bar");

  // 左下（前へ）
  if (x < w * 0.35 && y > h * 0.65) {
    leaveLeftBottomTime = null;
    prevHint.classList.add("show");
    if (!gazeStartLeftBottom) gazeStartLeftBottom = now;
    const elapsed = now - gazeStartLeftBottom;
    if (prevBar) prevBar.style.width = Math.min(100, (elapsed / holdTime) * 100) + "%";
    
    if (elapsed > holdTime) { 
      executePageTurn(prevHint, prevBar, prevPage); 
    }
  } else {
    if (gazeStartLeftBottom) {
      if (!leaveLeftBottomTime) leaveLeftBottomTime = now;
      if (now - leaveLeftBottomTime > LEAVE_TOLERANCE) {
        prevHint.classList.remove("show");
        if (prevBar) prevBar.style.width = "0%";
        gazeStartLeftBottom = null; leaveLeftBottomTime = null;
      }
    }
  }

  // 右下（次へ）
  if (x > w * 0.65 && y > h * 0.65) {
    leaveRightBottomTime = null;
    nextHint.classList.add("show");
    if (!gazeStartRightBottom) gazeStartRightBottom = now;
    const elapsed = now - gazeStartRightBottom;
    if (nextBar) nextBar.style.width = Math.min(100, (elapsed / holdTime) * 100) + "%";
    
    if (elapsed > holdTime) { 
      executePageTurn(nextHint, nextBar, nextPage); 
    }
  } else {
    if (gazeStartRightBottom) {
      if (!leaveRightBottomTime) leaveRightBottomTime = now;
      if (now - leaveRightBottomTime > LEAVE_TOLERANCE) {
        nextHint.classList.remove("show");
        if (nextBar) nextBar.style.width = "0%";
        gazeStartRightBottom = null; leaveRightBottomTime = null;
      }
    }
  }
}

function executePageTurn(hintUI, barUI, pageAction) {
  isPageTurnCooldown = true;

  hintUI.style.backgroundColor = "rgba(255, 60, 60, 0.9)"; 
  if (barUI) barUI.style.backgroundColor = "red";          

  if (typeof pageAction === "function") pageAction();

  setTimeout(() => {
    resetControl(); 
    hintUI.style.backgroundColor = ""; 
    if (barUI) barUI.style.backgroundColor = ""; 
    
    setTimeout(() => {
      isPageTurnCooldown = false; 
    }, 3000);

  }, 300); 
}

function resetControl(){
  const nextBar = document.querySelector("#nextHint .gaze-bar");
  const prevBar = document.querySelector("#prevHint .gaze-bar");
  if (nextBar) nextBar.style.width = "0%";
  if (prevBar) prevBar.style.width = "0%";
  gazeStartLeftBottom = null; gazeStartRightBottom = null;
  leaveLeftBottomTime = null; leaveRightBottomTime = null; 
  nextHint.classList.remove("show"); prevHint.classList.remove("show");
}

// ==========================================
// 20-20-20 & 睡眠検知 メインループ
// ==========================================

setInterval(() => {
  if (!isCalibrated) { lastTick = Date.now(); return; }
  const now = Date.now();
  const delta = now - lastTick;
  lastTick = now;

  // 視線停止・目閉じ判定
  const dx = Math.abs(smoothX - prevX);
  const dy = Math.abs(smoothY - prevY);
  if ((!isLookingAtScreen || (dx < STILL_THRESHOLD && dy < STILL_THRESHOLD)) && !isRestingPhase && !isModalOpen) {
    if (!eyeCloseStart) eyeCloseStart = now;
    if (!isSleeping && (now - eyeCloseStart >= EYE_CLOSE_LIMIT_MS)) {
      triggerSleepMode();
    }
  } else {
    eyeCloseStart = null;
    wakeUp();
  }

  prevX = smoothX;
  prevY = smoothY;

  // 20-20-20ルール 
  if (!isRestingPhase) {
    if(isLookingAtScreen && !isModalOpen) {
      totalViewingTimeMs += delta;
      
      if(totalViewingTimeMs >= WORK_LIMIT_MS) {
        startRestPhase();
      }
    }
  } else {
    if(!isLookingAtScreen) {
      restTimeRemainingMs -= delta;
      warningUI.style.opacity = "0"; 
      timerUI.style.color = "#4CAF50"; 

      if(restTimeRemainingMs <= 0) {
        endRestPhase();
      }
    } else {
      warningUI.style.opacity = "1"; 
      timerUI.style.color = "#ff5252"; 
    }
    
    timerUI.innerText = Math.max(0, restTimeRemainingMs/1000).toFixed(1);
  }
}, 100);

function startRestPhase(){
  isRestingPhase = true; 
  restTimeRemainingMs = REST_LIMIT_MS;
  overlay20.style.display = "flex";
}

function endRestPhase(){
  isRestingPhase = false; 
  totalViewingTimeMs = 0;
  overlay20.style.display = "none"; 
  blinkStart = null;
}
// ==========================================
// WebGazer メイン処理
// ==========================================
window.onload = async function(){
  webgazer.clearData();
  webgazer.params.videoViewerWidth = 250;  
  webgazer.params.videoViewerHeight = 200;
  await webgazer.setRegression('ridge').setGazeListener(function(data){
    if(!data){
      isLookingAtScreen = false; detectBlink(false); return;
    }
    const x = data.x; const y = data.y;
    const w = window.innerWidth; const h = window.innerHeight;
    const isOutOfBounds = (x < -100 || x > w + 100 || y < -100 || y > h + 100);
    const dx_raw = x - smoothX; const dy_raw = y - smoothY;
    const dist_raw = Math.sqrt(dx_raw * dx_raw + dy_raw * dy_raw);

    if(isOutOfBounds || dist_raw > 400){
      isLookingAtScreen = false; detectBlink(false); return; 
    }

    detectBlink(true); isLookingAtScreen = true;

    // スムージング
    gazeHistory.push({x, y});
    if(gazeHistory.length > historyLength) gazeHistory.shift();
    let avgX = 0, avgY = 0;
    gazeHistory.forEach(p => { avgX += p.x; avgY += p.y; });
    avgX /= gazeHistory.length; avgY /= gazeHistory.length;
    const dx = avgX - smoothX; const dy = avgY - smoothY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let smooth = dist > 100 ? 0.4 : baseSmooth;
    if(dist > 100) gazeHistory = []; 

    smoothX += dx * smooth; smoothY += dy * smooth;
    gaze.style.left = smoothX + "px"; gaze.style.top = smoothY + "px";

    // モーダル（解説画面）や休憩中でなければ、各種検知を行う
    // ★ 変更：isModalOpen時の視線判定(checkModalCloseGaze)を削除しました
    if(!isRestingPhase && !isModalOpen){
      checkPageTurn(smoothX, smoothY);
      
      if (!isHintShowing) {
        detectPageFixation(smoothX, smoothY);
      } else {
        checkHintFocus(smoothX, smoothY);
      }
    }

  }).begin();

  webgazer.showPredictionPoints(false);
  webgazer.showVideo(true);
  webgazer.showFaceOverlay(true);
  webgazer.showFaceFeedbackBox(true);
};

// ==========================================
// キャリブレーション
// ==========================================
let completed=0;
points.forEach(point=>{
  let clickCount=0;
  point.addEventListener("click",function(e){
    clickCount++;
    webgazer.recordScreenPosition(e.clientX,e.clientY,'click');
    if(clickCount>=3){
      point.style.display="none"; completed++;
      if(completed===points.length) endCalibration();
    }else{
      point.style.opacity=1-(clickCount*0.3);
    }
  });
});

function endCalibration(){
  overlay.style.display="none"; gaze.style.display="block"; isCalibrated=true;
}
document.addEventListener("click",function(e){
  if(overlay.style.display==="none") webgazer.recordScreenPosition(e.clientX,e.clientY,'click');
});