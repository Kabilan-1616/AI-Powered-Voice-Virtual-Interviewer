import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());

// ─── PDF Parser ───────────────────────────────────────────
async function extractTextFromPDF(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const pdf = await getDocument({ data: uint8Array }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText.trim();
}

// ─── Resume Upload ─────────────────────────────────────────
app.post("/parse-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const text = await extractTextFromPDF(req.file.buffer);
    if (!text || text.length < 50) {
      return res.status(400).json({ error: "Could not extract text. Make sure it's not a scanned image." });
    }
    res.json({ text });
  } catch (err) {
    console.error("PDF parse error:", err);
    res.status(500).json({ error: "Failed to parse PDF." });
  }
});

// ─── Chat / Interview Engine ───────────────────────────────
app.post("/chat", async (req, res) => {
  const { messages, resumeText, role, experienceLevel } = req.body;

  if (!messages || !resumeText || !role) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const levelDescriptions = {
    fresher: "0-1 years of experience, fresh graduate",
    junior:  "1-2 years of experience",
    mid:     "2-4 years of experience",
    senior:  "4+ years of experience",
  };

  const systemPrompt = `You are a professional technical interviewer conducting a real job interview for the role of "${role}" (${levelDescriptions[experienceLevel] || experienceLevel}).

You have access to the candidate's resume:
=== RESUME START ===
${resumeText}
=== RESUME END ===

Your interviewing rules:
1. Ask ONLY ONE question at a time. Never ask two questions together.
2. Start by greeting the candidate briefly and asking about their background or a specific project on their resume.
3. After each answer, either ask a follow-up to go deeper OR move to a new topic — based on how complete the answer was.
4. If an answer is shallow or vague, probe further ("Can you elaborate on that?", "What was your specific role in that?").
5. Cover a mix of: resume-based questions, technical knowledge for the role, problem-solving, and one behavioral question.
6. Keep your questions concise — one or two sentences max.
7. Do NOT give feedback on answers during the interview. Stay neutral.
8. Do NOT reveal you are an AI. Act as a human interviewer.
9. After 8-10 questions, wrap up naturally by saying "That's all the questions I have. Thank you for your time today — we'll be in touch soon." and then add exactly: [INTERVIEW_COMPLETE]
10. Never repeat a question already asked.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = response.choices[0].message.content;
    const isComplete = reply.includes("[INTERVIEW_COMPLETE]");
    const cleanReply = reply.replace("[INTERVIEW_COMPLETE]", "").trim();

    res.json({ reply: cleanReply, isComplete });
  } catch (err) {
    console.error("Groq error:", err);
    res.status(500).json({ error: "AI failed to respond. Try again." });
  }
});

// ─── Generate Report ───────────────────────────────────────
app.post("/generate-report", async (req, res) => {
  const { transcript, role, experienceLevel, candidateName } = req.body;

  if (!transcript || !role || !candidateName) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const conversationText = transcript
    .map((m) => `${m.role === "assistant" ? "Interviewer" : "Candidate"}: ${m.content}`)
    .join("\n");

  const reportPrompt = `You are a senior hiring manager. You just reviewed a job interview for the role of "${role}" (${experienceLevel} level) with candidate "${candidateName}".

Here is the full interview transcript:
=== TRANSCRIPT START ===
${conversationText}
=== TRANSCRIPT END ===

Based on this interview, generate a detailed evaluation report in the following exact JSON format. Return ONLY the JSON, no extra text:

{
  "overallScore": <number 1-10>,
  "recommendation": "<Strongly Recommend | Recommend | Neutral | Do Not Recommend>",
  "summary": "<2-3 sentence overall summary of the candidate>",
  "technicalScore": <number 1-10>,
  "communicationScore": <number 1-10>,
  "confidenceScore": <number 1-10>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "topicsCovered": ["<topic 1>", "<topic 2>", "<topic 3>"],
  "detailedFeedback": "<4-5 sentences of detailed honest feedback about the candidate's performance>",
  "hiringNotes": "<1-2 sentences of notes specifically for the hiring team>"
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: reportPrompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const raw = response.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const report = JSON.parse(jsonMatch[0]);
    res.json({ report });
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ error: "Failed to generate report." });
  }
});

// ─── Health Check ──────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "Backend running ✅" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));