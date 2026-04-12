const express = require("express");
const { body, validationResult } = require("express-validator");
const OpenAI = require("openai");
const authMiddleware = require("../middleware/middleware/auth");

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function validationError(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return res.status(400).json({ error: errors.array()[0].msg });
}

function buildSystemPrompt(targetLanguage, level) {
  return `You are the LangUp Studio assistant.

The learner is studying **${targetLanguage}** at immersion level **${level}** (1 = light word swaps, 5 = heavy immersion). They will paste **English** text into LangUp, which replaces some English words with ${targetLanguage} vocabulary to build a reading exercise.

Your job:
- Chat in **English** to help them brainstorm, outline, draft, shorten, or polish **English** source text for that purpose.
- Keep replies concise (a few sentences) unless they explicitly ask for a longer passage.
- When you produce text for them to use as their **source passage**, write **plain English only** (no markdown code fences, no \`\`\` blocks). You may use normal paragraphs.
- Do not perform ${targetLanguage} word substitutions yourself; the app does that in the next step after they open the reader.

Tone: friendly, practical, oriented toward language-learning reading practice.`;
}

/**
 * POST /api/studio/chat
 * Body: { messages: [{ role: "user"|"assistant", content: string }], target_language, level }
 */
router.post(
  "/studio/chat",
  authMiddleware,
  [
    body("messages")
      .isArray({ min: 1 })
      .withMessage("messages must be a non-empty array"),
    body("messages.*.role")
      .isIn(["user", "assistant"])
      .withMessage("each message role must be user or assistant"),
    body("messages.*.content")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("each message must have non-empty content"),
    body("target_language")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("target_language is required"),
    body("level")
      .isInt({ min: 1, max: 5 })
      .withMessage("level must be an integer from 1 to 5"),
  ],
  async (req, res) => {
    const invalid = validationError(req, res);
    if (invalid) return invalid;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    }

    const { messages, target_language, level } = req.body;
    const systemPrompt = buildSystemPrompt(target_language, Number(level));
    const trimmed = messages.slice(-24);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          ...trimmed,
        ],
      });

      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        return res.status(500).json({ error: "Empty response from model" });
      }

      return res.json({
        role: "assistant",
        content: reply,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: error.message || "Studio chat failed" });
    }
  }
);

module.exports = router;
