import { MarkdownParser } from "./markdown.js";

export class UIManager {
  constructor() {
    this.chatContainer = document.getElementById("chat-container");
    this.welcomeScreen = document.getElementById("welcome-screen");
    this.scrollBtn = document.getElementById("scroll-bottom-btn");
    this.isTyping = false;

    this.setupScrollListener();
  }

  setupScrollListener() {
    this.chatContainer.addEventListener("scroll", () => {
      const { scrollTop, scrollHeight, clientHeight } = this.chatContainer;
      if (scrollHeight - scrollTop - clientHeight > 100) {
        this.scrollBtn.classList.remove("hidden");
      } else {
        this.scrollBtn.classList.add("hidden");
      }
    });

    this.scrollBtn.addEventListener("click", () => this.scrollToBottom());
  }

  scrollToBottom() {
    this.chatContainer.scrollTo({
      top: this.chatContainer.scrollHeight,
      behavior: "smooth",
    });
  }

  hideWelcomeScreen() {
    if (this.welcomeScreen) {
      this.welcomeScreen.style.display = "none";
    }
  }

  showWelcomeScreen() {
    if (this.welcomeScreen) {
      this.welcomeScreen.style.display = "flex";
    }
  }

  clearChat() {
    const messages = this.chatContainer.querySelectorAll(".message-wrapper");
    messages.forEach((msg) => msg.remove());
  }

  appendUserMessage(text, images = []) {
    this.hideWelcomeScreen();
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper flex justify-end mb-6 animate-fade-in";

    let imagesHtml = "";
    if (images.length > 0) {
      imagesHtml = `<div class="flex gap-2 mb-2 flex-wrap">
                ${images.map((img) => `<img src="${img}" class="w-24 h-24 object-cover rounded-md border border-gray-600">`).join("")}
            </div>`;
    }

    wrapper.innerHTML = `
            <div class="user-message p-4 rounded-2xl rounded-tr-sm message-bubble">
                ${imagesHtml}
                <p class="whitespace-pre-wrap">${this.escapeHTML(text)}</p>
            </div>
        `;
    this.chatContainer.appendChild(wrapper);
    this.scrollToBottom();
  }

  showLoading() {
    const wrapper = document.createElement("div");
    wrapper.id = "loading-indicator";
    wrapper.className =
      "message-wrapper flex justify-start mb-6 animate-fade-in";
    wrapper.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <i class="fa-solid fa-robot text-white text-sm"></i>
                </div>
                <div class="flex gap-1 bg-secondary p-4 rounded-2xl rounded-tl-sm border border-gray-700">
                    <span class="w-2 h-2 rounded-full bg-gray-400 typing-dot"></span>
                    <span class="w-2 h-2 rounded-full bg-gray-400 typing-dot"></span>
                    <span class="w-2 h-2 rounded-full bg-gray-400 typing-dot"></span>
                </div>
            </div>
        `;
    this.chatContainer.appendChild(wrapper);
    this.scrollToBottom();
  }

  removeLoading() {
    const loading = document.getElementById("loading-indicator");
    if (loading) loading.remove();
  }

  async appendAIMessage(text) {
    this.removeLoading();

    const wrapper = document.createElement("div");
    wrapper.className =
      "message-wrapper flex justify-start mb-6 animate-fade-in group";

    const avatar = `
            <div class="w-8 h-8 rounded-full bg-accent flex-shrink-0 flex items-center justify-center mt-2 mr-3">
                <i class="fa-solid fa-robot text-white text-sm"></i>
            </div>`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "ai-message p-2 message-bubble flex-1";

    const actionsDiv = document.createElement("div");
    actionsDiv.className =
      "flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity";
    actionsDiv.innerHTML = `
            <button class="text-gray-400 hover:text-white copy-msg-btn text-sm" aria-label="Copy response">
                <i class="fa-regular fa-copy"></i>
            </button>
        `;

    wrapper.innerHTML = avatar;
    wrapper.appendChild(contentDiv);

    // Appending to DOM before parsing to allow typing effect
    this.chatContainer.appendChild(wrapper);

    // Typing Effect Logic
    this.isTyping = true;
    const parsedHTML = MarkdownParser.parse(text);

    // Simulating character reveal for polished UX
    contentDiv.innerHTML = parsedHTML;
    // In a real typing effect over HTML, we would iterate text nodes.
    // For stability with code blocks, we fade in the parsed HTML directly
    // but reveal it gracefully.
    contentDiv.style.opacity = 0;

    await new Promise((r) => setTimeout(r, 100)); // slight delay
    contentDiv.style.transition = "opacity 0.5s ease-in";
    contentDiv.style.opacity = 1;

    contentDiv.appendChild(actionsDiv);
    this.scrollToBottom();
    this.setupCodeCopyButtons(wrapper);
    this.isTyping = false;
  }

  showError(message) {
    this.removeLoading();
    const wrapper = document.createElement("div");
    wrapper.className =
      "message-wrapper flex justify-center mb-6 animate-fade-in";
    wrapper.innerHTML = `
            <div class="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                <i class="fa-solid fa-triangle-exclamation"></i> ${this.escapeHTML(message)}
            </div>
        `;
    this.chatContainer.appendChild(wrapper);
    this.scrollToBottom();
  }

  setupCodeCopyButtons(container) {
    // Copy Code Blocks
    container.querySelectorAll(".copy-code-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const code = decodeURIComponent(e.currentTarget.dataset.code);
        await navigator.clipboard.writeText(code);

        const icon = e.currentTarget.querySelector("i");
        icon.className = "fa-solid fa-check text-green-400 animate-pop";
        setTimeout(() => {
          icon.className = "fa-regular fa-clipboard";
        }, 2000);
      });
    });

    // Copy entire message
    container.querySelectorAll(".copy-msg-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const messageText = container.querySelector(".markdown-body").innerText;
        await navigator.clipboard.writeText(messageText);

        const icon = e.currentTarget.querySelector("i");
        icon.className = "fa-solid fa-check text-green-400 animate-pop";
        setTimeout(() => {
          icon.className = "fa-regular fa-copy";
        }, 2000);
      });
    });
  }

  renderHistoryList(chats, currentChatId, onSelect, onDelete) {
    const list = document.getElementById("chat-history-list");
    list.innerHTML = "";

    if (chats.length === 0) {
      list.innerHTML =
        '<p class="text-gray-500 text-sm text-center mt-4">No recent chats</p>';
      return;
    }

    chats.forEach((chat) => {
      const div = document.createElement("div");
      div.className = `group flex items-center justify-between p-2 rounded-md mb-1 cursor-pointer transition-colors ${chat.id === currentChatId ? "bg-gray-700/50 text-white" : "hover:bg-gray-700/30 text-gray-400"}`;

      div.innerHTML = `
                <div class="flex items-center gap-2 overflow-hidden flex-1" data-id="${chat.id}">
                    <i class="fa-regular fa-message text-xs"></i>
                    <span class="truncate text-sm">${this.escapeHTML(chat.title)}</span>
                </div>
                <button class="delete-chat-btn opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity" data-id="${chat.id}" aria-label="Delete chat">
                    <i class="fa-regular fa-trash-can text-xs"></i>
                </button>
            `;

      div
        .querySelector(".flex-1")
        .addEventListener("click", () => onSelect(chat.id));
      div.querySelector(".delete-chat-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        onDelete(chat.id);
      });

      list.appendChild(div);
    });
  }

  escapeHTML(str) {
    return str.replace(
      /[&<>'"]/g,
      (tag) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[tag],
    );
  }
}
