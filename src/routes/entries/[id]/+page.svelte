<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import WarrantyEntryForm from '$lib/components/WarrantyEntryForm.svelte';

	let { data } = $props();

	let uploadError = $state('');
	let uploading = $state(false);
	let actionError = $state('');
	let fileInput = $state<HTMLInputElement | undefined>();

	async function save(body: Record<string, unknown>): Promise<string | void> {
		const res = await fetch(`/api/entries/${data.entry.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const result = await res.json().catch(() => ({}));
		if (!res.ok) return result.message ?? '更新に失敗しました。';
		await invalidateAll();
	}

	async function uploadFiles(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;
		uploadError = '';
		uploading = true;
		try {
			const formData = new FormData();
			for (const file of files) formData.append('files', file);
			const res = await fetch(`/api/entries/${data.entry.id}/attachments`, { method: 'POST', body: formData });
			if (!res.ok) {
				const result = await res.json().catch(() => ({}));
				uploadError = result.message ?? '画像のアップロードに失敗しました。';
				return;
			}
			input.value = '';
			await invalidateAll();
		} finally {
			uploading = false;
		}
	}

	async function deleteAttachment(attachmentId: string) {
		await fetch(`/api/entries/${data.entry.id}/attachments/${attachmentId}`, { method: 'DELETE' });
		await invalidateAll();
	}

	async function toggleArchive() {
		actionError = '';
		const method = data.entry.archivedAt ? 'DELETE' : 'POST';
		const res = await fetch(`/api/entries/${data.entry.id}/archive`, { method });
		if (!res.ok) {
			actionError = (await res.json().catch(() => ({}))).message ?? '操作に失敗しました。';
			return;
		}
		await invalidateAll();
	}

	async function deleteEntry() {
		if (!window.confirm(`「${data.entry.name}」を削除します。この操作は取り消せません。よろしいですか?`)) return;
		const res = await fetch(`/api/entries/${data.entry.id}`, { method: 'DELETE' });
		if (!res.ok) {
			actionError = (await res.json().catch(() => ({}))).message ?? '削除に失敗しました。';
			return;
		}
		await goto(resolve('/'));
	}
</script>

<a href={resolve('/')} style="color:var(--muted); text-decoration:none; font-size:0.9rem;">← 一覧へ戻る</a>
<div style="display:flex; justify-content:space-between; align-items:center;">
	<h1 style="font-size:1.3rem;">{data.entry.name}</h1>
	{#if data.entry.archivedAt}
		<span style="color:var(--muted); font-size:0.85rem;">アーカイブ済み</span>
	{/if}
</div>

<div style="background:var(--card); border:1px solid var(--border); border-radius:0.6rem; padding:0.9rem; margin-bottom:1rem;">
	<h2 style="margin:0 0 0.6rem; font-size:1rem;">添付画像</h2>
	{#if data.attachments.length > 0}
		<div style="display:flex; flex-wrap:wrap; gap:0.6rem; margin-bottom:0.7rem;">
			{#each data.attachments as attachment (attachment.id)}
				<div style="position:relative; width:7rem; height:7rem;">
					<img
						src={`/api/attachments/${attachment.id}`}
						alt="添付画像"
						style="width:100%; height:100%; object-fit:cover; border-radius:0.4rem; border:1px solid var(--border);"
					/>
					<button
						type="button"
						onclick={() => deleteAttachment(attachment.id)}
						aria-label="この画像を削除"
						style="position:absolute; top:-0.4rem; right:-0.4rem; width:1.5rem; height:1.5rem; border-radius:50%; border:none; background:var(--danger); color:#fff; cursor:pointer;"
						>×</button
					>
				</div>
			{/each}
		</div>
	{/if}
	<label style="display:inline-block; background:var(--card); border:1px solid var(--border); border-radius:0.5rem; padding:0.4rem 0.7rem; cursor:pointer;">
		{uploading ? 'アップロード中…' : '＋ 画像を追加'}
		<input bind:this={fileInput} onchange={uploadFiles} type="file" accept="image/*" multiple style="display:none;" disabled={uploading} />
	</label>
	{#if uploadError}<p style="color:var(--danger);">{uploadError}</p>{/if}
</div>

{#key data.entry.id}
	<WarrantyEntryForm
		initial={{
			name: data.entry.name,
			category: data.entry.category,
			manufacturer: data.entry.manufacturer,
			modelNumber: data.entry.modelNumber,
			serialNumber: data.entry.serialNumber,
			purchasedAt: data.entry.purchasedAt,
			purchasedFrom: data.entry.purchasedFrom,
			price: data.entry.price,
			warrantyMonths: data.entry.warrantyMonths,
			warrantyEndAt: data.entry.warrantyEndAt,
			contactNote: data.entry.contactNote,
			memo: data.entry.memo
		}}
		submitLabel="更新する"
		onSave={save}
	/>
{/key}

<div style="margin-top:1.5rem; display:flex; gap:0.6rem; flex-wrap:wrap;">
	<button type="button" onclick={toggleArchive} style="border:1px solid var(--warn); background:var(--card); color:var(--warn); border-radius:0.5rem; padding:0.5rem 0.8rem; cursor:pointer;">
		{data.entry.archivedAt ? '一覧に戻す' : 'アーカイブする'}
	</button>
	<button type="button" onclick={deleteEntry} style="border:1px solid var(--danger); background:var(--card); color:var(--danger); border-radius:0.5rem; padding:0.5rem 0.8rem; cursor:pointer;"
		>削除する</button
	>
</div>
{#if actionError}<p style="color:var(--danger);">{actionError}</p>{/if}
