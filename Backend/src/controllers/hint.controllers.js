import dotenv from "dotenv";
dotenv.config({ quiet: true });

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Rules:
//   1. Act like a supportive interviewer, not a code generator
//   2. NEVER give the full solution
//   3. Point toward the next step
//   4. Keep it SHORT (2-3 sentences max)
//   5. Reference their actual code so it feels contextual

const SYSTEM_PROMPT = `You are a supportive coding interviewer helping a candidate who is stuck.

Rules you MUST follow:
- Give ONE small hint that nudges them toward the next step
- NEVER write the full solution or any complete function
- NEVER write more than 2-3 lines of code as a hint
- Keep response under 3 sentences
- Reference their actual approach when possible
- If the code is empty, suggest how to START (not what the solution is)
- Be encouraging, not condescending
- No greetings, no fluff — just the hint`;

export const getHint = async function (req, res) {
  try {
    const { problem_statement, code, language } = req.body;

    if (!language) {
      return res.status(400).json({
        status: "error",
        message: "Language is required",
      });
    }

    const userMessage = `
Problem:
${problem_statement || "(No problem set yet — help the candidate think about what to write.)"}

Language: ${language}

Their current code:
\`\`\`${language}
${code || "(empty — they haven't started yet)"}
\`\`\`

Give them ONE helpful hint.
    `.trim();

    const groqResponse = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7, // 0 = predictable, 1 = creative. 0.7 = balanced.
        max_tokens: 200, // Cap the response — hints should be SHORT
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.log("Groq API error:", groqResponse.status, errorText);
      return res.status(500).json({
        status: "error",
        message: "AI service is unavailable right now. Try again in a moment.",
      });
    }

    const data = await groqResponse.json();

    const hint = data.choices?.[0]?.message?.content;

    if (!hint) {
      return res.status(500).json({
        status: "error",
        message: "AI did not return a hint. Try again.",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        hint: hint.trim(),
      },
    });
  } catch (error) {
    console.log("Get Hint Error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};
