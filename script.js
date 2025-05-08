
let cards = [];
let filteredCards = [];
let currentCard = null;
let currentQuestionIndex = 0;
let cardIndex = 0;
let selectedDifficulty = "medium";
let selectedSections = [];

// Utility
function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

// Load cards and generate section list
async function loadCards() {
  const res = await fetch("data/cards.json");
  cards = await res.json();

  const uniqueSections = [...new Set(cards.map(card => card.section))];
  const sectionContainer = document.getElementById("section-options");

  uniqueSections.forEach(section => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = section;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(section));
    sectionContainer.appendChild(label);
    sectionContainer.appendChild(document.createElement("br"));
  });

  document.getElementById("start-quiz-btn").onclick = initializeQuiz;
}

// Collect selections and start quiz
function initializeQuiz() {
  const checkedBoxes = Array.from(document.querySelectorAll("#section-options input:checked"));
  selectedSections = checkedBoxes.map(cb => cb.value);

  const difficultyRadio = document.querySelector("input[name='difficulty']:checked");
  if (difficultyRadio) {
    selectedDifficulty = difficultyRadio.value;
  }

  filteredCards = cards.filter(card => selectedSections.includes(card.section));
  filteredCards = shuffleArray(filteredCards);
  cardIndex = 0;

  document.getElementById("setup-screen").style.display = "none";
  document.querySelector(".card-image").style.display = "block";
  document.querySelector(".question").style.display = "block";
  document.getElementById("options-container").style.display = "block";

  loadNextCard();
}

function loadNextCard() {
  if (cardIndex >= filteredCards.length) {
    document.getElementById("question-text").innerText = "🎉 You've completed all selected drinks!";
    document.getElementById("drink-image").style.display = "none";
    document.getElementById("options-container").innerHTML = "";
    return;
  }

  currentCard = filteredCards[cardIndex];
  currentQuestionIndex = 0;

  document.getElementById("drink-image").src = currentCard.image;
  document.getElementById("question-text").innerText = `${currentCard.drink} Quiz`;

  generateQuizForCard(currentCard);
}

function generateQuizForCard(card) {
  const questions = [];

  const questionMap = {
    "main": q => q.question.toLowerCase().includes("main alcohol"),
    "ingredients": q => q.question.toLowerCase().includes("ingredients"),
    "amounts": q => q.question.toLowerCase().includes("how many ounces"),
    "garnish": q => q.question.toLowerCase().includes("garnish")
  };

  const main = card.questions.find(q => questionMap.main(q));
  if (main) questions.push(main);

  const ingredients = card.questions.find(q => questionMap.ingredients(q) && q.difficulty === selectedDifficulty);
  if (ingredients) questions.push(ingredients);

  const amounts = card.questions.filter(q => questionMap.amounts(q));
  questions.push(...amounts);

  const garnish = card.questions.find(q => questionMap.garnish(q) && q.difficulty === selectedDifficulty);
  if (garnish) questions.push(garnish);

  currentCard.questions = questions;
  displayQuestion();
}

function displayQuestion() {
  const questionObj = currentCard.questions[currentQuestionIndex];
  const container = document.getElementById("options-container");
  container.innerHTML = "";

  const drinkImage = document.getElementById("drink-image");
  if (questionObj.type === "multiple-select") {
    drinkImage.style.display = "none";
  } else {
    drinkImage.style.display = "block";
  }

  const q = document.createElement("h3");
  q.innerText = questionObj.question;
  container.appendChild(q);

  if (questionObj.type === "multiple-choice") {
    const isMain = questionObj.question.toLowerCase().includes("main alcohol");
    const isGarnish = questionObj.question.toLowerCase().includes("garnish");

    const pool = cards
      .filter(c => c.drink !== currentCard.drink)
      .flatMap(c => c.questions.filter(q =>
        q.type === "multiple-choice" &&
        (
          (isMain && q.question.toLowerCase().includes("main alcohol")) ||
          (isGarnish && q.question.toLowerCase().includes("garnish")) ||
          (!isMain && !isGarnish && q.question.toLowerCase().includes("ingredients"))
        )
      ).map(q => q.answer));

    const options = shuffleArray([...pool.filter(a => a !== questionObj.answer).slice(0, 3), questionObj.answer]);

    options.forEach(option => {
      const btn = document.createElement("button");
      btn.innerText = option;
      btn.onclick = () => checkAnswer(option, questionObj.answer);
      container.appendChild(btn);
    });
  } else if (questionObj.type === "free-response") {
    const input = document.createElement("input");
    input.type = "text";
    input.id = "user-answer";
    container.appendChild(input);

    const btn = document.createElement("button");
    btn.innerText = "Submit";
    btn.onclick = () => {
      const val = document.getElementById("user-answer").value.trim();
      checkAnswer(val, questionObj.answer);
    };
    container.appendChild(btn);
  } else if (questionObj.type === "multiple-select") {
    const correctAnswers = questionObj.answer;
    const isGarnish = questionObj.question.toLowerCase().includes("garnish");

    const pool = cards
      .filter(c => c !== currentCard)
      .flatMap(c =>
        c.questions.filter(q =>
          q.type === "multiple-select" &&
          (isGarnish ? q.question.toLowerCase().includes("garnish") : q.question.toLowerCase().includes("ingredient"))
        ).flatMap(q => q.answer)
      );

    const uniqueDistractors = [...new Set(pool)].filter(a => !correctAnswers.includes(a));
    const distractors = shuffleArray(uniqueDistractors).slice(0, Math.max(4, 9 - correctAnswers.length));
    const allOptions = shuffleArray([...correctAnswers, ...distractors]);

    allOptions.forEach(option => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = option;
      checkbox.className = "multi-option";
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(option));
      container.appendChild(label);
      container.appendChild(document.createElement("br"));
    });

    const btn = document.createElement("button");
    btn.innerText = "Submit";
    btn.onclick = () => {
      const selected = Array.from(document.querySelectorAll(".multi-option:checked")).map(c => c.value);
      checkMultiAnswer(selected, correctAnswers);
    };
    container.appendChild(btn);
  }
}

function checkAnswer(selected, correct) {
  if (Array.isArray(correct)) {
    correct = correct.join(", ");
  }
  
  const normalize = str => str.toLowerCase().split(',').map(s => s.trim()).sort().join(',');
  if (normalize(selected) === normalize(correct)) {

    alert("✅ Correct!");
  } else {
    alert(`❌ Incorrect. Correct answer: ${correct}`);
  }
  nextQuestion();
}

function checkMultiAnswer(selectedArray, correctArray) {
  const correct = correctArray.map(s => s.toLowerCase()).sort().join(",");
  const selected = selectedArray.map(s => s.toLowerCase()).sort().join(",");
  if (selected === correct) {
    alert("✅ Correct!");
  } else {
    alert(`❌ Incorrect. Correct answers: ${correctArray.join(", ")}`);
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
