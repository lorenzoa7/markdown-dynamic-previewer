// src/lib/googleDrive.ts
import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})

const drive = google.drive({ version: 'v3', auth })

export interface DriveFile {
  id: string
  name: string
  mimeType: string
}

export async function getFileContent(fileId: string): Promise<string> {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
  )

  return new Promise((resolve, reject) => {
    let data = ''
    res.data.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    res.data.on('end', () => resolve(data))
    res.data.on('error', (err: Error) => reject(err))
  })
}

export async function getMarkdownFileBySlugFromPublico(
  slug: string,
): Promise<{ file: DriveFile; content: string } | null> {
  const publicoFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!publicoFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID não está definida')
  }

  // 1. Liste as subpastas dentro da pasta Publico
  const res = await drive.files.list({
    q: `'${publicoFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  })

  const subfolders = res.data.files || []

  const targetFolder = subfolders.find(
    (folder) => folder.name?.trim().toLowerCase() === slug.trim().toLowerCase(),
  )
  if (!targetFolder) {
    return null
  }

  const filesRes = await drive.files.list({
    q: `'${targetFolder.id}' in parents and name contains '.md' and trashed = false`,
    fields: 'files(id, name, mimeType)',
  })

  const files = filesRes.data.files || []
  if (files.length === 0) {
    return null
  }

  const targetFile = files[0]

  if (!targetFile.id) return null

  const content = await getFileContent(targetFile.id)

  return { file: targetFile as DriveFile, content }
}
