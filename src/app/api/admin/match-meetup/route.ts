import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface Profile {
  id: string;
  name: string;
  work_one_liner: string | null;
  current_season: string | null;
  discussion_topics: string[];
  hoping_for: string | null;
}

const SEASON_LABELS: Record<string, string> = {
  in_transition: "In transition",
  building_something: "Building something new",
  exploring_ideas: "Exploring ideas",
  looking_for_role: "Looking for a new role",
  growing_in_role: "Growing in my current role",
  taking_a_break: "Taking a break",
};

const HOPING_LABELS: Record<string, string> = {
  collaborator: "A collaborator",
  new_perspective: "A new perspective",
  advice: "Advice",
  good_conversation: "Just good conversation",
};

async function scorePairs(
  pairs: Array<[Profile, Profile]>,
  conversationPrompts: string[]
): Promise<Array<{ user_a: string; user_b: string; score: number; match_reason: string; conversation_starter: string }>> {
  const promptContext = conversationPrompts.length > 0
    ? `\n\nTonight's conversation prompts (use these as inspiration for conversation_starter):\n${conversationPrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
    : "";

  const systemPrompt = `You are a match scorer for a Generalist World meetup — a community of curious, generalist thinkers.
Score the quality of a potential conversation between each pair (0-100).

Scoring criteria:
- Shared discussion topics (35%): direct overlap in what they want to talk about
- Season compatibility (25%): complementary or shared life/work phases spark interesting conversations
- Hoping for alignment (25%): compatible intentions (e.g. one wants advice, other wants to give perspective)
- Serendipity (15%): unexpected connections worth making

For small groups (under 20 people), even a 60+ score is a worthwhile connection.
Return a JSON array (no markdown fences):
[{"pair_index":<number>,"score":<0-100>,"reason":"<one sentence, max 100 chars, why they should talk>","conversation_starter":"<specific question or topic, max 150 chars>"}]${promptContext}`;

  const userPrompt = `Score these ${pairs.length} pairs:\n\n${pairs
    .map(([a, b], i) => `PAIR ${i}:
Person A: ${a.name} | ${a.work_one_liner || ""}
Season: ${SEASON_LABELS[a.current_season || ""] || a.current_season || "unknown"}
Topics: ${a.discussion_topics.join(", ") || "none"}
Hoping for: ${HOPING_LABELS[a.hoping_for || ""] || a.hoping_for || "unknown"}

Person B: ${b.name} | ${b.work_one_liner || ""}
Season: ${SEASON_LABELS[b.current_season || ""] || b.current_season || "unknown"}
Topics: ${b.discussion_topics.join(", ") || "none"}
Hoping for: ${HOPING_LABELS[b.hoping_for || ""] || b.hoping_for || "unknown"}
---`)
    .join("\n")}`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
  });

  const text = result.response.text();
  // Strip markdown code fences if Gemini wraps the JSON in ```json ... ```
  const cleaned = text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  const results = JSON.parse(cleaned) as Array<{
    pair_index: number;
    score: number;
    reason: string;
    conversation_starter: string;
  }>;

  return results.map((r) => {
    const [a, b] = pairs[r.pair_index];
    const [user_a, user_b] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
    return {
      user_a,
      user_b,
      score: Math.max(0, Math.min(100, Math.round(r.score))),
      match_reason: r.reason,
      conversation_starter: r.conversation_starter,
    };
  });
}

export async function POST(request: Request) {
  // Auth check — must be a logged-in admin of this meetup
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meetup_id, user_id } = await request.json();
  if (!meetup_id) return NextResponse.json({ error: "meetup_id required" }, { status: 400 });

  const admin = createAdminClient();

  // Verify user is admin or co-admin of this meetup
  const { data: meetup } = await admin
    .from("meetups")
    .select("id, admin_user_id, co_admin_emails")
    .eq("id", meetup_id)
    .single();

  const isAdmin = meetup?.admin_user_id === user.id || meetup?.co_admin_emails?.includes(user.email!);
  if (!meetup || !isAdmin) {
    return NextResponse.json({ error: "Not authorized for this meetup" }, { status: 403 });
  }

  // Get conversation prompts for context
  const { data: promptsData } = await admin
    .from("conversation_prompts")
    .select("prompt_text")
    .eq("meetup_id", meetup_id);

  const conversationPrompts = promptsData?.map((p) => p.prompt_text) || [];

  let allPairs: Array<[Profile, Profile]> = [];

  if (user_id) {
    // ── Single-user mode: match this person against all other checked-in attendees ──
    const { data: newProfile } = await admin
      .from("profiles")
      .select("id, name, work_one_liner, current_season, discussion_topics, hoping_for")
      .eq("id", user_id)
      .eq("meetup_id", meetup_id)
      .single();

    if (!newProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: others } = await admin
      .from("profiles")
      .select("id, name, work_one_liner, current_season, discussion_topics, hoping_for")
      .eq("meetup_id", meetup_id)
      .eq("checked_in", true)
      .neq("id", user_id);

    if (!others || others.length === 0) {
      // First person checked in — no one to match with yet
      return NextResponse.json({ pairs: 0, checkedIn: 1 });
    }

    for (const other of others) {
      allPairs.push([newProfile, other]);
    }
  } else {
    // ── Full mode: score all pairs (manual "Run matching" button) ──
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, name, work_one_liner, current_season, discussion_topics, hoping_for")
      .eq("meetup_id", meetup_id)
      .eq("checked_in", true);

    if (!profiles || profiles.length < 2) {
      return NextResponse.json({ error: "Need at least 2 checked-in attendees" }, { status: 400 });
    }

    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        allPairs.push([profiles[i], profiles[j]]);
      }
    }
  }

  // Score in batches of 15 pairs per Gemini call
  const BATCH_SIZE = 15;
  const allResults = [];

  for (let i = 0; i < allPairs.length; i += BATCH_SIZE) {
    const batch = allPairs.slice(i, i + BATCH_SIZE);
    try {
      const results = await scorePairs(batch, conversationPrompts);
      allResults.push(...results);
    } catch {
      // Fallback: topic-overlap scoring if Gemini is unavailable
      for (const [a, b] of batch) {
        const overlap = a.discussion_topics.filter((t) => b.discussion_topics.includes(t));
        const score = Math.min(70, 40 + overlap.length * 15);
        const [user_a, user_b] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
        allResults.push({
          user_a,
          user_b,
          score,
          match_reason: overlap.length > 0
            ? `Both want to talk about ${overlap[0]}`
            : "Different perspectives worth exploring",
          conversation_starter: conversationPrompts[0] || "What's something you've been thinking about a lot lately?",
        });
      }
    }
  }

  // Add meetup_id to all results and upsert
  const withMeetup = allResults.map((r) => ({ ...r, meetup_id }));
  await admin.from("matches").upsert(withMeetup, {
    onConflict: "meetup_id,user_a,user_b",
    ignoreDuplicates: false,
  });

  return NextResponse.json({ pairs: allResults.length, checkedIn: user_id ? allResults.length + 1 : allPairs.length });
}
