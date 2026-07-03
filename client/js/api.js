import { CONFIG } from "./config.js";
import { extractBase64Data } from "./utils.js";

export class GeminiAPI {
  constructor() {
    this.abortController = null;
  }

  async generateResponse(prompt, images = []) {
    this.abortController = new AbortController();

    try {
      const parts = [{ text: prompt }];

      // Add images if present
      images.forEach((imgDataUrl) => {
        parts.push({
          inlineData: {
            mimeType: imgDataUrl.match(/data:(.*?);/)[1],
            data: extractBase64Data(imgDataUrl),
          },
        });
      });

      // The payload formatted exactly how Google expects it
      const payload = {
        contents: [{ parts: parts }],
      };

      // Call our Node.js server instead of Google!
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to fetch response from Server.",
        );
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Generation stopped by user.");
      }
      throw error;
    }
  }

  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
