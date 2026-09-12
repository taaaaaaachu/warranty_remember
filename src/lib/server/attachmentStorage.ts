import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { env } from '$env/dynamic/private';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 82;

export function resolveUploadDir(): string {
	return env.UPLOAD_DIR ?? './data/uploads';
}

/**
 * 添付画像をリサイズ・圧縮してディスクへ保存する。
 * householdId・entryId はサーバー側で生成した内部IDのみを受け取る前提(パストラバーサル対策不要)。
 * 戻り値の relativePath は UPLOAD_DIR からの相対パスで、DB にはこれだけを保存する。
 */
export async function saveAttachmentFile(
	householdId: string,
	entryId: string,
	buffer: Buffer,
	uploadDir: string = resolveUploadDir()
): Promise<{ relativePath: string; mimeType: string }> {
	const fileName = `${randomBytes(16).toString('hex')}.jpg`;
	const relativePath = join(householdId, entryId, fileName);
	const absolutePath = join(uploadDir, relativePath);
	await mkdir(dirname(absolutePath), { recursive: true });
	const resized = await sharp(buffer)
		.rotate() // EXIF Orientation を反映してから正規化する
		.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: JPEG_QUALITY })
		.toBuffer();
	await writeFile(absolutePath, resized);
	return { relativePath, mimeType: 'image/jpeg' };
}

export async function readAttachmentFile(relativePath: string, uploadDir: string = resolveUploadDir()): Promise<Buffer> {
	return readFile(join(uploadDir, relativePath));
}

export async function deleteAttachmentFile(relativePath: string, uploadDir: string = resolveUploadDir()): Promise<void> {
	await unlink(join(uploadDir, relativePath)).catch(() => undefined);
}
