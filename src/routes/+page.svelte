<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { formatDate, formatDaysUntil } from '#lib/format.js';
	import { daysUntil } from '#lib/domain/warrantyEntry.js';

	let { data } = $props();

	let highlightedEntryId = $derived(page.state.highlightedEntryId);

	function badgeColor(days: number): string {
		if (days < 0) return 'var(--danger)';
		if (days <= 30) return 'var(--warn)';
		return 'var(--ok)';
	}
</script>

<style>
	@keyframes highlight-pulse {
		0%,
		100% {
			box-shadow: none;
		}
		50% {
			box-shadow: 0 0 0 3px var(--accent);
		}
	}

	.highlighted {
		animation: highlight-pulse 0.9s ease-in-out 3;
	}
</style>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
	<h1 style="font-size:1.3rem; margin:0;">保証登録</h1>
	<a href={resolve('/entries/new')} style="background:var(--accent); color:#fff; text-decoration:none; border-radius:0.5rem; padding:0.5rem 0.8rem;"
		>＋ 新しく登録</a
	>
</div>

<form method="get" style="display:flex; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
	<input name="q" value={data.query} placeholder="名前・メーカー・型番・シリアル番号で検索" style="flex:2; min-width:12rem;" />
	<select name="category" value={data.category} style="flex:1; min-width:8rem;">
		<option value="">すべてのカテゴリー</option>
		{#each data.categories as c (c)}
			<option value={c}>{c}</option>
		{/each}
	</select>
	<button type="submit" style="background:var(--card); border:1px solid var(--border); border-radius:0.5rem; padding:0.5rem 0.8rem; cursor:pointer;">絞り込む</button>
</form>

{#if !data.entries}
	<p style="color:var(--muted);">世帯を選択してください。</p>
{:else if data.entries.length === 0}
	<p style="color:var(--muted);">登録がありません。「＋ 新しく登録」から追加してください。</p>
{:else}
	<ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.6rem;">
		{#each data.entries as entry (entry.id)}
			{@const days = daysUntil(Date.now(), entry.warrantyEndAt)}
			<li>
				<a
					href={resolve('/entries/[id]', { id: entry.id })}
					class:highlighted={entry.id === highlightedEntryId}
					style="display:flex; align-items:center; gap:0.7rem; text-decoration:none; color:var(--fg);
					       background:var(--card); border:1px solid var(--border); border-radius:0.6rem; padding:0.7rem 0.9rem;"
				>
					<div style="flex:1; min-width:0;">
						<div style="font-weight:600;">{entry.name}</div>
						<div style="font-size:0.85rem; color:var(--muted);">
							{#if entry.category}{entry.category} ・ {/if}保証終了 {formatDate(entry.warrantyEndAt)}
						</div>
					</div>
					<span style="color:{badgeColor(days)}; font-weight:600; white-space:nowrap;">{formatDaysUntil(days)}</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
