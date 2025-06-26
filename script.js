let crewData = [];
let questionData = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedCrew = {};
let userAnswers = [];

function loadCrew() {
  const crewIdInput = document.getElementById("crew-id");
  const crewId = crewIdInput.value.trim();
  const errorElement = document.getElementById("crew-id-error");

  // Validate Crew ID: only capital letters and numbers
  const isValidCrewId = /^[A-Z0-9]+$/.test(crewId);

  if (!crewId) {
    errorElement.textContent = "Crew ID cannot be empty!";
    errorElement.style.display = "block";
    crewIdInput.focus();
    return;
  }

  if (!isValidCrewId) {
    errorElement.textContent = "Crew ID must contain only capital letters and numbers!";
    errorElement.style.display = "block";
    crewIdInput.focus();
    return;
  }

  // Clear error message if valid
  errorElement.style.display = "none";

  Papa.parse("CREW.csv", {
    download: true,
    header: true,
    complete: function (results) {
      crewData = results.data;
      const crew = crewData.find(c => c.CREWID === crewId);
      if (crew) {
        selectedCrew = crew;
        document.getElementById("crew-name").textContent = crew["CREW NAME"];
        document.getElementById("crew-desg").textContent = crew["DESG"];
        document.getElementById("cli-name").textContent = crew["CLI NAME"];
        document.getElementById("hq").textContent = crew["HQ"];
        document.getElementById("crew-details").style.display = "block";
      } else {
        alert("Crew ID not found!");
      }
    },
    error: function () {
      alert("Error loading CREW.csv file!");
    }
  });
}

function startQuiz() {
  Papa.parse("Automatic.csv", {
    download: true,
    header: true,
    complete: function (results) {
      questionData = shuffleArray(results.data).slice(0, 20);
      document.getElementById("crew-section").style.display = "none";
      document.getElementById("quiz-section").style.display = "block";
      const quizSection = document.getElementById("quiz-section");
      const progressBar = document.createElement("div");
      progressBar.id = "progress-bar";
      progressBar.innerHTML = '<div id="progress"></div>';
      quizSection.insertBefore(progressBar, quizSection.firstChild);
      showQuestion();
    },
    error: function () {
      alert("Error loading Automatic.csv file!");
    }
  });
}

function showQuestion() {
  const q = questionData[currentQuestionIndex];
  document.getElementById("question-text").textContent = `${currentQuestionIndex + 1}. ${q["Question"]}`;
  
  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  ["A", "B", "C", "D"].forEach(letter => {
    const btn = document.createElement("button");
    btn.textContent = q[`Option ${letter}`];
    btn.onclick = () => handleAnswer(q, btn, letter);
    optionsDiv.appendChild(btn);
  });

  document.getElementById("answer-feedback").textContent = "";
  document.getElementById("next-btn").style.display = "none";
  document.getElementById("submit-btn").style.display = "none";

  const progress = document.getElementById("progress");
  progress.style.width = `${((currentQuestionIndex + 1) / 20) * 100}%`;
}

function handleAnswer(q, btn, letter) {
  const selectedOptionText = btn.textContent.trim();
  const correctOptionText = q["Correct Answer"].trim();

  const isCorrect = selectedOptionText === correctOptionText;
  userAnswers.push({
    question: q["Question"],
    selected: selectedOptionText,
    correct: correctOptionText,
    isCorrect: isCorrect,
    explanation: q["Detailed Answer"]
  });

  if (isCorrect) {
    btn.classList.add("correct");
    document.getElementById("answer-feedback").textContent = "✅ Correct! " + q["Detailed Answer"];
    score++;
  } else {
    btn.classList.add("wrong");
    document.getElementById("answer-feedback").textContent = "❌ Wrong! " + q["Detailed Answer"];
  }

  const buttons = document.querySelectorAll("#options button");
  buttons.forEach(b => {
    b.disabled = true;
    if (b.textContent.trim() === correctOptionText) {
      b.classList.add("correct");
    }
  });

  if (currentQuestionIndex === 19) {
    document.getElementById("submit-btn").style.display = "inline-block";
  } else {
    document.getElementById("next-btn").style.display = "inline-block";
  }
}

function nextQuestion() {
  currentQuestionIndex++;
  showQuestion();
}

function submitQuiz() {
  document.getElementById("quiz-section").style.display = "none";
  document.getElementById("result-section").style.display = "block";

  const percentage = (score / 20) * 100;

  let remark, feedback;
  if (score >= 18) {
    remark = "🌟 Outstanding Performance";
    feedback = "You have demonstrated exceptional knowledge. Keep up the excellent work!";
  } else if (score >= 15) {
    remark = "👍 Very Good";
    feedback = "Great effort! Review the incorrect answers to aim for outstanding next time.";
  } else if (score >= 12) {
    remark = "🙂 Satisfactory";
    feedback = "Good attempt, but there's room for improvement. Focus on the areas where you made mistakes.";
  } else if (score >= 8) {
    remark = "⚠️ Needs Improvement";
    feedback = "You need to study more. Review the explanations for incorrect answers to improve.";
  } else {
    remark = "🚨 Poor Performance";
    feedback = "Significant improvement is needed. Please revisit the material and try again.";
  }

  let analysisHTML = `
    <p style="font-size: 24px; font-weight: 600;">Score: ${score}/20 (${percentage.toFixed(2)}%)</p>
    <p style="font-size: 20px; color: #3b82f6;">${remark}</p>
    <p style="margin-bottom: 20px;">${feedback}</p>
    <h4>Answer Summary:</h4>
    <ul style="text-align: left; list-style: none; padding: 0;">
  `;

  userAnswers.forEach((ans, idx) => {
    analysisHTML += `
      <li style="margin: 10px 0; padding: 10px; border-radius: 8px; background: ${ans.isCorrect ? '#dcfce7' : '#fee2e2'};">
        <strong>Question ${idx + 1}:</strong> ${ans.question}<br>
        <strong>Your Answer:</strong> ${ans.selected} (${ans.isCorrect ? 'Correct' : 'Incorrect'})<br>
        <strong>Correct Answer:</strong> ${ans.correct}<br>
        <strong>Explanation:</strong> ${ans.explanation}
      </li>
    `;
  });

  analysisHTML += '</ul>';

  document.getElementById("result-section").innerHTML = analysisHTML;

  const payload = {
    CREWID: selectedCrew["CREWID"],
    "CREW NAME": selectedCrew["CREW NAME"],
    DESG: selectedCrew["DESG"],
    "CLI NAME": selectedCrew["CLI NAME"],
    HQ: selectedCrew["HQ"],
    "CREW SCORE": score,
    "PERCENTAGE": percentage.toFixed(2)
  };

  fetch("https://script.google.com/macros/s/AKfycbystGGH_m6SBMUlpbOrjLclMnF7wSNtB14mGZqW2QA0z8Q4qJFoh0Sy6UM6mBo1iGXS/exec", {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}