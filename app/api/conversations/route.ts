import { NextResponse } from 'next/server';
import { getConversations } from '@/lib/store';

export async function GET() {
  return NextResponse.json(getConversations());
}
