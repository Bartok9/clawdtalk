import { NextRequest, NextResponse } from 'next/server';

// Agents are stored client-side in localStorage.
// This route is a pass-through for server-side operations.

export async function GET() {
  return NextResponse.json({ message: 'Agents are managed client-side via localStorage' });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // In a production app, this would persist to a database
  return NextResponse.json({ success: true, agent: body });
}
