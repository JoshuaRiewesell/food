document.addEventListener("DOMContentLoaded", () => {
  console.log("  Food App v1.0.12 - Loaded at", new Date().toLocaleTimeString());
  
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
  
  // Helper function to format date with German day names
  function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check for special days
    if (date.toDateString() === today.toDateString()) {
      return "Heute";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Gestern";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Morgen";
    }
    
    // German day names
    const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    const dayName = dayNames[date.getDay()];
    
    return dayName;
  }

  let dishes = [];
  let feedbackData = [];

  const sheetID = "1X1leF9642035Ok4huMcOuHwSc1KQB7aKhStgUttYF1s";

  // -------------------------
  // Apps Script Deployment URL
  // -------------------------
  const appsScriptUrl = `https://script.google.com/macros/s/AKfycbwg855vIGTAjpEN_3k7xpFrVAIOxJv-EeDN24kdVFb6B-eAWretj_t-2MRJMzgRPD0H8g/exec`;

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
      
      // Convert date string to Date object
      if (obj.Datum) {
        const [day, month, year] = obj.Datum.split('.');
        obj.datumObj = new Date(year, month - 1, day);
      }
      
      return obj;
    }).filter(row => Object.values(row).some(v => v)); // Remove empty rows

    console.log(`${dishes.length} Gerichte geladen:`, dishes);
    
    if (dishes.length === 0) {
      console.error("Keine gültigen Gerichte in der Google Sheet gefunden");
      menuList.innerHTML = '<p style="padding: 2rem; text-align: center; color: #666;">Keine Gerichte gefunden</p>';
      return;
    }

    displayDishes();
    selectTodayDish();
  }

  // Start loading data
  showLoadingSkeletons();
  init();

  function showLoadingSkeletons() {
    menuList.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const skeleton = document.createElement("div");
      skeleton.className = "skeleton-card";
      skeleton.innerHTML = `
        <div class="skeleton skeleton-date"></div>
        <div class="skeleton skeleton-dish"></div>
        <div class="skeleton skeleton-dish"></div>
      `;
      menuList.appendChild(skeleton);
    }
  }

  function displayDishes() {
    menuList.innerHTML = '';
    dishes.forEach((row, idx) => {
      const div = document.createElement("div");
      div.className = "menu-item";
      div.dataset.idx = idx;
      div.innerHTML = `<div class="date-small">${row.datumObj.toLocaleDateString()}</div><strong>${formatDate(row.datumObj)}</strong><div class="dish-name">${row.Gericht}</div>`;
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
      
      // Scroll the selected item into center view
      const selectedItem = menuList.children[idx];
      const containerWidth = menuList.offsetWidth;
      const itemWidth = selectedItem.offsetWidth;
      const itemLeft = selectedItem.offsetLeft;
      const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2) + menuList.scrollLeft;
      
      menuList.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
    
    const dish = dishes[idx].Gericht;
    currentDishElem.textContent = dish;
    feedbackDishInput.value = dish;
    resultDiv.style.display = "none";
    feedbackForm.style.display = "block";
    updateFeedbackAnalysis(dish);
  }

  function selectTodayDish() {
    const idx = dishes.findIndex(d => {
      if (!d.datumObj) return false;
      return d.datumObj.toDateString() === today.toDateString();
    });
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

    const data = new URLSearchParams();
    data.append("dish", dish);
    data.append("overall", formData.get("overall"));
    data.append("food", formData.get("food"));
    data.append("wait", formData.get("wait"));
    data.append("comment", formData.get("comment"));

    console.log("Sende Feedback zum Apps Script:", Object.fromEntries(data));

    fetch(appsScriptUrl, { 
      method: "POST", 
      mode: "no-cors",
      body: data 
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