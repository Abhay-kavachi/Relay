import { NextResponse } from 'next/server';
import { engine } from '@/lib/engine';
import { seedDatabase } from '@/lib/seed';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  seedDatabase();
  const { id } = await context.params;
  const payload = await request.json().catch(() => ({}));
  
  try {
    const executionId = await engine.startExecution(id, payload);
    return NextResponse.json({ executionId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
