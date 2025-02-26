import fs from 'fs'

import path from 'path'
import { google } from 'googleapis'

const credentialsFileName = process.env.GOOGLE_CREDENTIALS_FILE
if (!credentialsFileName) {
  throw new Error(
    'The environment variable GOOGLE_CREDENTIALS_FILE is not set.',
  )
}

const isVercel = process.env.VERCEL === '1'

const keyFilePath = isVercel
  ? path.resolve('/tmp', path.basename(credentialsFileName))
  : path.join(process.cwd(), credentialsFileName)

if (!fs.existsSync(keyFilePath)) {
  const content = process.env.GOOGLE_CREDENTIALS_CONTENT
  if (!content) {
    throw new Error(
      'The environment variable GOOGLE_CREDENTIALS_CONTENT is not set.',
    )
  }

  const credentialsObj = JSON.parse(content)
  fs.writeFileSync(keyFilePath, JSON.stringify(credentialsObj), {
    encoding: 'utf8',
  })
}

const auth = new google.auth.GoogleAuth({
  keyFile: keyFilePath,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})

const drive = google.drive({ version: 'v3', auth })

type DriveFile = {
  id: string
  name: string
  mimeType: string
}

export async function getFileAsString(fileId: string): Promise<string> {
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

export async function getFileContent(
  fileId: string,
): Promise<{ content: string; password?: string } | null> {
  const fullContent = await getFileAsString(fileId)
  const lines = fullContent.split('\n')

  if (lines.length === 0 || lines[0].trim() !== '$publish') {
    return null
  }

  let password: string | undefined
  let contentStartIndex = 1

  if (lines.length > 1) {
    const passwordRegex = /^\$password=(.*)$/
    const match = lines[1].trim().match(passwordRegex)
    if (match) {
      password = match[1]
      contentStartIndex = 2
    }
  }

  const newContent = lines.slice(contentStartIndex).join('\n')
  return { content: newContent, password }
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export async function getMarkdownFileByUrlPath(
  urlPath: string,
): Promise<{ file: DriveFile; content: string; password?: string } | null> {
  const segments = urlPath.split('/').filter((segment) => segment !== '')

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!rootFolderId) {
    throw new Error(
      'The environment variable GOOGLE_DRIVE_FOLDER_ID is not set.',
    )
  }

  let currentFolderId = rootFolderId

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    const res = await drive.files.list({
      q: `'${currentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    })
    const folders = res.data.files || []
    const targetFolder = folders.find(
      (folder) => normalizeName(folder.name || '') === segment,
    )
    if (!targetFolder?.id) {
      return null
    }

    currentFolderId = targetFolder.id
  }

  const lastSegment = segments[segments.length - 1]
  const fileRes = await drive.files.list({
    q: `'${currentFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and name contains '.md' and trashed = false`,
    fields: 'files(id, name, mimeType)',
  })

  const files = fileRes.data.files || []
  const targetFile = files.find((file) => {
    const nameWithoutExtension = file.name
      ? file.name.replace(/\.md$/i, '')
      : ''
    return normalizeName(nameWithoutExtension) === lastSegment
  })

  if (!targetFile?.id) {
    return null
  }

  const result = await getFileContent(targetFile.id)
  if (!result) {
    return null
  }

  return {
    file: targetFile as DriveFile,
    content: result.content,
    password: result.password,
  }
}

export async function getFaviconDataUrl(): Promise<string | null> {
  function getMimeType(
    mimeType: string | undefined,
    fileName: string | undefined,
  ) {
    if (mimeType) return mimeType
    if (fileName?.endsWith('.png')) return 'image/png'
    if (fileName?.endsWith('.ico')) return 'image/x-icon'
    return 'application/octet-stream'
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!rootFolderId) {
    throw new Error(
      'The environment variable GOOGLE_DRIVE_FOLDER_ID is not set.',
    )
  }

  const configRes = await drive.files.list({
    q: `'${rootFolderId}' in parents and name = '.markdown-config' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  })

  const configFolders = configRes.data.files || []
  if (configFolders.length === 0) {
    return null
  }

  const configFolderId = configFolders[0].id

  const faviconRes = await drive.files.list({
    q: `'${configFolderId}' in parents and (name = 'favicon.ico' or name = 'favicon.png') and trashed = false`,
    fields: 'files(id, name, mimeType)',
  })

  const faviconFiles = faviconRes.data.files || []
  if (faviconFiles.length === 0) {
    return null
  }

  const faviconFile = faviconFiles[0]

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    drive.files.get(
      { fileId: faviconFile.id ?? undefined, alt: 'media' },
      { responseType: 'arraybuffer' },
      (err, res) => {
        if (err) return reject(err)
        resolve(Buffer.from(res?.data as ArrayBuffer))
      },
    )
  })

  const base64 = buffer.toString('base64')
  const mimeType = getMimeType(
    faviconFile.mimeType ?? undefined,
    faviconFile.name ?? undefined,
  )

  return `data:${mimeType};base64,${base64}`
}
