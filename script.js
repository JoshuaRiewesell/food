document.addEventListener("DOMContentLoaded", () => {
  const menuList = document.getElementById("menu-list");
  const currentDishElem = document.getElementById("current-dish");
  const feedbackForm = document.getElementById("feedback-form");
  const feedbackDishInput = document.getElementById("feedback-dish");
  const resultDiv = document.getElementById("feedback-result");
  const avgOverallElem = document.getElementById("avg-overall");
  const avgFoodElem = document.getElementById("avg-food");
  const avgWaitElem = document.getElementById("avg-wait");
  const recentCommentsElem = document.getElementById("recent-comments");
  const dateElem = document.getElementById("date");

  const today = new Date();
  dateElem.textContent = today.toLocaleDateString();

  let dishes = [];
  let feedbackData = [];

  const sheetID = "1X1leF9642035Ok4huMcOuHwSc1KQB7aKhStgUttYF1s"; // Nur die ID, Sheet muss öffentlich sein

  // -------------------------
  // Tabletop.js laden
  // -------------------------
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/tabletop@1.6.0/src/tabletop.min.js";
  script.onload = init;
  document.body.appendChild(script);

  function init() {
    Tabletop.init({
      key: sheetID,
      simpleSheet: true,
      callback: data => {
        dishes = data;
        displayDishes();
        selectTodayDish();
      },
      error: () => console.error("Fehler beim Laden der Google Sheets. Stelle sicher, dass die Sheet öffentlich ist!")
    });
  }

  function displayDishes() {
    menuList.innerHTML = '';
    dishes.forEach((row, idx) => {
      const div = document.createElement("div");
      div.className = "menu-item";
      div.dataset.idx = idx;
      div.innerHTML = `<strong>${new Date(row.Datum).toLocaleDateString()}</strong><br>${row.Gericht}`;
      div.addEventListener("click", () => selectDish(idx));
      menuList.appendChild(div);
    });
  }

  function selectDish(idx) {
    dishes.forEach((_, i) => menuList.children[i].classList.remove("selected"));
    menuList.children[idx].classList.add("selected");
    const dish = dishes[idx].Gericht;
    currentDishElem.textContent = dish;
    feedbackDishInput.value = dish;
    resultDiv.style.display = "none";
    feedbackForm.style.display = "block";
    updateFeedbackAnalysis(dish);
  }

  function selectTodayDish() {
    const todayStr = today.toISOString().split('T')[0];
    const idx = dishes.findIndex(d => d.Datum.startsWith(todayStr));
    if(idx >= 0) selectDish(idx);
    else selectDish(0);
  }

  // -------------------------
  // Feedbackformular submit
  // -------------------------
  feedbackForm.addEventListener("submit", e => {
    e.preventDefault();
    const formData = new FormData(feedbackForm);
    const dish = formData.get("dish");

    const formUrl = "https://docs.google.com/forms/d/e/DEINE_FORM_ID/formResponse";
    const data = new URLSearchParams();
    data.append("entry.1111111111", formData.get("overall"));
    data.append("entry.2222222222", formData.get("food"));
    data.append("entry.3333333333", formData.get("wait"));
    data.append("entry.4444444444", dish);
    data.append("entry.5555555555", formData.get("comment"));

    fetch(formUrl, { method:"POST", mode:"no-cors", body:data })
      .then(() => {
        feedbackForm.style.display = "none";
        resultDiv.style.display = "block";
        updateFeedbackAnalysis(dish);
      });
  });

  // -------------------------
  // Feedbackanalyse visualisieren
  // -------------------------
  function updateFeedbackAnalysis(dish) {
    Tabletop.init({
      key: sheetID,
      simpleSheet: true,
      callback: data => {
        feedbackData = data.filter(f => f.Gericht === dish);
        if(feedbackData.length === 0){
          avgOverallElem.innerHTML = "Noch keine Bewertungen.";
          avgFoodElem.innerHTML = "";
          avgWaitElem.innerHTML = "";
          recentCommentsElem.innerHTML = "";
          return;
        }

        const avg = (col) => {
          const vals = feedbackData.map(f => Number(f[col])).filter(n => !isNaN(n));
          return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2);
        };

        function createStarBar(elem, label, value) {
          elem.innerHTML = `<div>${label}:</div>
            <div class="star-bar-inner" style="width:${value/5*100}%">${value} ⭐</div>`;
        }

        createStarBar(avgOverallElem, "Durchschnitt Gesamt", avg("Gesamtbewertung"));
        createStarBar(avgFoodElem, "Durchschnitt Essen", avg("Essen"));
        createStarBar(avgWaitElem, "Durchschnitt Wartezeit", avg("Wartezeit"));

        recentCommentsElem.innerHTML = "";
        feedbackData.slice(-5).forEach(f => {
          if(f.Kommentar){
            const li = document.createElement("li");
            li.textContent = f.Kommentar;
            recentCommentsElem.appendChild(li);
          }
        });
      }
    });
  }
});