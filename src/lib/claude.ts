import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateClaudeTitle(profile: {
  role: string;
  tags: string[];
  looking_for: string[];
  claude_md_snippet?: string | null;
  cool_thing?: string | null;
  mcp_servers_skills?: string | null;
}): Promise<string> {
  const systemPrompt = `You are a creative title generator for a Claude Code meetup networking app.
Based on the attendee's profile, generate a fun, memorable 2-5 word title that captures their vibe.
The title should be witty, tech-relevant, and conversation-starting.

Rules:
- 2-5 words max
- Use "The" prefix sometimes but not always
- Reference their specific skills/interests, not generic tech terms
- Be playful — these are conversation starters at a meetup
- Never use offensive or exclusionary language
- Format: Return ONLY the title text, nothing else

Examples of good titles:
- "The MCP Whisperer"
- "Agent Herder"
- "Prompt Poet Laureate"
- "Vibe Coder Supreme"
- "Full Stack Centaur"
- "The Context Window Surfer"
- "Multi-Agent Maestro"
- "Terminal Velocity"
- "The Diff Whisperer"
- "Chaos Prompt Engineer"`;

  const userPrompt = `Generate a Claude Title for this attendee:
Role: ${profile.role}
Interests: ${profile.tags.join(", ")}
Looking for: ${profile.looking_for.join(", ")}
${profile.claude_md_snippet ? `claude.md snippet: ${profile.claude_md_snippet}` : ""}
${profile.cool_thing ? `Cool thing they built: ${profile.cool_thing}` : ""}
${profile.mcp_servers_skills ? `MCP servers/skills: ${profile.mcp_servers_skills}` : ""}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 30,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = message.content[0];
  if (content.type === "text") {
    return content.text.trim().replace(/^["']|["']$/g, "");
  }
  return "The Mystery Coder";
}

export { anthropic };
