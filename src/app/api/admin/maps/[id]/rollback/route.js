import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/handle-api-error';
import container from '@/lib/di-container';

export async function POST(request, { params }) {
  try {
    const mapService = container.get('mapService');
    const { id } = params;
    const rolledBackMap = await mapService.rollbackMapCompletion(id);
    return NextResponse.json(rolledBackMap, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
} 