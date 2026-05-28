let cards = [];
let ingredientsPool = [];
let garnishesPool = [];
let filteredCards = [];
let currentCard = null;
let currentQuestionIndex = 0;
let cardIndex = 0;
let selectedDifficulty = "medium";
let selectedSections = [];

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

// === Build quiz questions from compact drink data ===
function buildQuestions(drink, difficulty) {
  const questions = [];
  const name = drink.drink;
  const ingNames = drink.ingredients.map(i => i.name);
  const measuredIngs = drink.ingredients.filter(i => i.oz !== undefined);

  if (drink.mainAlcohol) {
    questions.push({
      type: "multiple-choice",
      question: `What is the main alcohol in a ${name}?`,
      answer: drink.mainAlcohol
    });
  }

  if (ingNames.length > 0) {
    if (difficulty === "easy") {
      questions.push({ type: "multiple-choice", question: `What are the ingredients in a ${name}?`, answer: ingNames.join(", ") });
    } else if (difficulty === "medium") {
      questions.push({ type: "multiple-select", question: `Select all ingredients in a ${name}:`, answer: ingNames });
    } else {
      questions.push({ type: "free-response", question: `Type all ingredients in a ${name} (comma-separated):`, answer: ingNames });
    }
  }

  measuredIngs.forEach(ing => {
    questions.push({ type: "free-response", question: `How many ounces of ${ing.name} are used in a ${name}?`, answer: String(ing.oz) });
  });

  if (drink.garnishes.length > 0) {
    if (difficulty === "easy") {
      questions.push({ type: "multiple-choice", question: `What are the garnishes for a ${name}?`, answer: drink.garnishes.join(", ") });
    } else if (difficulty === "medium") {
      questions.push({ type: "multiple-select", question: `Select the garnishes for a ${name}:`, answer: drink.garnishes });
    } else {
      questions.push({ type: "free-response", question: `Type all garnishes for a ${name} (comma-separated):`, answer: drink.garnishes });
    }
  }

  return questions;
}

async function loadCards() {
  const res = await fetch("data/cards.json");
  const rawData = await res.json();
  cards = rawData.drinks;

  const ingSet = new Set();
  const garnSet = new Set();
  cards.forEach(card => {
    card.ingredients.forEach(i => ingSet.add(i.name));
    card.garnishes.forEach(g => garnSet.add(g));
  });
  ingredientsPool = [...ingSet];
  garnishesPool = [...garnSet];

  // Version tag
  document.getElementById("version-tag").innerText = "v2";

  // Build section pill checkboxes
  const uniqueSections = [...new Set(cards.map(c => c.section))];
  const sectionContainer = document.getElementById("section-options");
  uniqueSections.forEach(section => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = section;
    const span = document.createElement("span");
    span.textContent = section;
    label.appendChild(checkbox);
    label.appendChild(span);
    sectionContainer.appendChild(label);
  });

  document.getElementById("start-quiz-btn").onclick = initializeQuiz;
  setupDrinkSearch();

  // Home screen navigation
  document.getElementById("go-recipes-btn").onclick = () => {
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("recipe-screen").style.display = "block";
    document.getElementById("drink-search-input").focus();
  };

  document.getElementById("go-quiz-btn").onclick = () => {
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("setup-screen").style.display = "block";
  };

  document.getElementById("back-from-recipes").onclick = () => {
    document.getElementById("recipe-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
    document.getElementById("drink-search-input").value = "";
    document.getElementById("search-suggestion").innerHTML = "";
    document.getElementById("drink-info").innerHTML = "";
  };

  document.getElementById("back-from-quiz").onclick = () => {
    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
  };

  // Batches navigation
  document.getElementById("go-batches-btn").onclick = () => {
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("batch-screen").style.display = "block";
    document.getElementById("batch-list").style.display = "block";
    document.getElementById("batch-detail").style.display = "none";
  };

  document.getElementById("back-from-batches").onclick = () => {
    document.getElementById("batch-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
  };

  document.getElementById("back-from-batch-detail").onclick = () => {
    document.getElementById("batch-detail").style.display = "none";
    document.getElementById("batch-list").style.display = "block";
    document.getElementById("back-from-batches").style.display = "inline-flex";
  };

  loadBatches();
}

function initializeQuiz() {
  selectedSections = Array.from(document.querySelectorAll("#section-options input:checked")).map(cb => cb.value);
  const diffRadio = document.querySelector("input[name='difficulty']:checked");
  if (diffRadio) selectedDifficulty = diffRadio.value;

  filteredCards = shuffleArray(
    cards
      .filter(c => selectedSections.includes(c.section))
      .map(c => ({ ...c, questions: buildQuestions(c, selectedDifficulty) }))
  );
  cardIndex = 0;

  document.getElementById("setup-screen").style.display = "none";
  document.getElementById("home-screen").style.display = "none";
  document.querySelector(".card-image").style.display = "block";
  document.querySelector(".question").style.display = "block";
  document.getElementById("options-container").style.display = "flex";

  loadNextCard();
}

function loadNextCard() {
  if (cardIndex >= filteredCards.length) {
    document.getElementById("question-text").innerText = "🎉 All done!";
    document.querySelector(".card-image").style.display = "none";
    document.getElementById("options-container").innerHTML = "";
    return;
  }
  currentCard = filteredCards[cardIndex];
  currentQuestionIndex = 0;
  const img = document.getElementById("drink-image");
  img.src = currentCard.image;
  img.style.objectPosition = currentCard.imagePosition || "center";
  document.getElementById("question-text").innerText = currentCard.drink;
  displayQuestion();
}

function displayQuestion() {
  const qObj = currentCard.questions[currentQuestionIndex];
  if (!qObj) { cardIndex++; loadNextCard(); return; }

  const container = document.getElementById("options-container");
  container.innerHTML = "";

  document.querySelector(".card-image").style.display =
    qObj.type === "multiple-select" ? "none" : "block";

  const qEl = document.createElement("h3");
  qEl.innerText = qObj.question;
  container.appendChild(qEl);

  if (qObj.type === "multiple-choice") {
    const isMain = qObj.question.toLowerCase().includes("main alcohol");
    const isGarnish = qObj.question.toLowerCase().includes("garnish");

    const pool = cards
      .filter(c => c.drink !== currentCard.drink)
      .flatMap(c => {
        if (isMain) return c.mainAlcohol ? [c.mainAlcohol] : [];
        if (isGarnish) return [c.garnishes.join(", ")];
        return [c.ingredients.map(i => i.name).join(", ")];
      });

    const options = shuffleArray([
      ...pool.filter(a => a !== qObj.answer).slice(0, 3),
      qObj.answer
    ]);

    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.innerText = opt;
      btn.onclick = () => checkAnswer(opt, qObj.answer);
      container.appendChild(btn);
    });

  } else if (qObj.type === "free-response") {
    const input = document.createElement("input");
    input.type = qObj.question.toLowerCase().includes("how many ounces") ? "number" : "text";
    input.step = "any";
    input.inputMode = "decimal";
    input.id = "user-answer";
    input.placeholder = qObj.type === "free-response" && !qObj.question.includes("ounces") ? "Type your answer…" : "";
    container.appendChild(input);
    input.focus();

    const btn = document.createElement("button");
    btn.innerText = "Submit";
    btn.className = "submit-btn";
    btn.onclick = () => checkAnswer(document.getElementById("user-answer").value.trim(), qObj.answer);
    container.appendChild(btn);

  } else if (qObj.type === "multiple-select") {
    const isGarnish = qObj.question.toLowerCase().includes("garnish");
    const pool = isGarnish ? garnishesPool : ingredientsPool;
    const distractors = shuffleArray(pool.filter(item => !qObj.answer.includes(item)))
                          .slice(0, Math.max(4, 9 - qObj.answer.length));
    const allOptions = shuffleArray([...qObj.answer, ...distractors]);

    allOptions.forEach(option => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = option;
      checkbox.className = "multi-option";

      const checkBox = document.createElement("span");
      checkBox.className = "check-box";

      const text = document.createTextNode(option);
      label.appendChild(checkbox);
      label.appendChild(checkBox);
      label.appendChild(text);

      // Toggle visual state
      checkbox.addEventListener("change", () => {
        checkBox.style.background = checkbox.checked ? "var(--amber)" : "";
        checkBox.style.borderColor = checkbox.checked ? "var(--amber)" : "";
      });

      container.appendChild(label);
    });

    const btn = document.createElement("button");
    btn.innerText = "Submit";
    btn.className = "submit-btn";
    btn.onclick = () => {
      const selected = Array.from(document.querySelectorAll(".multi-option:checked")).map(c => c.value);
      checkMultiAnswer(selected, qObj.answer);
    };
    container.appendChild(btn);
  }
}

function checkAnswer(selected, correct) {
  const normalize = str => str.toLowerCase().split(',').map(s => s.trim()).sort().join(',');
  const correctStr = Array.isArray(correct) ? correct.join(',') : correct;
  if (normalize(selected) === normalize(correctStr)) {
    alert("✅ Correct!");
  } else {
    alert(`❌ Incorrect.\nCorrect answer: ${Array.isArray(correct) ? correct.join(", ") : correct}`);
  }
  nextQuestion();
}

function checkMultiAnswer(selectedArray, correctArray) {
  const normalize = arr => arr.map(s => s.toLowerCase()).sort().join(",");
  if (normalize(selectedArray) === normalize(correctArray)) {
    alert("✅ Correct!");
  } else {
    alert(`❌ Incorrect.\nCorrect answers: ${correctArray.join(", ")}`);
  }
  nextQuestion();
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < currentCard.questions.length) {
    displayQuestion();
  } else {
    cardIndex++;
    loadNextCard();
  }
}

window.onload = loadCards;

// === Batches ===

let batches = [];

async function loadBatches() {
  try {
    const res = await fetch("data/batches.json");
    const data = await res.json();
    batches = data.batches;
    renderBatchList();
  } catch (e) {
    console.error("Failed to load batches:", e);
  }
}

function renderBatchList() {
  const list = document.getElementById("batch-list");
  list.innerHTML = "";

  if (batches.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted);text-align:center;margin-top:32px;">No batches added yet.</p>`;
    return;
  }

  batches.forEach((batch, index) => {
    const card = document.createElement("div");
    card.className = "batch-card";
    card.innerHTML = `
      <img class="batch-card-img" src="${batch.image}" alt="${batch.name}" onerror="this.style.display='none'" />
      <div class="batch-card-body">
        <span class="batch-card-name">${batch.name}</span>
        ${batch.yield ? `<span class="batch-card-yield">${batch.yield}</span>` : ""}
      </div>
      <span class="batch-card-arrow">›</span>
    `;
    card.onclick = () => showBatchDetail(index);
    list.appendChild(card);
  });
}

function showBatchDetail(index) {
  const batch = batches[index];
  const detailContent = document.getElementById("batch-detail-content");

  const ingredientsHTML = batch.ingredients.map(ing =>
    `<li><span class="batch-ing-name">${ing.name}</span><span class="batch-ing-amount">${ing.amount || ""}</span></li>`
  ).join("");

  detailContent.innerHTML = `
    <img class="batch-detail-img" src="${batch.image}" alt="${batch.name}" onerror="this.style.display='none'" />
    <div class="batch-detail-body">
      <h3 class="batch-detail-title">${batch.name}</h3>
      ${batch.yield ? `<p class="batch-detail-yield">Yield: ${batch.yield}</p>` : ""}
      <div class="batch-detail-section">
        <span class="batch-section-label">Ingredients</span>
        <ul class="batch-ing-list">${ingredientsHTML}</ul>
      </div>
      ${batch.notes ? `
      <div class="batch-detail-section">
        <span class="batch-section-label">Notes</span>
        <p class="batch-notes">${batch.notes}</p>
      </div>` : ""}
    </div>
  `;

  document.getElementById("batch-list").style.display = "none";
  document.getElementById("back-from-batches").style.display = "none";
  document.getElementById("batch-detail").style.display = "block";
}


// === Drink Search ===
let fuse;

function setupDrinkSearch() {
  const input = document.getElementById("drink-search-input");
  const suggestion = document.getElementById("search-suggestion");
  const infoBox = document.getElementById("drink-info");

  fuse = new Fuse(cards, { keys: ['drink', 'aliases'], threshold: 0.4 });

  input.addEventListener("input", e => {
    const query = e.target.value.trim();
    infoBox.innerHTML = "";
    suggestion.innerHTML = "";
    if (!query) return;

    const results = fuse.search(query);
    if (results.length > 0) {
      const match = results[0].item;
      suggestion.innerHTML = `Showing: <strong>${match.drink}</strong>`;
      showDrinkInfo(match);
    } else {
      suggestion.innerHTML = "No match found.";
    }
  });
}

function showDrinkInfo(drink) {
  const box = document.getElementById("drink-info");
  const measured = drink.ingredients.filter(i => i.oz !== undefined);
  const ingNames = drink.ingredients.map(i => i.name);

  box.innerHTML = `
    <img class="drink-info-img" src="${drink.image}" alt="${drink.drink}" />
    <div class="drink-info-body">
      <h3>${drink.drink}</h3>
      ${drink.mainAlcohol ? `
        <div class="drink-info-row">
          <strong>Main Alcohol</strong>${drink.mainAlcohol}
        </div>` : ''}
      ${ingNames.length ? `
        <div class="drink-info-row">
          <strong>Ingredients</strong>${ingNames.join(", ")}
        </div>` : ''}
      ${measured.length ? `
        <div class="drink-info-row">
          <strong>Measurements</strong>
          <ul>${measured.map(i => `<li>${i.name}: ${i.oz} oz</li>`).join('')}</ul>
        </div>` : ''}
      ${drink.garnishes.length ? `
        <div class="drink-info-row">
          <strong>Garnish</strong>${drink.garnishes.join(", ")}
        </div>` : ''}
    </div>
  `;
}
