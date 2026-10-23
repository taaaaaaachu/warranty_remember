import { self as sw } from '$app/service-worker';

const OFFLINE_CACHE = 'warranty-remember-offline-v1';
const OFFLINE_URL = '/offline.html';

// Android Chrome が WebAPK として扱えるよう、ナビゲーションをオフラインでも応答可能にする。
// 認証済み画面や API レスポンス、添付画像は保存せず、固定のオフラインページだけをキャッシュする。
sw.addEventListener('install', (event: ExtendableEvent) => {
	event.waitUntil(
		Promise.all([caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)), sw.skipWaiting()])
	);
});

sw.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(
		Promise.all([
			caches
				.keys()
				.then((names) =>
					Promise.all(
						names
							.filter((name) => name.startsWith('warranty-remember-offline-') && name !== OFFLINE_CACHE)
							.map((name) => caches.delete(name))
					)
				),
			sw.clients.claim()
		])
	);
});

sw.addEventListener('fetch', (event: FetchEvent) => {
	if (event.request.mode !== 'navigate') return;

	event.respondWith(
		fetch(event.request).catch(async () => {
			const offlinePage = await caches.match(OFFLINE_URL);
			return (
				offlinePage ??
				new Response('オフラインです。通信状態を確認してから、もう一度お試しください。', {
					status: 503,
					headers: { 'Content-Type': 'text/plain; charset=utf-8' }
				})
			);
		})
	);
});
