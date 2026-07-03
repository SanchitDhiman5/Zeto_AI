import { generateId } from "./utils.js";

export class ChatStorage {
  constructor() {
    this.storageKey = "ai_chat_history";
    this.currentChatId = null;
  }

  getAllChats() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  getChat(chatId) {
    return this.getAllChats().find((c) => c.id === chatId);
  }

  saveChat(messages, title = "New Conversation") {
    const chats = this.getAllChats();

    if (!this.currentChatId) {
      this.currentChatId = generateId();
      chats.unshift({
        id: this.currentChatId,
        title,
        messages,
        updatedAt: Date.now(),
      });
    } else {
      const index = chats.findIndex((c) => c.id === this.currentChatId);
      if (index > -1) {
        chats[index].messages = messages;
        chats[index].updatedAt = Date.now();
        // Auto-generate title from first user message if it's still default
        if (chats[index].title === "New Conversation" && messages.length > 0) {
          const firstUserMsg = messages.find((m) => m.role === "user");
          if (firstUserMsg) {
            chats[index].title = firstUserMsg.text.substring(0, 30) + "...";
          }
        }
      }
    }

    localStorage.setItem(this.storageKey, JSON.stringify(chats));
    return this.currentChatId;
  }

  deleteChat(chatId) {
    let chats = this.getAllChats();
    chats = chats.filter((c) => c.id !== chatId);
    localStorage.setItem(this.storageKey, JSON.stringify(chats));
    if (this.currentChatId === chatId) this.currentChatId = null;
  }

  clearAll() {
    localStorage.removeItem(this.storageKey);
    this.currentChatId = null;
  }

  setCurrentChat(chatId) {
    this.currentChatId = chatId;
  }
}
