import { NextRequest, NextResponse } from 'next/server';
import { MODEL_LIST } from '@/lib/types';

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider') || 'openai';

  if (provider === 'openrouter') {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      const data = await res.json();
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      return NextResponse.json({ provider, models });
    } catch {
      return NextResponse.json({ provider, models: [] });
    }
  }

  return NextResponse.json({ provider, models: MODEL_LIST[provider] || [] });
}
