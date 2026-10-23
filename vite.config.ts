import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// プロジェクトを runes モードに固定(ライブラリは除く)。
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// 公開オリジン。未指定なら Host ヘッダーと https から決まる(本番の Cloudflare Tunnel 配下)。
			// http で直接アクセスするローカル compose だけ、ビルド時に ORIGIN で渡す。
			paths: { origin: process.env.ORIGIN || undefined },
			serviceWorker: {
				// CDN が古い service-worker.js をキャッシュし続ける問題を避けるため、
				// 自動登録を止めて +layout.svelte からバージョン付きURLで手動登録する。
				register: false
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
