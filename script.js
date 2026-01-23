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

  const sheetID = "1X1leF9642035Ok4huMcOuHwSc1KQB7aKhStgUttYF1s";
  const apiKey = "AIzaSyB_X-_j8a_ZYja3WP21VOw0UrvRc2c9hCw"; // Public API key for Google Sheets API v4

  // -------------------------
  // Google Sheets API v4 laden
  // -------------------------
  function init() {
    const sheetName = "Sheet1"; // Change this to your sheet name if different
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${sheetName}?key=${apiKey}`;
    
    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        const rows = data.values;
        if (!rows || rows.length === 0) {
          console.error("Keine Daten in der Google Sheet gefunden");
          return;
        }
        
        // Convert rows to objects using first row as headers
        const headers = rows[0];
        dishes = rows.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, idx) => {
            obj[header] = row[idx] || '';
          });
          return obj;
        });
        
        displayDishes();
        selectTodayDish();
      })
      .catch(error => console.error("Fehler beim Laden der Google Sheets:", error));
  }

  // Start loading data
  init();

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

    const formId = "1f4zjyTaN2oXKcNXf0BxDbNo9EkRT6nm6GzNc2rie4RY"; // Deine Google Form ID

    const formUrl = `https://docs.google.com/forms/d/e/${formId}/formResponse`;
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