// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Allow our frontend to talk to this backend
app.use(cors());

// Allow the server to read JSON and large images
app.use(express.json({ limit: "10mb" }));

// This is the route our frontend will call
app.post("/api/chat", async (req, res) => {
  try {
    const { contents } = req.body; // The prompt and images sent from frontend

    // 1. We fetch from Google HERE, on the secure server
    const googleUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(googleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();

    // 2. Send the AI response back to the frontend
    res.json(data);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "An error occurred on the server." });
  }
});

app.listen(PORT, () => {
  console.log(`Secure Backend is running on http://localhost:${PORT}`);
});
