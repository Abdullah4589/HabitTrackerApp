import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface HabitStat {
  name: string;
  icon: string;
  currentStreak: number;
  bestStreak: number;
  last7Days: number;
  completedLast7: number;
  last30Days: number;
  completedLast30: number;
}

function buildPrompt(
  type: string,
  habitStats: HabitStat[],
  userName: string,
  overallAvg7: number,
  overallAvg30: number,
): string {
  const name = userName || 'there';

  if (type === 'nudge') {
    const lines = habitStats
      .map(h => `- ${h.icon} ${h.name}: ${h.currentStreak}-day streak, ${h.last7Days}% last 7 days`)
      .join('\n');
    return `You are a supportive habit coach. Based on the habit stats below, write a short (2-3 sentences) personalized motivational message or specific tip for ${name}. Be warm, specific, and actionable. Reference their actual habits by name. Write only the message, no preamble or sign-off.

Habits:
${lines}`;
  }

  if (type === 'weekly_summary') {
    const lines = habitStats
      .map(h => `- ${h.icon} ${h.name}: ${h.last7Days}% completion (${h.completedLast7}/7 days), streak: ${h.currentStreak} days`)
      .join('\n');
    return `You are a habit tracking coach. Write a concise weekly reflection summary (3-4 sentences) for ${name}. Mention their top performing habit, any that struggled, and end with encouragement. Write only the summary, no preamble or sign-off.

Last 7 days:
${lines}
Overall average: ${overallAvg7}%`;
  }

  // monthly_summary
  const lines = habitStats
    .map(h => `- ${h.icon} ${h.name}: ${h.last30Days}% completion (${h.completedLast30}/30 days), best streak: ${h.bestStreak} days`)
    .join('\n');
  return `You are a habit tracking coach. Write a brief monthly reflection summary (3-4 sentences) for ${name}. Highlight consistency trends, their strongest habit this month, and close with a motivating forward-looking note. Write only the summary, no preamble or sign-off.

Last 30 days:
${lines}
Overall average: ${overallAvg30}%`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    // Verify user via their JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { type, habitStats, userName, overallAvg7, overallAvg30 } = await req.json();

    if (!['nudge', 'weekly_summary', 'monthly_summary'].includes(type)) {
      return json({ error: 'Invalid type' }, 400);
    }
    if (!habitStats || habitStats.length === 0) {
      return json({ error: 'No habit data provided' }, 400);
    }

    const prompt = buildPrompt(type, habitStats, userName, overallAvg7 ?? 0, overallAvg30 ?? 0);

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://habittracker.app',
        'X-Title': 'HabitTracker',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error('[ai-insights] OpenRouter error:', err);
      return json({ error: 'AI service unavailable' }, 502);
    }

    const aiData = await aiResponse.json();
    const content: string = aiData.choices?.[0]?.message?.content ?? '';
    if (!content) return json({ error: 'Empty AI response' }, 502);

    // Save using service role to bypass RLS
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const id = crypto.randomUUID();
    const generatedAt = new Date().toISOString();

    const { error: insertError } = await admin.from('ai_insights').insert({
      id,
      user_id: user.id,
      type,
      content,
      generated_at: generatedAt,
    });
    if (insertError) console.error('[ai-insights] DB insert error:', insertError);

    return json({ id, type, content, generatedAt });
  } catch (err) {
    console.error('[ai-insights] Unhandled error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
