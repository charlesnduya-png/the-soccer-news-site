import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, AIProvider, AIResponse } from "./types";
import {
  COACH_SYSTEM_PROMPT,
  generateFallbackResponse,
  getSocialReply,
  isRoboticLegacyResponse,
} from "./coach";
import {
  formatMatchContextForAI,
  getIntelligenceFromConversation,
} from "./match-intelligence";
import type { MatchIntelligence } from "./match-types";

async function buildMessagesWithContext(
  messages: ChatMessage[],
  matchIntel: MatchIntelligence | null
): Promise<ChatMessage[]> {
  if (!matchIntel) return messages;

  const contextMsg: ChatMessage = {
    role: "system",
    content: formatMatchContextForAI(matchIntel),
  };

  return [contextMsg, ...messages];
}

async function callOpenAI(messages: ChatMessage[]): Promise<AIResponse> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: COACH_SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
    max_tokens: 1500,
    temperature: 0.92,
  });
  return {
    content: response.choices[0]?.message?.content ?? "No response generated.",
    provider: "openai",
    model: "gpt-4o-mini",
  };
}

async function callAnthropic(messages: ChatMessage[]): Promise<AIResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1500,
    system: COACH_SYSTEM_PROMPT,
    messages: messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  });
  const text = response.content[0];
  return {
    content: text.type === "text" ? text.text : "No response generated.",
    provider: "anthropic",
    model: "claude-3-5-haiku-20241022",
  };
}

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
];

async function callGoogle(messages: ChatMessage[]): Promise<AIResponse> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1];

  let lastError: unknown;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: COACH_SYSTEM_PROMPT,
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.92,
        },
      });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage.content);
      const text = result.response.text();
      if (!text?.trim()) throw new Error("Empty Gemini response");
      return {
        content: text,
        provider: "google",
        model: modelName,
      };
    } catch (error) {
      lastError = error;
      console.error(`Gemini model ${modelName} failed:`, error);
    }
  }

  throw lastError ?? new Error("All Gemini models failed");
}

function callFallback(
  messages: ChatMessage[],
  matchIntel?: MatchIntelligence | null
): AIResponse {
  return {
    content: generateFallbackResponse(messages, matchIntel),
    provider: "fallback",
    model: "coach-bolt-v2",
  };
}

const PROVIDER_ORDER: AIProvider[] = ["google", "openai", "anthropic", "fallback"];

function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case "openai": return !!process.env.OPENAI_API_KEY;
    case "anthropic": return !!process.env.ANTHROPIC_API_KEY;
    case "google": return !!process.env.GOOGLE_API_KEY;
    case "fallback": return true;
  }
}

function sanitizeResponse(
  response: AIResponse,
  messages: ChatMessage[],
  matchIntel?: MatchIntelligence | null
): AIResponse {
  if (isRoboticLegacyResponse(response.content)) {
    const social = getSocialReply(messages);
    if (social) {
      return { ...response, content: social, model: "coach-bolt-social" };
    }
    return callFallback(messages, matchIntel);
  }
  return response;
}

export async function generateCoachResponse(
  messages: ChatMessage[],
  preferredProvider?: AIProvider,
  matchIntel?: MatchIntelligence | null
): Promise<AIResponse> {
  if (!matchIntel) {
    const social = getSocialReply(messages);
    if (social) {
      return {
        content: social,
        provider: "fallback",
        model: "coach-bolt-social",
      };
    }
  }

  const enriched = await buildMessagesWithContext(messages, matchIntel ?? null);

  const order = preferredProvider
    ? [preferredProvider, ...PROVIDER_ORDER.filter((p) => p !== preferredProvider)]
    : PROVIDER_ORDER;

  for (const provider of order) {
    if (!isProviderAvailable(provider)) continue;
    try {
      switch (provider) {
        case "openai": return sanitizeResponse(await callOpenAI(enriched), messages, matchIntel);
        case "anthropic": return sanitizeResponse(await callAnthropic(enriched), messages, matchIntel);
        case "google": return sanitizeResponse(await callGoogle(enriched), messages, matchIntel);
        case "fallback": return callFallback(messages, matchIntel);
      }
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error);
      continue;
    }
  }

  return callFallback(messages, matchIntel);
}

export async function getIntelligenceForChat(
  messages: ChatMessage[]
): Promise<MatchIntelligence | null> {
  return getIntelligenceFromConversation(messages);
}

export { getIntelligenceFromConversation };
