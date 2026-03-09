const pages = [
  "これは1ページ目の文章です。",
  "これは2ページ目の文章です。",
  "これは3ページ目の文章です。"
];

let currentPage = 0;

const pageText = document.getElementById("page-text");
const pageIndicator = document.getElementById("page-indicator");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

function renderPage() {
  pageText.textContent = pages[currentPage];
  pageIndicator.textContent = `${currentPage + 1} / ${pages.length}`;
}



function nextPage() {
  if (currentPage < pages.length - 1) {
    currentPage++;
    renderPage();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
}

prevBtn.addEventListener("click", prevPage);
nextBtn.addEventListener("click", nextPage);

renderPage();