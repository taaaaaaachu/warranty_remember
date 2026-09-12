<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import WarrantyEntryForm from '$lib/components/WarrantyEntryForm.svelte';

	async function save(body: Record<string, unknown>): Promise<string | void> {
		const res = await fetch('/api/entries', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const result = await res.json().catch(() => ({}));
		if (!res.ok) return result.message ?? '登録に失敗しました。';
		await goto(resolve('/entries/[id]', { id: result.id }));
	}
</script>

<a href={resolve('/')} style="color:var(--muted); text-decoration:none; font-size:0.9rem;">← 一覧へ戻る</a>
<h1 style="font-size:1.3rem;">保証登録を追加</h1>

<WarrantyEntryForm onSave={save} />
