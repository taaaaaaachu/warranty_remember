<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ApiError, REAUTH_REQUIRED, addPasskey, isPasskeyCancel, reauthenticate } from '$lib/passkeyClient';

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

	// 仮パスワード(forced)のときは、本人確認を自前で挟み、パスキーの登録でも解除できる(docs/adr/0003)。
	let forcedRetry = $state<(() => void) | null>(null);
	let temporaryPassword = $state('');
	let passkeyName = $state('');
	const askReauth = $derived(forced ? (retry: () => void) => (forcedRetry = retry) : requestReauth);

	async function confirmTemporaryPassword(e: SubmitEvent) {
		e.preventDefault();
		const retry = forcedRetry;
		if (!retry) return;
		errorMessage = '';
		try {
			await reauthenticate(temporaryPassword);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : '本人確認できませんでした。';
			return;
		}
		forcedRetry = null;
		temporaryPassword = '';
		retry();
	}

	async function registerPasskey(e?: SubmitEvent) {
		e?.preventDefault();
		errorMessage = '';
		busy = true;
		try {
			await addPasskey(passkeyName);
			await invalidateAll();
		} catch (err) {
			if (err instanceof ApiError && err.status === REAUTH_REQUIRED) forcedRetry = () => registerPasskey();
			else if (!isPasskeyCancel(err)) errorMessage = err instanceof Error ? err.message : 'パスキーを登録できませんでした。';
		} finally {
			busy = false;
		}
	}

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
			if (res.status === REAUTH_REQUIRED && askReauth) {
				askReauth(send);
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
			管理者が発行した仮パスワードでログインしています。続けるには、新しいパスワードを設定するか、パスキーを登録してください。
		</p>
		{#if forcedRetry}
			<form onsubmit={confirmTemporaryPassword} style="display:flex; flex-direction:column; gap:0.5rem; border:1px solid var(--border); border-radius:0.5rem; padding:0.7rem; margin:0 0 0.8rem;">
				<span style="font-size:0.85rem; color:var(--muted);">ログインから時間が経ったため、仮パスワードで本人確認をしてください。</span>
				<input bind:value={temporaryPassword} type="password" placeholder="仮パスワード" autocomplete="current-password" required />
				<button type="submit">確認して続ける</button>
			</form>
		{/if}
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
		<h3 style="margin:1rem 0 0.4rem; font-size:0.95rem;">またはパスキーを登録</h3>
		<p style="color:var(--muted); font-size:0.85rem; margin:0 0 0.5rem;">パスキーを登録すると仮パスワードは削除され、パスキーでログインするようになります。</p>
		<form onsubmit={registerPasskey} style="display:flex; gap:0.5rem;">
			<input bind:value={passkeyName} placeholder="名前(例: iPhone)" maxlength="50" style="flex:1; min-width:0;" />
			<button type="submit" disabled={busy}>パスキーを登録</button>
		</form>
		<form method="POST" action="/logout" style="margin-top:0.8rem; text-align:center;">
			<button type="submit" style="border:none; background:none; color:var(--muted); cursor:pointer;">ログアウト</button>
		</form>
	{/if}
</div>
