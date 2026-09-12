<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import WarrantyEntryForm from '$lib/components/WarrantyEntryForm.svelte';

	let selectedFiles = $state<File[]>([]);
	let uploadError = $state('');

	function onFilesSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		selectedFiles = [...selectedFiles, ...Array.from(input.files ?? [])];
		input.value = '';
	}

	function removeFile(index: number) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	async function save(body: Record<string, unknown>): Promise<string | void> {
		uploadError = '';
		const res = await fetch('/api/entries', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const result = await res.json().catch(() => ({}));
		if (!res.ok) return result.message ?? '登録に失敗しました。';

		if (selectedFiles.length > 0) {
			const formData = new FormData();
			for (const file of selectedFiles) formData.append('files', file);
			const uploadRes = await fetch(`/api/entries/${result.id}/attachments`, { method: 'POST', body: formData });
			if (!uploadRes.ok) {
				// 登録自体は成功しているので、画像だけ後で追加できるよう詳細画面へ進む。
				uploadError = '登録は完了しましたが、画像のアップロードに失敗しました。詳細画面から再度お試しください。';
			}
		}
		await goto(resolve('/entries/[id]', { id: result.id }));
	}
</script>

<a href={resolve('/')} style="color:var(--muted); text-decoration:none; font-size:0.9rem;">← 一覧へ戻る</a>
<h1 style="font-size:1.3rem;">保証登録を追加</h1>

<div style="background:var(--card); border:1px solid var(--border); border-radius:0.6rem; padding:0.9rem; margin-bottom:1rem;">
	<h2 style="margin:0 0 0.6rem; font-size:1rem;">添付画像(任意)</h2>
	{#if selectedFiles.length > 0}
		<ul style="list-style:none; padding:0; margin:0 0 0.7rem; display:flex; flex-direction:column; gap:0.3rem;">
			{#each selectedFiles as file, index (index)}
				<li style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem;">
					<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{file.name}</span>
					<button type="button" onclick={() => removeFile(index)} style="border:none; background:none; color:var(--danger); cursor:pointer;">削除</button>
				</li>
			{/each}
		</ul>
	{/if}
	<label style="display:inline-block; background:var(--card); border:1px solid var(--border); border-radius:0.5rem; padding:0.4rem 0.7rem; cursor:pointer;">
		＋ 画像を選択
		<input onchange={onFilesSelected} type="file" accept="image/*" multiple style="display:none;" />
	</label>
	<p style="font-size:0.8rem; color:var(--muted); margin:0.5rem 0 0;">ここで選んだ画像は、下のフォームで「登録する」を押した直後にアップロードされます。</p>
</div>

{#if uploadError}<p style="color:var(--danger);">{uploadError}</p>{/if}

<WarrantyEntryForm onSave={save} />
