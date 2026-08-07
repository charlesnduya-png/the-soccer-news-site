import { NextRequest, NextResponse } from "next/server";
import { generateCoachResponse, getIntelligenceForChat } from "@/lib/coach-bolt-engine/ai-providers";
import { getAvailableProviders } from "@/lib/coach-bolt-engine/types";
import type { AIProvider, ChatMessage } from "@/lib/coach-bolt-engine/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages: ChatMessage[] = body.messages ?? [];
    const provider: AIProvider | undefined = body.provider;

    if (!messages.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const matchIntelligence = await getIntelligenceForChat(messages);
    const response = await generateCoachResponse(messages, provider, matchIntelligence);

    return NextResponse.json({ ...response, matchIntelligence });
  } catch (error) {
    console.error("Coach Bolt chat error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ providers: getAvailableProviders() });
}
