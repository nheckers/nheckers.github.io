let cards = [];
let currentCard = null;
let currentQuestionIndex = 0;

// Load all cards from cards.json
async function loadCards() {
  const res = await fetch("data/cards.json");
  cards = await res.json();

  // Pick a random drink (card)
  const randomIndex = Math.floor(Math.random() * cards.length);
  currentCard = cards[randomIndex];

  // Set drink image and name
  document.getElementById("drink-image").src = currentCard.image;
  document.getElementById("question-text").innerText = `${currentCard.drink} Quiz`;

  // Display the first question
  displayQuestion();
}

function displayQuestion() {
  const questionObj = currentCard.questions[currentQuestionIndex];
  const container = document.getElementById("options-container");
  container.innerHTML = ""; // Clear previous content

  const q = document.createElement("h3");
  q.innerText = questionObj.question;
  container.appendChild(q);

  if (questionObj.type === "multiple-choice") {
    // Generate randomized options (include correct + pull from other drinks)
    const allAnswers = cards
      .filter(c => c.drink !== currentCard.drink)
      .map(c => {
        const mc = c.questions.find(q => q.type === "multiple-choice");
        return mc?.answer;
      })
      .filter(Boolean);

    const randomIncorrects = allAnswers.sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [...randomIncorrects, questionObj.answer].sort(() => 0.5 - Math.random());

    options.forEach((option) => {
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
    questionObj.options?.forEach((option) => {
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
      checkMultiAnswer(selected, questionObj.answer);
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
    document.getElementById("options-container").innerHTML = "<h2>🎉 Quiz complete!</h2>";
  }
}

window.onload = loadCards;
