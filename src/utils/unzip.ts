import { dirname, join, normalize } from 'node:path'
import type { Entry, ZipFile } from 'yauzl'
import { open } from 'yauzl'
import fs from 'node:fs'

const extractFile = function extractFile (this: ZipFile, entry: Entry, output: string): Promise<void> {
  const dir = dirname(output)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (fs.existsSync(output)) {
    fs.rmSync(output)
  }

  return new Promise<void>((resolve, reject) => {
    this.openReadStream(entry, (err, readStream) => {
      if (err) {
        reject(err)
        return
      }
      const writeStream = fs.createWriteStream(output)
      readStream.once('end', () => {
        resolve()
      })
      readStream.once('error', reject)
      writeStream.once('error', reject)
      readStream.pipe(writeStream)
    })
  })
}

const openZip = function openZip (zipFile: string): Promise<ZipFile> {
  return new Promise<ZipFile>((resolve, reject) => {
    open(zipFile, { lazyEntries: true }, (err, zip) => {
      if (err) {
        reject(err)
        return
      }
      resolve(zip)
    })
  })
}

export const all = function unzipAll (zipFile: string, outputDir: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    openZip(zipFile).then((zip) => {
      const onerror = function onerror (err: Error) {
        reject(err)
        zip.close()
      }

      zip.on('entry', (entry) => {
        if (entry.fileName.endsWith('/')) {
          zip.readEntry()
          return
        }

        const file = join(outputDir, normalize(entry.fileName))
        extractFile.call(zip, entry, file).then(() => zip.readEntry()).catch(onerror)
      })
      zip.once('end', () => {
        resolve()
      })
      zip.once('error', onerror)

      zip.readEntry()
    }).catch(reject)
  })
}

export const pick = function unzipSingle (zipFile: string, target: string | string[], output: string): Promise<void> {
  const targets = (typeof target === 'string' ? [target] : target).map((v) => v.replaceAll('\\', '/'))
  targets.forEach((v) => {
    if (v.endsWith('/')) {
      throw new Error(`'${v}' is a directory.`)
    }
  })

  return new Promise<void>((resolve, reject) => {
    openZip(zipFile).then((zip) => {
      const onerror = function onerror (err: Error) {
        reject(err)
        zip.close()
      }

      let found = false

      zip.on('entry', (entry) => {
        if (targets.includes(entry.fileName)) {
          extractFile.call(zip, entry, typeof target === 'string' ? output : join(output, entry.fileName)).then(() => {
            found = true
            zip.close()
          }).catch(onerror)
        } else {
          zip.readEntry()
        }
      })
      zip.once('close', () => {
        if (found) {
          resolve()
        } else {
          onerror(new Error(`target file not found.`))
        }
      })
      zip.once('error', onerror)

      zip.readEntry()
    }).catch(reject)
  })
}
