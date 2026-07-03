import { GeminiAPI } from "./api.js";
import { UIManager } from "./ui.js";
import { ChatStorage } from "./storage.js";
import { CONFIG } from "./config.js";
import { fileToBase64, debounce } from "./utils.js";

class App {
  constructor() {
    this.api = new GeminiAPI();
    this.ui = new UIManager();
    this.storage = new ChatStorage();
    this.currentMessages = [];
    this.uploadedImages = [];

    this.initDOM();
    this.bindEvents();
    this.loadInitialState();
  }

  initDOM() {
    this.input = document.getElementById("chat-input");
    this.sendBtn = document.getElementById("send-btn");
    this.stopBtn = document.getElementById("stop-btn");
    this.fileUpload = document.getElementById("file-upload");
    this.imgPreviewContainer = document.getElementById(
      "image-preview-container",
    );
    this.themeToggle = document.getElementById("theme-toggle");

    // Responsive Mobile Elements
    this.sidebar = document.getElementById("sidebar");
    this.sidebarOverlay = document.getElementById("sidebar-overlay");
    this.openSidebarBtn = document.getElementById("open-sidebar-btn");
    this.closeSidebarBtn = document.getElementById("close-sidebar-btn");
  }

  bindEvents() {
    // Chat Submission
    this.sendBtn.addEventListener("click", () => this.handleSend());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Auto-resize textarea
    this.input.addEventListener("input", () => {
      this.input.style.height = "auto";
      this.input.style.height = this.input.scrollHeight + "px";
      this.sendBtn.disabled =
        this.input.value.trim() === "" && this.uploadedImages.length === 0;
    });

    // Stop Generation
    this.stopBtn.addEventListener("click", () => {
      this.api.stopGeneration();
      this.ui.removeLoading();
      this.toggleButtons(false);
    });

    // Image Upload
    this.fileUpload.addEventListener("change", (e) =>
      this.handleImageUpload(e),
    );

    // Prompt Suggestions
    document.querySelectorAll(".prompt-suggestion").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.input.value = btn.querySelector("p").innerText;
        this.handleSend();
      });
    });

    // Sidebar Actions
    document
      .getElementById("new-chat-btn")
      .addEventListener("click", () => this.startNewChat());
    document.getElementById("clear-chats-btn").addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all history?")) {
        this.storage.clearAll();
        this.startNewChat();
      }
    });

    // Theme Toggle
    this.themeToggle.addEventListener("click", () => {
      const html = document.documentElement;
      const isDark = html.getAttribute("data-theme") === "dark";
      html.setAttribute("data-theme", isDark ? "light" : "dark");
      this.themeToggle.innerHTML = isDark
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
      localStorage.setItem("theme", isDark ? "light" : "dark");
    });

    // ====== MOBILE RESPONSIVE LOGIC ======
    const openMenu = () => {
      this.sidebar.classList.remove("-translate-x-full");
      this.sidebarOverlay.classList.remove("hidden");
    };

    const closeMenu = () => {
      this.sidebar.classList.add("-translate-x-full");
      this.sidebarOverlay.classList.add("hidden");
    };

    this.openSidebarBtn.addEventListener("click", openMenu);
    this.closeSidebarBtn.addEventListener("click", closeMenu);
    this.sidebarOverlay.addEventListener("click", closeMenu);
    // =====================================

    // Search Debounce
    const searchInput = document.getElementById("search-chat");
    searchInput.addEventListener(
      "input",
      debounce((e) => this.refreshHistoryList(e.target.value), 300),
    );
  }

  loadInitialState() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.themeToggle.innerHTML =
      savedTheme === "dark"
        ? '<i class="fa-solid fa-moon"></i>'
        : '<i class="fa-solid fa-sun"></i>';
    this.refreshHistoryList();
  }

  async handleImageUpload(e) {
    const files = Array.from(e.target.files);

    for (const file of files) {
      if (!CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(
          `File too large: ${file.name} (Max ${CONFIG.MAX_FILE_SIZE_MB}MB)`,
        );
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        this.uploadedImages.push(base64);
        this.renderImagePreviews();
        this.sendBtn.disabled = false;
      } catch (err) {
        console.error("Image processing error", err);
      }
    }
    e.target.value = "";
  }

  renderImagePreviews() {
    if (this.uploadedImages.length > 0) {
      this.imgPreviewContainer.classList.remove("hidden");
      this.imgPreviewContainer.innerHTML = this.uploadedImages
        .map(
          (img, idx) => `
                <div class="relative inline-block">
                    <img src="${img}" class="h-16 w-16 object-cover rounded-md border border-gray-600">
                    <button class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs remove-img-btn" data-index="${idx}">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `,
        )
        .join("");

      this.imgPreviewContainer
        .querySelectorAll(".remove-img-btn")
        .forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.dataset.index);
            this.uploadedImages.splice(idx, 1);
            this.renderImagePreviews();
          });
        });
    } else {
      this.imgPreviewContainer.classList.add("hidden");
    }
  }

  async handleSend() {
    const text = this.input.value.trim();
    if (!text && this.uploadedImages.length === 0) return;

    const imagesToProcess = [...this.uploadedImages];
    this.ui.appendUserMessage(text, imagesToProcess);

    this.input.value = "";
    this.input.style.height = "auto";
    this.uploadedImages = [];
    this.renderImagePreviews();
    this.toggleButtons(true);
    this.ui.showLoading();

    this.currentMessages.push({ role: "user", text, images: imagesToProcess });

    try {
      const response = await this.api.generateResponse(text, imagesToProcess);
      await this.ui.appendAIMessage(response);

      this.currentMessages.push({ role: "model", text: response });
      this.storage.saveChat(this.currentMessages);
      this.refreshHistoryList();
    } catch (error) {
      this.ui.showError(error.message);
    } finally {
      this.toggleButtons(false);
    }
  }

  toggleButtons(isGenerating) {
    if (isGenerating) {
      this.sendBtn.classList.add("hidden");
      this.stopBtn.classList.remove("hidden");
      this.input.disabled = true;
    } else {
      this.sendBtn.classList.remove("hidden");
      this.stopBtn.classList.add("hidden");
      this.input.disabled = false;
      this.input.focus();
    }
  }

  startNewChat() {
    this.ui.clearChat();
    this.ui.showWelcomeScreen();
    this.currentMessages = [];
    this.storage.setCurrentChat(null);
    this.refreshHistoryList();

    // Auto-close sidebar on mobile after clicking New Chat
    if (window.innerWidth < 768) {
      this.sidebar.classList.add("-translate-x-full");
      this.sidebarOverlay.classList.add("hidden");
    }
  }

  loadChat(chatId) {
    const chat = this.storage.getChat(chatId);
    if (chat) {
      this.storage.setCurrentChat(chatId);
      this.currentMessages = chat.messages;
      this.ui.clearChat();

      chat.messages.forEach((msg) => {
        if (msg.role === "user") {
          this.ui.appendUserMessage(msg.text, msg.images || []);
        } else {
          this.ui.appendAIMessage(msg.text);
        }
      });
      this.refreshHistoryList();

      // Auto-close sidebar on mobile after selecting a chat
      if (window.innerWidth < 768) {
        this.sidebar.classList.add("-translate-x-full");
        this.sidebarOverlay.classList.add("hidden");
      }
    }
  }

  deleteChat(chatId) {
    this.storage.deleteChat(chatId);
    if (this.storage.currentChatId === null) {
      this.startNewChat();
    } else {
      this.refreshHistoryList();
    }
  }

  refreshHistoryList(searchQuery = "") {
    const chats = this.storage
      .getAllChats()
      .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    this.ui.renderHistoryList(
      chats,
      this.storage.currentChatId,
      (id) => this.loadChat(id),
      (id) => this.deleteChat(id),
    );
  }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  window.chatApp = new App();
});
