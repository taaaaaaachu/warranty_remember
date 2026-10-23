<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { version } from '$app/env';
	import { invalidate, refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PasswordChangeForm from '#lib/components/PasswordChangeForm.svelte';

	let { data, children } = $props();
	// 仮パスワードなら変更画面を出す。リセットリンクは別のユーザーのものかもしれないのでそのまま開く(docs/adr/0003)。
	const forced = $derived(!!data.user?.mustChangePassword && !page.url.pathname.startsWith('/reset/'));

	onMount(() => {
		// 別端末で世帯への追加・除名やロール変更があっても、タブに戻ったときに反映する。
		// オフライン時に読み直すとエラー画面になるため、オンラインのときだけ。
		const refreshUser = () => {
			if (document.visibilityState === 'visible' && navigator.onLine) invalidate('app:user');
		};
		document.addEventListener('visibilitychange', refreshUser);
		registerServiceWorker();
		return () => document.removeEventListener('visibilitychange', refreshUser);
	});

	function registerServiceWorker() {
		if (!('serviceWorker' in navigator)) return;

		// ビルドごとにURLを変え、CDNに残った旧service-worker.jsを再利用させない。
		navigator.serviceWorker
			// SvelteKit 3 は Service Worker を ES モジュールとしてバンドルする。
			.register(`/service-worker.js?v=${encodeURIComponent(version)}`, { type: 'module' })
			.catch((error: unknown) => console.error('Service Workerの登録に失敗しました', error));
	}

	const nav = [
		{ href: '/', label: '保証登録' },
		{ href: '/archive', label: 'アーカイブ' },
		{ href: '/account', label: '設定' }
	] as const;

	async function switchHousehold(e: Event) {
		const id = (e.currentTarget as HTMLSelectElement).value;
		await fetch('/api/session/household', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ householdId: id })
		});
		await refreshAll();
	}
</script>

{#if data.user && !forced}
	<header
		style="border-bottom:1px solid var(--border); background:var(--card);
		       position:sticky; top:0; z-index:10;"
	>
		<div
			style="max-width:48rem; margin:0 auto; padding:0.75rem 1rem;
			       display:flex; align-items:center; gap:1rem; flex-wrap:wrap;"
		>
			<a href={resolve('/')} style="font-weight:700; color:var(--accent); text-decoration:none;"
				>保証リマインダー</a
			>
			<nav style="display:flex; gap:0.75rem; font-size:0.9rem;">
				{#each nav as n (n.href)}
					<a
						href={resolve(n.href)}
						style="text-decoration:none; color:{page.url.pathname === n.href
							? 'var(--accent)'
							: 'var(--muted)'};"
					>
						{n.label}
					</a>
				{/each}
			</nav>

			<div style="margin-left:auto; display:flex; align-items:center; gap:0.6rem; font-size:0.85rem;">
				{#if data.households.length > 0}
					<select
						onchange={switchHousehold}
						value={data.activeHousehold?.id}
						style="padding:0.2rem 0.4rem; border:1px solid var(--border); border-radius:0.4rem;"
					>
						{#each data.households as h (h.id)}
							<option value={h.id}>{h.name}</option>
						{/each}
					</select>
				{/if}
				<a href={resolve('/account')} style="color:var(--muted); text-decoration:none;">{data.user.username}</a>
				<form method="POST" action="/logout">
					<button
						type="submit"
						style="border:none; background:none; color:var(--muted); cursor:pointer; font-size:0.85rem;"
						>ログアウト</button
					>
				</form>
			</div>
		</div>
	</header>
{/if}

<main style="max-width:48rem; margin:0 auto; padding:1rem;">
	{#if forced}
		<PasswordChangeForm forced={true} />
	{:else}
		{@render children()}
	{/if}
</main>
