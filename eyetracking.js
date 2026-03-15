const gaze = document.getElementById("gaze");
const overlay = document.getElementById("calibration-overlay");
const points = document.querySelectorAll(".cal-point");

const overlay20 = document.getElementById("rule20-overlay");
const timerUI = document.getElementById("rule20-timer");
const warningUI = document.getElementById("rule20-warning");

const nextHint = document.getElementById("nextHint");
const prevHint = document.getElementById("prevHint");

// 視線スムージング
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

// ===== 瞬き検知 =====

let blinkStart = null;
let blinkCount = 0;
let lastBlinkTime = 0;

const BLINK_MIN = 50;
const BLINK_MAX = 400;

function detectBlink(faceDetected){
  const now = Date.now();

  if(!faceDetected){
    if(!blinkStart){
      blinkStart = now;
    }
  } else {
    if(blinkStart){
      const duration = now - blinkStart;

      // 瞬きの長さが正常な範囲かチェック (80ms 〜 400ms)
      if(duration > BLINK_MIN && duration < BLINK_MAX){

        // ★修正1: クールダウンを 500ms → 100ms に短縮
        // これで「パチパチッ」という素早いダブルブリンクを認識できるようになります
        if(now - lastBlinkTime > 100){

          // ★修正2: 前回の瞬きから1秒(1000ms)以上空いたら、新しいカウントの1回目とする
          // （間延びした瞬きが合算されて誤作動するのを防ぐため）
          if (now - lastBlinkTime > 1000) {
            blinkCount = 1;
          } else {
            blinkCount++;
          }

          lastBlinkTime = now;
          
          // ★デバッグ用: 画面の開発者ツール(F12)のコンソールで認識状況を確認できます
          console.log("瞬き検知！ 継続時間:", duration, "ms / 現在のカウント:", blinkCount);
        }
      }

      blinkStart = null;
    }
  }
}

// ===== ページめくり判定 =====

let gazeStartLeftBottom = null;
let gazeStartRightBottom = null;

// 追加: エリアから外れた時間を記録する変数
let leaveLeftBottomTime = null; 
let leaveRightBottomTime = null;

const holdTime = 2000;
const LEAVE_TOLERANCE = 1000; // 視線が外れても許容する時間（ミリ秒）。1秒の猶予を持たせる

function checkPageTurn(x, y) {
  if (!isCalibrated) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const now = Date.now();

  // -------------------------
  // 左下（次へ）
  // -------------------------
  if (x < w * 0.3 && y > h * 0.7) {
    // エリア内にいる時は、外れた時間をリセット
    leaveLeftBottomTime = null;
    nextHint.classList.add("show");

    if (!gazeStartLeftBottom) {
      gazeStartLeftBottom = now;
    }

    if (now - gazeStartLeftBottom > holdTime && blinkCount >= 2) {
      nextPage(); // ※別途定義されている想定
      resetControl();
    }
  } else {
    // エリア外に出た場合の処理
    if (gazeStartLeftBottom) {
      if (!leaveLeftBottomTime) {
        leaveLeftBottomTime = now; // 外れた瞬間を記録
      }
      
      // 外れている時間が許容時間を超えたら、完全にリセットする
      if (now - leaveLeftBottomTime > LEAVE_TOLERANCE) {
        nextHint.classList.remove("show");
        gazeStartLeftBottom = null;
        leaveLeftBottomTime = null;
        blinkCount = 0; // タイマーが切れたら瞬きカウントもリセット
      }
    }
  }

  // -------------------------
  // 右下（前へ）
  // -------------------------
  if (x > w * 0.7 && y > h * 0.7) {
    leaveRightBottomTime = null;
    prevHint.classList.add("show");

    if (!gazeStartRightBottom) {
      gazeStartRightBottom = now;
    }

    if (now - gazeStartRightBottom > holdTime && blinkCount >= 2) {
      prevPage(); // ※別途定義されている想定
      resetControl();
    }
  } else {
    // エリア外に出た場合の処理
    if (gazeStartRightBottom) {
      if (!leaveRightBottomTime) {
        leaveRightBottomTime = now;
      }

      if (now - leaveRightBottomTime > LEAVE_TOLERANCE) {
        prevHint.classList.remove("show");
        gazeStartRightBottom = null;
        leaveRightBottomTime = null;
        blinkCount = 0;
      }
    }
  }
}

function resetControl(){
  blinkCount = 0;
  
  gazeStartLeftBottom = null;
  gazeStartRightBottom = null;
  
  leaveLeftBottomTime = null; // 追加
  leaveRightBottomTime = null; // 追加

  nextHint.classList.remove("show");
  prevHint.classList.remove("show");
}

// ===== 20-20-20 =====

setInterval(() => {

  if (!isCalibrated){
    lastTick = Date.now();
    return;
  }

  const now = Date.now();
  const delta = now - lastTick;
  lastTick = now;

  if (!isRestingPhase){

    if(isLookingAtScreen){

      totalViewingTimeMs += delta;

      if(totalViewingTimeMs >= WORK_LIMIT_MS){
        startRestPhase();
      }

    }

  }else{

    if(!isLookingAtScreen){

      restTimeRemainingMs -= delta;
      warningUI.style.opacity="0";
      timerUI.style.color="#4CAF50";

      if(restTimeRemainingMs <=0){
        endRestPhase();
      }

    }else{

      warningUI.style.opacity="1";
      timerUI.style.color="#ff5252";

    }

    timerUI.innerText = Math.max(0, restTimeRemainingMs/1000).toFixed(1);

  }

},100);

function startRestPhase(){
  isRestingPhase=true;
  restTimeRemainingMs=REST_LIMIT_MS;
  overlay20.style.display="flex";
}

function endRestPhase(){
  isRestingPhase=false;
  totalViewingTimeMs=0;
  overlay20.style.display="none";
}

// ===== WebGazer =====

window.onload = async function(){

  webgazer.clearData();

  await webgazer.setRegression('ridge').setGazeListener(function(data){

    // 1. トラッキングが完全に外れた場合
    if(!data){
      isLookingAtScreen = false;
      detectBlink(false); // 目閉じ扱い
      return;
    }

    const x = data.x;
    const y = data.y;

    // 2. 瞼を閉じた時の「座標の飛び（ノイズ）」を瞬きとして検知する
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // 画面外に大きくはみ出したら異常値とする
    const isOutOfBounds = (x < -100 || x > w + 100 || y < -100 || y > h + 100);

    // 前回位置からの異常なジャンプ（1フレームで400px以上飛んだらノイズ＝瞬きとみなす）
    const dx_raw = x - smoothX;
    const dy_raw = y - smoothY;
    const dist_raw = Math.sqrt(dx_raw * dx_raw + dy_raw * dy_raw);

    if(isOutOfBounds || dist_raw > 400){
      isLookingAtScreen = false;
      detectBlink(false); // 座標が飛んだ＝瞼を閉じたと判定
      return; // ★重要: ここで return するため、赤い点が飛ばずにその場で「停止」します！
    }

    // 3. 正常に目を開けている（トラッキングできている）場合
    detectBlink(true);
    isLookingAtScreen = true;

    // --- 以下、元のスムージング処理 ---
    gazeHistory.push({x, y});
    if(gazeHistory.length > historyLength) gazeHistory.shift();

    let avgX = 0, avgY = 0;
    gazeHistory.forEach(p => {
      avgX += p.x;
      avgY += p.y;
    });
    avgX /= gazeHistory.length;
    avgY /= gazeHistory.length;

    const dx = avgX - smoothX;
    const dy = avgY - smoothY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let smooth = baseSmooth;
    if(dist > 100){
      smooth = 0.4;
      gazeHistory = []; // ジャンプした場合は履歴リセット
    }

    smoothX += dx * smooth;
    smoothY += dy * smooth;

    gaze.style.left = smoothX + "px";
    gaze.style.top = smoothY + "px";

    if(!isRestingPhase){
      checkPageTurn(smoothX, smoothY);
    }

  }).begin();

  webgazer.showPredictionPoints(false);
  webgazer.showVideo(true);
  webgazer.showFaceOverlay(true);
  webgazer.showFaceFeedbackBox(true);

};

// ===== キャリブレーション =====

let completed=0;

points.forEach(point=>{

  let clickCount=0;

  point.addEventListener("click",function(e){

    clickCount++;

    webgazer.recordScreenPosition(e.clientX,e.clientY,'click');

    if(clickCount>=3){

      point.style.display="none";
      completed++;

      if(completed===points.length){
        endCalibration();
      }

    }else{

      point.style.opacity=1-(clickCount*0.3);

    }

  });

});

function endCalibration(){

  overlay.style.display="none";
  gaze.style.display="block";

  isCalibrated=true;

}

// 継続学習

document.addEventListener("click",function(e){

  if(overlay.style.display==="none"){

    webgazer.recordScreenPosition(e.clientX,e.clientY,'click');

  }

});