const pages=["これは1ページ目です。","これは2ページ目です。",
             "これは3ページ目です。","これは4ページ目です。",
             "これは5ページ目です。","これは6ページ目です。"];

let currentPage = 0;

//ページカウント
const PageCountLeft = document.getElementById("page-count-left");
const PageCountRight = document.getElementById("page-count-right");

//ボタン
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

const pageRight = document.getElementById("page-right");
const pageLeft = document.getElementById("page-left");

//次へボタンが押されたらページカウントを増やしupdatePageを呼ぶ
function nextPage(){
  if(currentPage < pages.length - 2){
    currentPage += 2;
    updatePage();
  }
}

//前へボタンが押されたらページカウントを減らす
function prevPage(){
  if(currentPage >= 2){
    currentPage -= 2;
    updatePage();
  }
}

//文章を書き換える
function updatePage(){
  //右
  pageRight.textContent = pages[currentPage];
  PageCountRight.textContent = currentPage + 1;
  //左
  if(currentPage + 1 < pages.length){
    pageLeft.textContent = pages[currentPage + 1]; 
    PageCountLeft.textContent = currentPage + 2;
  }else{
    pageLeft.textContent = "";
    PageCountRight.textContent = "";
  }
}

//ボタンを押したらページカウントを増減させる関数
nextBtn.addEventListener("click",nextPage);
prevBtn.addEventListener("click",prevPage);

function keyboard(e){
  if(e.key == "ArrowRight")nextPage();
  if(e.key == "ArrowLeft")prevPage();
}

document.addEventListener("keydown",keyboard);

updatePage();