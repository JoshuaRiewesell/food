document.addEventListener("DOMContentLoaded", () => {
  console.log("🍽️  Food App v1.0.5 - Loaded at", new Date().toLocaleTimeString());
  
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

  // -------------------------
  // Google Form Konfiguration
  // -------------------------
  const formId = "1f4zjyTaN2oXKcNXf0BxDbNo9EkRT6nm6GzNc2rie4RY";
  const formEntryIds = {
    overall: "entry.1250813182",
    food: "entry.207920365",
    wait: "entry.54224442",
    dish: "entry.599666163",
    comment: "entry.931221081"
  };

  // -------------------------
  // Google Sheets CSV Export laden
  // -------------------------
  function init() {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/export?format=csv`;
    
    fetch(csvUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(csv => parseCSV(csv))
      .catch(error => console.error("Fehler beim Laden der Google Sheets:", error));
  }

  function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length === 0) {
      console.error("Keine Daten in der Google Sheet gefunden");
      return;
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    console.log("CSV Headers:", headers);
    
    // Parse rows
    dishes = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      return obj;
    }).filter(row => Object.values(row).some(v => v)); // Remove empty rows

    console.log(`${dishes.length} Gerichte geladen:`, dishes);
    
    if (dishes.length === 0) {
      console.error("Keine gültigen Gerichte in der Google Sheet gefunden");
      return;
    }

    displayDishes();
    selectTodayDish();
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
    // Safety check: ensure dishes array has data
    if (!dishes || dishes.length === 0) {
      console.error("Keine Gerichte geladen");
      return;
    }
    
    // Ensure idx is valid
    if (idx < 0 || idx >= dishes.length) {
      console.error(`Ungültiger Index: ${idx}, verfügbare Gerichte: ${dishes.length}`);
      return;
    }
    
    // Remove selected class from all items safely
    dishes.forEach((_, i) => {
      if (menuList.children[i]) {
        menuList.children[i].classList.remove("selected");
      }
    });
    
    // Add selected class to current item safely
    if (menuList.children[idx]) {
      menuList.children[idx].classList.add("selected");
    }
    
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

    const formUrl = `https://docs.google.com/forms/d/e/${formId}/formResponse`;
    const data = new URLSearchParams();
    data.append(formEntryIds.overall, formData.get("overall"));
    data.append(formEntryIds.food, formData.get("food"));
    data.append(formEntryIds.wait, formData.get("wait"));
    data.append(formEntryIds.dish, dish);
    data.append(formEntryIds.comment, formData.get("comment"));

    // Debug: Log was wir abschicken
    console.log("Sending to Google Form:", {
      url: formUrl,
      entries: formEntryIds,
      data: Object.fromEntries(data)
    });

    fetch(formUrl, { method:"POST", mode:"cors", body:data })
      .then(response => {
        console.log("Response status:", response.status);
        return response;
      })
      .then(() => {
        console.log("Feedback erfolgreich gesendet!");
        feedbackForm.style.display = "none";
        resultDiv.style.display = "block";
        updateFeedbackAnalysis(dish);
      })
      .catch(error => console.error("Fehler beim Absenden:", error));
  });

  // -------------------------
  // Feedbackanalyse visualisieren
  // -------------------------
  function updateFeedbackAnalysis(dish) {
    // Platzhalter - sobald Feedback in Form_Responses landet,
    // kann man hier eine Analyse einbauen
    avgOverallElem.innerHTML = "Feedback wird verarbeitet...";
    avgFoodElem.innerHTML = "";
    avgWaitElem.innerHTML = "";
    recentCommentsElem.innerHTML = "";
    console.log(`Feedback für Gericht: ${dish}`);
  }
});