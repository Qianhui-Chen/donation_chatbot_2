(function () {
  "use strict";

  const script = window.CHAT_SCRIPT;
  if (!script || !Array.isArray(script.messages)) throw new Error("Chat script is missing.");

  const messagesEl = document.querySelector("#messages");
  const form = document.querySelector("#composer");
  const input = document.querySelector("#message-input");
  const sendButton = document.querySelector("#send-button");
  const title = document.querySelector("#chat-title");
  const avatar = document.querySelector("#avatar");
  const organizationHeader = document.querySelector("#organization-header");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wordDelay = reduceMotion ? 0 : 25;
  const replyPause = 2000;
  let nextBotMessage = 0;
  let isWaiting = true;
  let hasEnded = false;

  title.textContent = script.title;
  avatar.textContent = script.avatar;
  organizationHeader.textContent = script.organizationHeader;
  document.title = script.title + " — FoodForAll";

  function scrollToLatest() {
    requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
  }

  function createMessage(kind, text, extraClass) {
    const row = document.createElement("div");
    row.className = "message-row " + kind + (extraClass ? " " + extraClass : "");
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text || "";
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToLatest();
    return { row, bubble };
  }

  function addMessage(kind, text, extraClass) {
    return createMessage(kind, text, extraClass).row;
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function addTypingIndicator() {
    const message = createMessage("bot", "");
    message.row.setAttribute("aria-label", "Chatbot is typing");
    message.bubble.innerHTML = '<span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>';
    return message;
  }

  function setComposerEnabled(enabled) {
    input.disabled = !enabled;
    sendButton.disabled = !enabled;
    input.placeholder = enabled ? "Type your response…" : "Please wait…";
    if (enabled) input.focus();
  }

  async function typeBotMessage(text) {
    const message = createMessage("bot", "");
    message.bubble.classList.add("is-typing");
    if (wordDelay === 0) {
      message.bubble.textContent = text;
    } else {
      const wordChunks = text.match(/\S+\s*/g) || [text];
      for (const wordChunk of wordChunks) {
        message.bubble.textContent += wordChunk;
        scrollToLatest();
        await wait(wordDelay);
      }
    }
    message.bubble.classList.remove("is-typing");
    scrollToLatest();
  }

  function startEndingSequence() {
    hasEnded = true;
    setComposerEnabled(false);
    input.placeholder = "This conversation has ended";
    let seconds = 5;
    const countdown = createMessage("system", "Conversation ending in 5 seconds");
    const timer = window.setInterval(() => {
      seconds -= 1;
      if (seconds > 0) {
        countdown.bubble.textContent = "Conversation ending in " + seconds + " second" + (seconds === 1 ? "" : "s");
        return;
      }
      window.clearInterval(timer);
      countdown.row.remove();
      addMessage("system", `conversation ends, please please copy this code and paste it to the questionnaire Chatbot code: ${script.code}`, "end");
    }, 1000);
  }

  async function showNextBotMessage() {
    isWaiting = true;
    setComposerEnabled(false);
    if (nextBotMessage > 0) {
      const typing = addTypingIndicator();
      await wait(replyPause);
      typing.row.remove();
    }
    await typeBotMessage(script.messages[nextBotMessage]);
    nextBotMessage += 1;
    isWaiting = false;
    if (nextBotMessage >= script.messages.length) {
      startEndingSequence();
    } else {
      setComposerEnabled(true);
    }
  }

  function showInitialMessage() {
    addMessage("bot", script.messages[0]);
    nextBotMessage = 1;
    isWaiting = false;
    setComposerEnabled(true);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isWaiting || hasEnded) return;
    const message = input.value.trim();
    if (!message) { input.focus(); return; }
    addMessage("user", message);
    input.value = "";
    input.style.height = "auto";
    void showNextBotMessage();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 130) + "px";
  });

  showInitialMessage();
})();
