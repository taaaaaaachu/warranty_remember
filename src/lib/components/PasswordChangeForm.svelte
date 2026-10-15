<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { REAUTH_REQUIRED } from '$lib/passkeyClient';

	let {
		forced = false,
		hasPassword = true,
		requestReauth
	} = $props<{
		forced?: boolean;
		/** false ならパスワードの新規設定(現在のパスワード欄なし・直近の本人確認で行う)。 */
		hasPassword?: boolean;
		/** 本人確認が必要(428)と言われたときに呼ぶ。確認できたら retry で送り直す。 */
		requestReauth?: (retry: () => void) => void;
	}>();
	const askCurrent = $derived(!forced && hasPassword);
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let busy = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	function submit(e: SubmitEvent) {
		e.preventDefault();
		send();
	}

	async function send() {
		errorMessage = '';
		successMessage = '';
		busy = true;
		try {
			const res = await fetch('/api/account/password', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ currentPassword: askCurrent ? currentPassword : undefined, newPassword, confirmPassword })
			});
			const result = await res.json().catch(() => ({}));
			if (res.status === REAUTH_REQUIRED && requestReauth) {
				requestReauth(send);
				return;
			}
			if (!res.ok) {
				errorMessage = result.message ?? 'パスワードの変更に失敗しました。';
				return;
			}
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			successMessage = hasPassword ? 'パスワードを変更しました。' : 'パスワードを設定しました。';
			await invalidateAll();
		} finally {
			busy = false;
		}
	}
</script>

<div
	style={forced
		? 'max-width:28rem; margin:3rem auto; background:var(--card); border:1px solid var(--border); border-radius:0.6rem; padding:1.2rem;'
		: 'background:var(--card); border:1px solid var(--border); border-radius:0.6rem; padding:0.9rem; margin-bottom:1rem;'}
>
	<h2 style={forced ? 'font-size:1.3rem; margin:0 0 0.6rem;' : 'margin:0 0 0.5rem; font-size:1rem;'}>{hasPassword ? 'パスワードの変更' : 'パスワードの設定'}</h2>
	{#if forced}
		<p style="color:var(--warn); margin:0 0 0.8rem;">
			管理者が発行した一時パスワードです。続けるには新しいパスワードへ変更してください。
		</p>
	{:else if !hasPassword}
		<p style="color:var(--muted); font-size:0.85rem; margin:0 0 0.6rem;">
			いまはパスキーでのみログインできます。パスワードを設定すると、パスワードでもログインできるようになります。
		</p>
	{/if}
	<form onsubmit={submit} style="display:flex; flex-direction:column; gap:0.6rem; max-width:{forced ? '28rem' : '100%'};">
		{#if askCurrent}
			<label>
				<span style="display:block; margin-bottom:0.2rem;">現在のパスワード</span>
				<input bind:value={currentPassword} type="password" autocomplete="current-password" required style="width:100%; box-sizing:border-box;" />
			</label>
		{/if}
		<label>
			<span style="display:block; margin-bottom:0.2rem;">新しいパスワード(8〜256文字)</span>
			<input bind:value={newPassword} type="password" autocomplete="new-password" minlength="8" maxlength="256" required style="width:100%; box-sizing:border-box;" />
		</label>
		<label>
			<span style="display:block; margin-bottom:0.2rem;">新しいパスワード(確認)</span>
			<input bind:value={confirmPassword} type="password" autocomplete="new-password" minlength="8" maxlength="256" required style="width:100%; box-sizing:border-box;" />
		</label>
		<button type="submit" disabled={busy} style="align-self:{forced ? 'stretch' : 'flex-start'}; background:var(--accent); color:#fff; border:none; border-radius:0.5rem; padding:0.5rem 0.8rem; cursor:pointer;">{hasPassword ? 'パスワードを変更' : 'パスワードを設定'}</button>
	</form>
	{#if errorMessage}<p style="color:var(--danger); margin:0.6rem 0 0;">{errorMessage}</p>{/if}
	{#if successMessage}<p style="color:var(--ok); margin:0.6rem 0 0;">{successMessage}</p>{/if}
	{#if forced}
		<form method="POST" action="/logout" style="margin-top:0.8rem; text-align:center;">
			<button type="submit" style="border:none; background:none; color:var(--muted); cursor:pointer;">ログアウト</button>
		</form>
	{/if}
</div>
