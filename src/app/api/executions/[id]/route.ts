import { NextResponse } from 'next/server';
import { ExecutionRepository, NodeExecutionRepository } from '@/lib/repositories';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const execution = ExecutionRepository.get(id);
  
  if (!execution) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  const nodeExecutions = NodeExecutionRepository.getByExecutionId(id);
  
  return NextResponse.json({
    execution,
    nodeExecutions
  });
}
