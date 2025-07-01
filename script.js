let crewData = [];
let questionData = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedCrew = {};
let userAnswers = [];
let quizType = '';

function loadCrew() {
  const crewIdInput = document.getElementById("crew-id");
  let crewId = crewIdInput.value.trim().toUpperCase(); // Convert to uppercase
  const errorElement = document.getElementById("crew-id-error");

  // Validate Crew ID: only letters and numbers
  const isValidCrewId = /^[A-Z0-9]+$/.test(crewId);

  if (!crewId) {
    errorElement.textContent = "Crew ID cannot be empty!";
    errorElement.style.display = "block";
    crewIdInput.focus();
    return;
  }

  if (!isValidCrewId) {
    errorElement.textContent = "Crew ID must contain only letters and numbers!";
    errorElement.style.display = "block";
    crewIdInput.focus();
    return;
  }

  // Clear error message if valid
  errorElement.style.display = "none";
  crewIdInput.value = crewId; // Update input to show uppercase

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
        // Show dialog for new crew
        document.getElementById("dialog-crew-id").value = crewId;
        document.getElementById("new-crew-dialog").style.display = "block";
        document.getElementById("overlay").style.display = "block";
      }
    },
    error: function () {
      alert("Error loading CREW.csv file!");
    }
  });
}

function submitNewCrew() {
  const crewId = document.getElementById("dialog-crew-id").value;
  const crewName = document.getElementById("dialog-crew-name").value.trim();
  const crewDesg = document.getElementById("dialog-crew-desg").value.trim();
  const cliName = document.getElementById("dialog-cli-name").value.trim();
  const hq = document.getElementById("dialog-hq").value.trim();

  if (!crewName || !crewDesg || !cliName || !hq) {
    alert("All fields are required!");
    return;
  }

  selectedCrew = {
    CREWID: crewId,
    "CREW NAME": crewName,
    DESG: crewDesg,
    "CLI NAME": cliName,
    HQ: hq
  };

  document.getElementById("crew-name").textContent = crewName;
  document.getElementById("crew-desg").textContent = crewDesg;
  document.getElementById("cli-name").textContent = cliName;
  document.getElementById("hq").textContent = hq;
  document.getElementById("crew-details").style.display = "block";
  document.getElementById("new-crew-dialog").style.display = "none";
  document.getElementById("overlay").style.display = "none";
}

function startQuiz(type) {
  quizType = type;
  const csvFile = type === 'USR' ? 'USR.csv' : 'Automatic.csv';
  const questionCount = type === 'USR' ? 10 : 20;

  Papa.parse(csvFile, {
    download: true,
    header: true,
    complete: function (results) {
      questionData = shuffleArray(results.data).slice(0, questionCount);
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
      alert(`Error loading ${csvFile} file!`);
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

  document.getElementById("answer-feedback").innerHTML = "";
  document.getElementById("next-btn").style.display = "none";
  document.getElementById("submit-btn").style.display = "none";

  const progress = document.getElementById("progress");
  progress.style.width = `${((currentQuestionIndex + 1) / questionData.length) * 100}%`;
}

function speak(text) {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Function to get voices with a Promise
  function getVoices() {
    return new Promise(resolve => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        resolve(voices);
        return;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };
    });
  }

  getVoices().then(voices => {
    console.log("Available voices:", voices.map(v => ({ name: v.name, lang: v.lang })));

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(voice => voice.lang.includes('hi-IN')) || voices.find(voice => voice.lang.includes('hi'));
    utterance.rate = 0.9; // Slower for Hindi
    utterance.pitch = 0.8; // Deeper for Hindi

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(`Speaking "${text}" with voice: ${selectedVoice.name} (${selectedVoice.lang}), rate: ${utterance.rate}, pitch: ${utterance.pitch}`);
    } else {
      console.warn(`No Hindi voice found for text: "${text}". Using default voice.`);
    }

    window.speechSynthesis.speak(utterance);
  }).catch(err => {
    console.error("Error loading voices:", err);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    console.log(`Fallback: Speaking "${text}" with default voice, rate: 0.9, pitch: 0.8`);
    window.speechSynthesis.speak(utterance);
  });
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
    explanation: q["Detailed Answer in English"],
    explanationHindi: q["Detailed Answer in Hindi"]
  });

  // Speak "Correct Answer" or "Wrong Answer" in Hindi, followed by the Hindi explanation
  const feedbackText = isCorrect 
    ? `सही जवाब! ${q["Detailed Answer in Hindi"]}` 
    : `गलत जवाब! ${q["Detailed Answer in Hindi"]}`;
  speak(feedbackText);

  // Display feedback with dark blue subheadings
  let feedbackHTML = isCorrect 
    ? `<span>😊 Correct!</span><br><strong style="color: #1e3a8a;">English:</strong> ${q["Detailed Answer in English"]}<br><strong style="color: #1e3a8a;">Hindi:</strong> ${q["Detailed Answer in Hindi"]}`
    : `<span>😔 Wrong!</span><br><strong style="color: #1e3a8a;">English:</strong> ${q["Detailed Answer in English"]}<br><strong style="color: #1e3a8a;">Hindi:</strong> ${q["Detailed Answer in Hindi"]}`;

  if (isCorrect) {
    btn.classList.add("correct");
    score++;
  } else {
    btn.classList.add("wrong");
  }

  document.getElementById("answer-feedback").innerHTML = feedbackHTML;

  const buttons = document.querySelectorAll("#options button");
  buttons.forEach(b => {
    b.disabled = true;
    if (b.textContent.trim() === correctOptionText) {
      b.classList.add("correct");
    }
  });

  if (currentQuestionIndex === questionData.length - 1) {
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

  const percentage = (score / questionData.length) * 100;

  let remark, feedback;
  if (score >= questionData.length * 0.9) {
    remark = "🌟 Outstanding Performance";
    feedback = "You have demonstrated exceptional knowledge. Keep up the excellent work!";
  } else if (score >= questionData.length * 0.75) {
    remark = "👍 Very Good";
    feedback = "Great effort! Review the incorrect answers to aim for outstanding next time.";
  } else if (score >= questionData.length * 0.6) {
    remark = "🙂 Satisfactory";
    feedback = "Good attempt, but there's room for improvement. Focus on the areas where you made mistakes.";
  } else if (score >= questionData.length * 0.4) {
    remark = "⚠️ Needs Improvement";
    feedback = "You need to study more. Review the explanations for incorrect answers to improve.";
  } else {
    remark = "🚨 Poor Performance";
    feedback = "Significant improvement is needed. Please revisit the material and try again.";
  }

  let analysisHTML = `
    <p style="font-size: 24px; font-weight: 600;">Score: ${score}/${questionData.length} (${percentage.toFixed(2)}%)</p>
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
        <strong>Explanation (English):</strong> ${ans.explanation}<br>
        <strong>Explanation (Hindi):</strong> ${ans.explanationHindi}
      </li>
    `;
  });

  analysisHTML += `
    </ul>
    <button onclick="backToQuiz()">Back to Quiz Page</button>
  `;

  document.getElementById("result-section").innerHTML = analysisHTML;

  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const payload = {
    CREWID: selectedCrew["CREWID"],
    "CREW NAME": selectedCrew["CREW NAME"],
    DESG: selectedCrew["DESG"],
    "CLI NAME": selectedCrew["CLI NAME"],
    HQ: selectedCrew["HQ"],
    "CREW SCORE": score,
    TYPE: quizType,
    "TIMESTAMP": timestamp
  };

  fetch("https://script.google.com/macros/s/AKfycbwoX2DzwPzMdNfqctMShgwGbFXHg-Uu2_aHmxkr_TyGRrFVpHpwVGj6lGgZb2OCfpYV/exec", {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function backToQuiz() {
  window.location.href = "index.html";
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}