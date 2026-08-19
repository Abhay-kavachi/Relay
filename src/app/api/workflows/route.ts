import { NextResponse } from 'next/server';
import { WorkflowRepository } from '@/lib/repositories';
import { seedDatabase } from '@/lib/seed';

export async function GET() {
  seedDatabase();
  // For demo, just return the demo workflow
  const wf = WorkflowRepository.get('wf-demo-1');
  if (!wf) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  return NextResponse.json(wf);
}
