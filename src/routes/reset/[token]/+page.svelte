<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { isPasskeyCancel, resetWithPasskey } from '$lib/passkeyClient';
	let { data, form } = $props();

	let passkeyName = $state('');
	let passkeyError = $state('');
	let busy = $state(false);

	async function onPasskey(e: SubmitEvent) {
		e.preventDefault();
		passkeyError = '';
		busy = true;
		try {
			await resetWithPasskey(page.params.token!, passkeyName);
			await goto(resolve('/'), { invalidateAll: true });
		} catch (err) {
			if (!isPasskeyCancel(err)) passkeyError = err instanceof Error ? err.message : 'パスキーを登録できませんでした。';
		} finally {
			busy = false;
		}
	}
</script>

<h1 style="font-size:1.3rem;">ログイン方法の再設定</h1>

{#if data.username === null}
	<p style="color:var(--danger);">このリンクは使えません(期限切れ・使用済み・取り消し済み)。管理者に再発行を依頼してください。</p>
{:else}
	<p style="color:var(--muted); font-size:0.9rem; max-width:28rem;">
		<b>{data.username}</b> の新しいパスワードを設定するか、パスキーを登録してください。登録済みのパスキーはすべて削除され、ほかの端末のログインもすべてログアウトされます。
	</p>

	<h2 style="font-size:1rem;">新しいパスワードを設定</h2>
	<form method="POST" use:enhance style="display:flex; flex-direction:column; gap:0.8rem; max-width:22rem;">
		<input name="username" autocomplete="username" value={data.username} hidden readonly />
		<label style="display:flex; flex-direction:column; gap:0.25rem;">
			<span>新しいパスワード(8〜256文字)</span>
			<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="256" required />
		</label>
		<label style="display:flex; flex-direction:column; gap:0.25rem;">
			<span>新しいパスワード(確認)</span>
			<input name="password2" type="password" autocomplete="new-password" minlength="8" maxlength="256" required />
		</label>
		{#if form?.error}<p style="color:var(--danger); margin:0;">{form.error}</p>{/if}
		<button type="submit" style="background:var(--accent); color:#fff; border:none; border-radius:0.5rem; padding:0.6rem; cursor:pointer;"
			>パスワードを設定してログイン</button
		>
	</form>

	<h2 style="font-size:1rem; margin-top:1.5rem;">またはパスキーを登録</h2>
	<form onsubmit={onPasskey} style="display:flex; gap:0.5rem; max-width:22rem;">
		<input bind:value={passkeyName} placeholder="名前(例: iPhone)" maxlength="50" style="flex:1; min-width:0;" />
		<button type="submit" disabled={busy}>パスキーを登録</button>
	</form>
	{#if passkeyError}<p style="color:var(--danger);">{passkeyError}</p>{/if}
{/if}
