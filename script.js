document.addEventListener("DOMContentLoaded", () => {
  console.log("  Food App v1.1.1 - Loaded at", new Date().toLocaleTimeString());
  
  const menuList = document.getElementById("menu-list");
  const currentDishElem = document.getElementById("current-dish");
  const feedbackForm = document.getElementById("feedback-form");
  const feedbackDishIdInput = document.getElementById("feedback-dish-id");
  const feedbackDishInput = document.getElementById("feedback-dish");
  const ratingOverallInput = document.getElementById("rating-overall");
  const feedbackChipsInput = document.getElementById("feedback-chips");
  const chipsContainer = document.getElementById("chips-container");
  const resultDiv = document.getElementById("feedback-result");
  const avgOverallElem = document.getElementById("avg-overall");
  const avgFoodElem = document.getElementById("avg-food");
  const avgWaitElem = document.getElementById("avg-wait");
  const recentCommentsElem = document.getElementById("recent-comments");
  const feedbackSubmittedAtElem = document.getElementById("feedback-submitted-at");
  const commentField = document.getElementById("feedback-comment");

  const fallbackChipsOptions = [
    "zu salzig",
    "zu scharf",
    "zu fade",
    "zu trocken",
    "zu fettig",
    "zu kalt",
    "zu heiß"
  ];

  let chipsOptions = [];
  const selectedChips = new Set();
  let selectedDishIdx = null;
  
  const today = new Date();
  const LOCAL_STORAGE_KEY = "foodApp.feedbackByDish.v1";

  function readFeedbackStore() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return parsed;
    } catch {
      return {};
    }
  }

  function writeFeedbackStore(store) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store || {}));
    } catch {
      // ignore
    }
  }

  function formatGermanDateFromISO(isoString) {
    const dt = isoString ? new Date(isoString) : new Date();
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("de-DE");
  }

  function lockFeedbackForm(isLocked) {
    if (!feedbackForm) return;
    const controls = feedbackForm.querySelectorAll("button, textarea, input");
    controls.forEach(el => {
      if (el.type === "hidden") return;
      el.disabled = Boolean(isLocked);
    });

    if (feedbackSubmittedAtElem) {
      feedbackSubmittedAtElem.style.display = isLocked ? "block" : "none";
    }

    const submitBtn = document.getElementById("feedback-submit");
    if (submitBtn) {
      submitBtn.style.display = isLocked ? "none" : "inline-flex";
    }
  }

  function applyStoredFeedbackIfAny(dishId) {
    const store = readFeedbackStore();
    const entry = store?.[dishId];

    if (!entry) {
      if (feedbackSubmittedAtElem) feedbackSubmittedAtElem.style.display = "none";
      lockFeedbackForm(false);
      return;
    }

    if (ratingOverallInput) ratingOverallInput.value = entry.overall ?? "";
    refreshStarRatings();

    selectedChips.clear();
    (entry.chips || []).forEach(c => selectedChips.add(c));
    renderChips();

    if (commentField) commentField.value = entry.comment ?? "";

    if (feedbackSubmittedAtElem) {
      const formatted = formatGermanDateFromISO(entry.submittedAt);
      feedbackSubmittedAtElem.textContent = formatted ? `Feedback abgegeben am ${formatted}` : "Feedback abgegeben";
    }

    lockFeedbackForm(true);
  }
  
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
  const appsScriptUrl = `https://script.google.com/macros/s/AKfycby2d7gjT-1Iw0TGMCi7ZPExKEidurRfmcQe45PtyYUMw5Cg6VSO6NfA_DPUvfS4hWCy_Q/exec`;

  // -------------------------
  // Google Sheets CSV Export laden
  // -------------------------
  function init() {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/export?format=csv`;
    const chipsCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:csv&sheet=Chips`;
    
    fetch(csvUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(csv => parseCSV(csv))
      .catch(error => console.error("Fehler beim Laden der Google Sheets:", error));

    fetch(chipsCsvUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(csv => parseChipsCSV(csv))
      .catch(error => {
        console.error("Fehler beim Laden der Chips:", error);
        chipsOptions = fallbackChipsOptions.slice();
        renderChips();
      });
  }

  function parseChipsCSV(csv) {
    const lines = csv.trim().split("\n");
    if (lines.length <= 1) {
      chipsOptions = fallbackChipsOptions.slice();
      renderChips();
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const chipColIdx = headers.findIndex(h => h === "Chips");
    if (chipColIdx < 0) {
      chipsOptions = fallbackChipsOptions.slice();
      renderChips();
      return;
    }

    chipsOptions = lines
      .slice(1)
      .map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return values[chipColIdx] || "";
      })
      .map(v => v.trim())
      .filter(v => v);

    if (chipsOptions.length === 0) chipsOptions = fallbackChipsOptions.slice();
    renderChips();
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

  initStarRatings();

  function setStarRating(container, value) {
    const numericValue = Number(value) || 0;
    const buttons = Array.from(container.querySelectorAll(".star-btn"));
    buttons.forEach(btn => {
      const v = Number(btn.dataset.value);
      if (v <= numericValue) btn.classList.add("is-filled");
      else btn.classList.remove("is-filled");
    });
  }

  function initStarRatings() {
    document.querySelectorAll(".star-rating").forEach(container => {
      if (container.dataset.initialized === "true") return;
      const key = container.dataset.input;
      if (key !== "overall") return;
      if (!ratingOverallInput) return;

      setStarRating(container, ratingOverallInput.value);

      container.addEventListener("click", e => {
        const btn = e.target.closest(".star-btn");
        if (!btn || !container.contains(btn)) return;

        const value = Number(btn.dataset.value);
        ratingOverallInput.value = String(value);
        setStarRating(container, value);
      });

      container.dataset.initialized = "true";
    });
  }

  function refreshStarRatings() {
    document.querySelectorAll(".star-rating").forEach(container => {
      const key = container.dataset.input;
      if (key !== "overall") return;
      if (!ratingOverallInput) return;
      setStarRating(container, ratingOverallInput.value);
    });
  }

  function syncChipsHiddenInput() {
    if (!feedbackChipsInput) return;
    feedbackChipsInput.value = Array.from(selectedChips).join(", ");
  }

  function renderChips() {
    if (!chipsContainer) return;
    chipsContainer.innerHTML = "";

    (chipsOptions.length ? chipsOptions : fallbackChipsOptions).forEach(label => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = label;
      btn.setAttribute("aria-pressed", "false");

      btn.addEventListener("pointerdown", e => {
        // Avoid focus-induced scroll jumps on click/tap
        e.preventDefault();
      }, { passive: false });

      btn.addEventListener("click", e => {
        e.preventDefault();
        if (selectedChips.has(label)) {
          selectedChips.delete(label);
          btn.classList.remove("is-selected");
          btn.setAttribute("aria-pressed", "false");
        } else {
          selectedChips.add(label);
          btn.classList.add("is-selected");
          btn.setAttribute("aria-pressed", "true");
        }
        syncChipsHiddenInput();

        btn.blur();
      });

      chipsContainer.appendChild(btn);
    });

    syncChipsHiddenInput();
  }

  renderChips();

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
      div.addEventListener("click", () => selectDish(idx, { userInitiated: true }));
      menuList.appendChild(div);
    });
  }

  function selectDish(idx, options = {}) {
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
      
      const isRepeatSelection = selectedDishIdx === idx;
      const shouldScroll = !(options.userInitiated && isRepeatSelection);

      if (shouldScroll) {
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
    }

    selectedDishIdx = idx;
    
    const dish = dishes[idx].Gericht;
    currentDishElem.textContent = dish;
    feedbackDishInput.value = dish;
    if (feedbackDishIdInput) feedbackDishIdInput.value = dish;
    resultDiv.style.display = "none";
    feedbackForm.style.display = "block";
    if (ratingOverallInput) ratingOverallInput.value = "";
    refreshStarRatings();
    selectedChips.clear();
    renderChips();
    if (commentField) {
      commentField.placeholder = "Kurzfeedback...";
      commentField.value = "";
    }
    applyStoredFeedbackIfAny(dish);
  }

  function selectTodayDish() {
    const idx = dishes.findIndex(d => {
      if (!d.datumObj) return false;
      return d.datumObj.toDateString() === today.toDateString();
    });
    if(idx >= 0) selectDish(idx);
    else selectDish(0);
  }

  // Feedbackformular submit
  // -------------------------
  feedbackForm.addEventListener("submit", e => {
    e.preventDefault();

    const dishIdForLock = feedbackDishIdInput?.value || feedbackDishInput?.value;
    if (dishIdForLock) {
      const existing = readFeedbackStore()?.[dishIdForLock];
      if (existing) return;
    }

    const formData = new FormData(feedbackForm);
    const dish = formData.get("dish");
    const dishId = formData.get("dishId");
    const overall = formData.get("overall");
    const chips = formData.get("chips");

    const data = new URLSearchParams();
    data.append("dishId", dishId);
    data.append("dish", dish);
    data.append("overall", overall);
    data.append("chips", chips);
    data.append("comment", formData.get("comment"));

    console.log("Sende Feedback zum Apps Script:", Object.fromEntries(data));

    fetch(appsScriptUrl, { 
      method: "POST", 
      mode: "no-cors",
      body: data 
    })
      .then(() => {
        console.log("Feedback erfolgreich gesendet!");

        const submittedAtIso = new Date().toISOString();
        const store = readFeedbackStore();
        store[dishId] = {
          submittedAt: submittedAtIso,
          overall: overall ?? "",
          chips: Array.from(selectedChips),
          comment: (formData.get("comment") || "").toString()
        };
        writeFeedbackStore(store);

        spawnStarBurst(70);

        applyStoredFeedbackIfAny(dishId);
        feedbackForm.style.display = "block";
        resultDiv.style.display = "none";
      })
      .catch(error => console.error("Fehler beim Absenden:", error));
  });

  function spawnStarBurst(count) {
    const root = document.body;
    if (!root) return;

    const origin = document.getElementById("feedback-section");
    const rect = origin ? origin.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + 80;

    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.textContent = "★";
      el.style.position = "fixed";
      el.style.left = `${startX}px`;
      el.style.top = `${startY}px`;
      el.style.color = "#f5b301";
      el.style.fontSize = `${12 + Math.random() * 18}px`;
      el.style.pointerEvents = "none";
      el.style.zIndex = "9999";
      el.style.willChange = "transform, opacity";

      const angle = Math.random() * Math.PI * 2;
      const distance = 120 + Math.random() * 360;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - (100 + Math.random() * 220);
      const rot = (Math.random() * 720 - 360).toFixed(0);
      const duration = 900 + Math.random() * 700;

      root.appendChild(el);

      const anim = el.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }
        ],
        { duration, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
      );

      anim.addEventListener("finish", () => el.remove());
    }
  }

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