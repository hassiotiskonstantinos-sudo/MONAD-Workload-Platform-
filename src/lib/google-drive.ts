import { google, drive_v3 } from 'googleapis';
import { prisma } from './prisma';

async function getDriveClient(userId: string): Promise<drive_v3.Drive | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  });

  if (!account?.access_token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env['GOOGLE_CLIENT_ID'],
    process.env['GOOGLE_CLIENT_SECRET']
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  oauth2Client.on('tokens', async (tokens) => {
    const updateData: Record<string, unknown> = {};
    if (tokens.access_token) updateData.access_token = tokens.access_token;
    if (tokens.expiry_date) updateData.expires_at = Math.floor(tokens.expiry_date / 1000);
    if (tokens.refresh_token) updateData.refresh_token = tokens.refresh_token;

    await prisma.account.update({
      where: { id: account.id },
      data: updateData,
    });
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function createProjectFolder(
  userId: string,
  projectName: string
): Promise<string | null> {
  const drive = await getDriveClient(userId);
  if (!drive) return null;

  try {
    const res = await drive.files.create({
      requestBody: {
        name: `MONAD - ${projectName}`,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    return res.data.id || null;
  } catch {
    return null;
  }
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

export async function listFolderFiles(
  userId: string,
  folderId: string
): Promise<DriveFile[]> {
  const drive = await getDriveClient(userId);
  if (!drive) return [];

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 20,
    });

    return (res.data.files || []).map((f) => ({
      id: f.id || '',
      name: f.name || '',
      mimeType: f.mimeType || '',
      modifiedTime: f.modifiedTime || '',
      webViewLink: f.webViewLink || '',
    }));
  } catch {
    return [];
  }
}
