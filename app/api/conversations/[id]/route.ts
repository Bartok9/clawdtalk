import { NextRequest, NextResponse } from 'next/server';
import { getConversation } from '@/lib/store';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const conv = getConversation(params.id);
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(conv);
}
