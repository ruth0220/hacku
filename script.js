// ===== 英語小説のテキスト（オズの魔法使い） =====
// 1ページあたりの文字数を大幅に減らし、全46ページ（23見開き）で構成しています。
const pages = [
  // Page 1
  "Even with eyes protected by the green spectacles, Dorothy and her friends were at first dazzled by the brilliancy of the wonderful City. The streets were lined with beautiful houses all built of green marble and studded everywhere with sparkling emeralds. They walked over a pavement of the same green marble, and where the blocks were joined together were rows of emeralds, set closely, and glittering in the brightness of the sun. The window panes were of green glass; even the sky above the City had a green tint, and the rays of the sun were green.",
  
  
  // Page 3
  "There were many people—men, women, and children—walking about, and these were all dressed in green clothes and had greenish skins. They looked at Dorothy and her strangely assorted company with wondering eyes, and the children all ran away and hid behind their mothers when they saw the Lion; but no one spoke to them. Many shops stood in the street, and Dorothy saw that everything in them was green. Green candy and green pop-corn were offered for sale, as well as green shoes, green hats, and green clothes of all sorts. At one place a man was selling green lemonade, and when the children bought it Dorothy could see that they paid for it with green pennies.",
  
  // Page 5
  "There seemed to be no horses nor animals of any kind; the men carried things around in little green carts, which they pushed before them. Everyone seemed happy and contented and prosperous. The Guardian of the Gates led them through the streets until they came to a big building, exactly in the middle of the City, which was the Palace of Oz, the Great Wizard. There was a soldier before the door, dressed in a green uniform and wearing a long green beard.",
  
  // Page 7
  "“Here are strangers,” said the Guardian of the Gates to him, “and they demand to see the Great Oz.”\n\n“Step inside,” answered the soldier, “and I will carry your message to him.” So they passed through the Palace Gates and were led into a big room with a green carpet and lovely green furniture set with emeralds. The soldier made them all wipe their feet upon a green mat before entering this room, and when they were seated he said politely:",
  
  // Page 9
  "“Please make yourselves comfortable while I go to the door of the Throne Room and tell Oz you are here.”\n\nThey had to wait a long time before the soldier returned. When, at last, he came back, Dorothy asked:\n\n“Have you seen Oz?” “Oh, no,” returned the soldier; “I have never seen him. But I spoke to him as he sat behind his screen and gave him your message. He said he will grant you an audience, if you so desire;",
  
  // Page 11
  "but each one of you must enter his presence alone, and he will admit but one each day. Therefore, as you must remain in the Palace for several days, I will have you shown to rooms where you may rest in comfort after your journey.”\n\n“Thank you,” replied the girl; “that is very kind of Oz.” The soldier now blew upon a green whistle, and at once a young girl, dressed in a pretty green silk gown, entered the room. She had lovely green hair and green eyes, and she bowed low before Dorothy as she said, “Follow me and I will show you your room.”",
  
  // Page 13
  "So Dorothy said good-bye to all her friends except Toto, and taking the dog in her arms followed the green girl through seven passages and up three flights of stairs until they came to a room at the front of the Palace. It was the sweetest little room in the world, with a soft comfortable bed that had sheets of green silk and a green velvet counterpane. There was a tiny fountain in the middle of the room, that shot a spray of green perfume into the air, to fall back into a beautifully carved green marble basin.",
  
  // Page 15
  "Beautiful green flowers stood in the windows, and there was a shelf with a row of little green books. When Dorothy had time to open these books she found them full of queer green pictures that made her laugh, they were so funny. In a wardrobe were many green dresses, made of silk and satin and velvet; and all of them fitted Dorothy exactly.\n\n“Make yourself perfectly at home,” said the green girl, “and if you wish for anything ring the bell. Oz will send for you tomorrow morning.”",

  // Page 17
  "She left Dorothy alone and went back to the others. These she also led to rooms, and each one of them found himself lodged in a very pleasant part of the Palace. Of course this politeness was wasted on the Scarecrow; for when he found himself alone in his room he stood stupidly in one spot, just within the doorway, to wait till morning. It would not rest him to lie down, and he could not close his eyes;",
  
  // Page 19
  "so he remained all night staring at a little spider which was weaving its web in a corner of the room, just as if it were not one of the most wonderful rooms in the world. The Tin Woodman lay down on his bed from force of habit, for he remembered when he was made of flesh; but not being able to sleep, he passed the night moving his joints up and down to make sure they kept in good working order."
  
];

let currentPage = 0;

const PageCountLeft = document.getElementById("page-count-left");
const PageCountRight = document.getElementById("page-count-right");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageRight = document.getElementById("page-right");
const pageLeft = document.getElementById("page-left");

function nextPage() {
  if (currentPage < pages.length - 2) {
    currentPage += 2;
    updatePage();
  }
}

function prevPage() {
  if (currentPage >= 2) {
    currentPage -= 2;
    updatePage();
  }
}

function updatePage() {
  // 英語なので左が先（1ページ目）
  if (pageLeft) {
    pageLeft.textContent = pages[currentPage];
    if (PageCountLeft) PageCountLeft.textContent = currentPage + 1;
  }
  
  // 右が後（2ページ目）
  if (pageRight) {
    if (currentPage + 1 < pages.length) {
      pageRight.textContent = pages[currentPage + 1]; 
      if (PageCountRight) PageCountRight.textContent = currentPage + 2;
    } else {
      pageRight.textContent = "";
      if (PageCountRight) PageCountRight.textContent = "";
    }
  }
}

// イベントリスナーの登録
if (nextBtn) nextBtn.addEventListener("click", nextPage);
if (prevBtn) prevBtn.addEventListener("click", prevPage);

function keyboard(e) {
  if (e.key === "ArrowRight") nextPage();
  if (e.key === "ArrowLeft") prevPage();
}

document.addEventListener("keydown", keyboard);

// 初期表示
updatePage();