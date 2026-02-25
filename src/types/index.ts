export interface Profile {
  id: string;
  name: string;
  photo_url: string | null;
  role: string;
  claude_title: string | null;
  claude_title_regenerations: number;
  tags: string[];
  looking_for: string[];
  claude_md_snippet: string | null;
  cool_thing: string | null;
  mcp_servers_skills: string | null;
  linkedin_url: string | null;
  share_email: boolean;
  discoverable: boolean;
  is_beacon_active: boolean;
  beacon_activated_at: string | null;
  primary_tag: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  score: number;
  match_reason: string;
  conversation_starter: string;
  created_at: string;
}

export interface MatchedProfile extends Profile {
  match_score: number;
  match_reason: string;
  conversation_starter: string;
}

export interface Wave {
  id: string;
  from_user: string;
  to_user: string;
  created_at: string;
}

export interface Connection {
  id: string;
  user_a: string;
  user_b: string;
  connected_at: string;
}

export interface BeaconPing {
  id: string;
  from_user: string;
  to_user: string;
  created_at: string;
}

export interface EventStats {
  total_users: number;
  total_connections: number;
  popular_tags: { tag: string; count: number }[];
}
