import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { saveAttachmentFile, readAttachmentFile, deleteAttachmentFile } from './attachmentStorage';

let uploadDir: string | undefined;

afterEach(async () => {
	if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
	uploadDir = undefined;
});

async function makeTestImage(): Promise<Buffer> {
	// 3000x10 のダミー画像。MAX_DIMENSION(1920)超えのリサイズ挙動を検証するため横長にする。
	return sharp({ create: { width: 3000, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } } })
		.png()
		.toBuffer();
}

describe('saveAttachmentFile', () => {
	it('リサイズ・JPEG圧縮してディスクへ保存し、相対パスを返す', async () => {
		uploadDir = await mkdtemp(join(tmpdir(), 'warranty-attachments-'));
		const buffer = await makeTestImage();

		const result = await saveAttachmentFile('household-1', 'entry-1', buffer, uploadDir);
		expect(result.mimeType).toBe('image/jpeg');
		expect(result.relativePath.startsWith(join('household-1', 'entry-1'))).toBe(true);

		const saved = await readAttachmentFile(result.relativePath, uploadDir);
		const meta = await sharp(saved).metadata();
		expect(meta.width).toBeLessThanOrEqual(1920);
		expect(meta.format).toBe('jpeg');
	});

	it('削除するとファイルが読めなくなる', async () => {
		uploadDir = await mkdtemp(join(tmpdir(), 'warranty-attachments-'));
		const buffer = await makeTestImage();
		const result = await saveAttachmentFile('household-1', 'entry-1', buffer, uploadDir);

		await deleteAttachmentFile(result.relativePath, uploadDir);
		await expect(readAttachmentFile(result.relativePath, uploadDir)).rejects.toThrow();
	});

	it('存在しないファイルの削除はエラーにならない', async () => {
		uploadDir = await mkdtemp(join(tmpdir(), 'warranty-attachments-'));
		await expect(deleteAttachmentFile('no/such/file.jpg', uploadDir)).resolves.toBeUndefined();
	});
});
