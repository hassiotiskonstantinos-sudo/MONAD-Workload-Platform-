import { NextRequest } from 'next/server';
import { getSession, requireManager, jsonOk, jsonError } from '@/lib/api-utils';
import { createProjectFolder, listFolderFiles } from '@/lib/google-drive';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const folderId = req.nextUrl.searchParams.get('folderId');
  if (!folderId) return jsonError('folderId is required');

  const files = await listFolderFiles(session!.user.id, folderId);
  return jsonOk(files);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const err = requireManager(session);
  if (err) return err;

  const body = await req.json();
  const { projectId, projectName } = body;

  if (!projectId || !projectName) {
    return jsonError('projectId and projectName are required');
  }

  const folderId = await createProjectFolder(session!.user.id, projectName);
  if (!folderId) return jsonError('Failed to create Drive folder');

  await prisma.project.update({
    where: { id: projectId },
    data: { driveFolderId: folderId },
  });

  return jsonOk({ folderId });
}
