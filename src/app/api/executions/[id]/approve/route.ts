/* eslint-disable */
import { NextResponse } from 'next/server';
import { engine } from '@/lib/engine';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => ({}));
  
  try {
    await engine.resumeExecution(id, payload.approved, payload.note);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
