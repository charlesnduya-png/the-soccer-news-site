export type AIProvider = "openai" | "anthropic" | "google" | "fallback";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  matchIntelligence?: import("./match-types").MatchIntelligence | null;
}

export interface ProviderConfig {
  name: AIProvider;
  label: string;
  available: boolean;
}

export function getAvailableProviders(): ProviderConfig[] {
  return [
    {
      name: "openai",
      label: "OpenAI GPT-4",
      available: !!process.env.OPENAI_API_KEY,
    },
    {
      name: "anthropic",
      label: "Anthropic Claude",
      available: !!process.env.ANTHROPIC_API_KEY,
    },
    {
      name: "google",
      label: "Google Gemini",
      available: !!process.env.GOOGLE_API_KEY,
    },
    {
      name: "fallback",
      label: "Coach AI (Chat)",
      available: true,
    },
  ];
}

export function getDefaultProvider(): AIProvider {
  const providers = getAvailableProviders();
  const first = providers.find((p) => p.available && p.name !== "fallback");
  return first?.name ?? "fallback";
}
