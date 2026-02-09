import Anthropic from "@anthropic-ai/sdk";
import { Finding } from "../static/patterns";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { parseAIResponse } from "./parser";
import { loadConfig } from "../../utils/config";

export async function runAIAnalysis(
  source: string,
  fileName: string
): Promise<{ findings: Finding[]; summary: string; score: number }> {
  const config = loadConfig();

  if (!config.anthropicApiKey) {
    console.log("    [AI] No ANTHROPIC_API_KEY found — skipping AI analysis");
    return { findings: [], summary: "AI analysis skipped (no API key)", score: 0 };
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildUserPrompt(source, fileName) },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return parseAIResponse(text);
  } catch (error: any) {
    console.error(`    [AI] Analysis failed: ${error.message}`);
    return { findings: [], summary: "AI analysis failed", score: 0 };
  }
}
