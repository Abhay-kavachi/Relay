/* eslint-disable */
import { NextResponse } from 'next/server';
import { ExecutionRepository } from '@/lib/repositories';

export async function GET() {
  const history = ExecutionRepository.getHistory();
  return NextResponse.json(history);
}
