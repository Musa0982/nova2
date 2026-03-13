const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = "YOUR_GROQ_API_KEY"; // replace this with your key from console.groq.com

let messages = [];
let chatHistory = [];
let currentChatId = null;
let isTyping = false;

const robot = document.getElementById("nova-robot");
const statusEl = document.getElementById("robot-status");
const chestLight = document.getElementById("chest-light");
const messagesEl = document.getElementById("messages");
const input = document.getElementById("chat-input");
const robotArea = document.getElementById("robot-area");
const welcomeText = document.getElementById("welcome-text");
const sendBtn = document.getElementById("send-btn");

function setRobotState(state) {
  robot.className = "robot robot-" + state;
  const states = { idle: "ready to chat", thinking: "thinking...", talking: "talking..." };
  statusEl.textContent = states[state] || "ready to chat";
  const colors = { idle: "#94A3B8", thinking: "#F59E0B", talking: "#22C55E" };
  chestLight.setAttribute("fill", colors[state] || "#94A3B8");
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function suggest(text) {
  input.value = text;
  sendMessage();
}

function appendMsg(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  const name = role === "bot" ? "Nova" : "You";
  const avatarText = role === "bot" ? "N" : "M";
  div.innerHTML = `
    <div class="msg-avatar">${avatarText}</div>
    <div class="msg-content">
      <div class="msg-name">${name}</div>
      <div class="bubble">${formatText(text)}</div>
    </div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function formatText(text) {
  return text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/`([^`]+)`/g,"<code style='background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:0.85em'>$1</code>")
    .replace(/\n/g,"<br>");
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "msg bot"; div.id = "typing-msg";
  div.innerHTML = `<div class="msg-avatar">N</div><div class="msg-content"><div class="msg-name">Nova</div><div class="typing-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById("typing-msg");
  if (el) el.remove();
}

function compactRobot() {
  robotArea.classList.add("compact");
}

function newChat() {
  if (messages.length > 0) {
    const firstMsg = messages.find(m => m.role === "user");
    if (firstMsg) {
      const id = Date.now();
      chatHistory.unshift({ id, title: firstMsg.content.slice(0, 40), messages: [...messages] });
      renderHistory();
    }
  }
  messages = [];
  messagesEl.innerHTML = "";
  input.value = "";
  robotArea.classList.remove("compact");
  setRobotState("idle");
  currentChatId = null;
}

function renderHistory() {
  const list = document.getElementById("history-list");
  list.innerHTML = "";
  chatHistory.slice(0, 20).forEach(chat => {
    const div = document.createElement("div");
    div.className = "history-item" + (chat.id === currentChatId ? " active" : "");
    div.textContent = chat.title + "...";
    div.onclick = () => loadChat(chat.id);
    list.appendChild(div);
  });
}

function loadChat(id) {
  const chat = chatHistory.find(c => c.id === id);
  if (!chat) return;
  messages = [...chat.messages];
  messagesEl.innerHTML = "";
  messages.forEach(m => appendMsg(m.role === "assistant" ? "bot" : "user", m.content));
  currentChatId = id;
  compactRobot();
  renderHistory();
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text || isTyping) return;
  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;
  isTyping = true;

  if (messages.length === 0) compactRobot();

  appendMsg("user", text);
  messages.push({ role: "user", content: text });

  setRobotState("thinking");
  showTyping();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        messages: [
          { role: "system", content: "You are Nova, a friendly, smart, and helpful AI assistant. You can help with anything — coding, writing, math, general knowledge, creative tasks, and more. Be concise but thorough. Use markdown sparingly." },
          ...messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
        ]
      })
    });

    const data = await res.json();
    removeTyping();

    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";
    messages.push({ role: "assistant", content: reply });

    setRobotState("talking");
    appendMsg("bot", reply);
    setTimeout(() => setRobotState("idle"), 2500);

  } catch (err) {
    removeTyping();
    setRobotState("idle");
    appendMsg("bot", "Connection error. Make sure the API key is configured correctly.");
  } finally {
    isTyping = false;
    sendBtn.disabled = false;
    input.focus();
  }
}
