
let cards = [];
let shuffledCards = [];
let currentCard = null;
let currentQuestionIndex = 0;
let cardIndex = 0;

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

async function loadCards() {
  const res = await fetch("data/cards.json");
  cards = await res.json();
  shuffledCards = shuffleArray(cards);
  cardIndex = 0;
  loadNextCard();
}

function loadNextCard() {
  if (cardIndex >= shuffledCards.length) {
    document.getElementById("question-text").innerText = "🎉 You've completed all drinks!";
    document.getElementById("drink-image").style.display = "none";
    document.getElementById("options-container").innerHTML = "";
    return;
  }

  currentCard = shuffledCards[cardIndex];
  currentQuestionIndex = 0;

  document.getElementById("drink-image").src = currentCard.image;
  document.getElementById("drink-image").style.display = "block";
  document.getElementById("question-text").innerText = `${currentCard.drink} Quiz`;

  displayQuestion();
}

function displayQuestion() {
  const questionObj = currentCard.questions[currentQuestionIndex];
  const container = document.getElementById("options-container");
  container.innerHTML = "";

  const q = document.createElement("h3");
  q.innerText = questionObj.question;
  container.appendChild(q);

  if (questionObj.type === "multiple-choice") {
    const allAnswers = cards
      .filter(c => c.drink !== currentCard.drink)
      .map(c => c.questions.find(q => q.type === 'multiple-choice')?.answer)
      .filter(Boolean);

    const neededIncorrects = 3;
    const randomIncorrects = allAnswers.sort(() => 0.5 - Math.random()).slice(0, neededIncorrects);
    const options = [...randomIncorrects, questionObj.answer].sort(() => 0.5 - Math.random());

    options.slice(0, 4).forEach((option) => {
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

    const distractorPool = cards
      .filter(card => card !== currentCard)
      .flatMap(card =>
        card.questions
          .filter(q => q.type === "multiple-select")
          .flatMap(q => q.answer)
      );

    const uniqueDistractors = [...new Set(distractorPool)].filter(
      val => !correctAnswers.includes(val)
    );

    let distractorCount = 4 - correctAnswers.length;
    if (distractorCount < 0) distractorCount = 0;

    let randomDistractors = uniqueDistractors
      .sort(() => 0.5 - Math.random())
      .slice(0, distractorCount);

    if (randomDistractors.length < distractorCount) {
      const fallback = ["Cherry", "Salt Rim", "Orange Peel", "Cucumber"].filter(
        val => !correctAnswers.includes(val)
      );
      randomDistractors = [...randomDistractors, ...fallback]
        .slice(0, distractorCount);
    }

    const allOptions = [...correctAnswers, ...randomDistractors]
      .sort(() => 0.5 - Math.random())
      .slice(0, 4);

    allOptions.forEach((option) => {
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
      const selected = Array.from(document.querySelectorAll(".multi-option:checked")).map(
        (c) => c.value
      );
      checkMultiAnswer(selected, correctAnswers);
    };
    container.appendChild(btn);
  }
}

function checkAnswer(selected, correct) {
  if (selected.toLowerCase() === correct.toLowerCase()) {
    alert("✅ Correct!");
  } else {
    alert(`❌ Incorrect. Correct answer: ${correct}`);
  }
  nextQuestion();
}

function checkMultiAnswer(selectedArray, correctArray) {
  const correct = correctArray.sort().join(",");
  const selected = selectedArray.sort().join(",");
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
