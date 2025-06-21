import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import MapTemplate from '@/models/map/MapTemplate';
import { handleApiError } from '@/lib/api/handle-api-error';
import mapTemplateRepo from '@/lib/repos/map-templates/map-template-repo';
import { mapTemplateService } from '@/lib/domain/map-templates/map-template-service';

/**
 * PATCH /api/admin/map-templates/[id]/archive
 * Архивирует или восстанавливает шаблон карты.
 */
export async function PATCH(request, { params }) {
  const { id } = await params;

  try {
    await connectToDatabase();
    const archivedTemplate = await mapTemplateService.archiveMapTemplate(id);

    if (!archivedTemplate) {
      return NextResponse.json({ message: 'Шаблон карты не найден' }, { status: 404 });
    }

    // После успешной архивации инвалидируем кэш страницы со списком
    revalidatePath('/admin/map-templates');

    return NextResponse.json(archivedTemplate, { status: 200 });
  } catch (error) {
    console.error(`Ошибка архивации шаблона карты с ID ${id}:`, error);
    return handleApiError(error, 'Failed to update map template archive state');
  }
} 