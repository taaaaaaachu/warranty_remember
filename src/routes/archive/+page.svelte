<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDate } from '$lib/format';

	let { data } = $props();
</script>

<h1 style="font-size:1.3rem;">アーカイブ</h1>
<p style="color:var(--muted); font-size:0.9rem;">保証切れ・手放したガジェットの履歴です。削除はされていません。</p>

{#if data.entries.length === 0}
	<p style="color:var(--muted);">アーカイブされた保証登録はありません。</p>
{:else}
	<ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.6rem;">
		{#each data.entries as entry (entry.id)}
			<li>
				<a
					href={resolve('/entries/[id]', { id: entry.id })}
					style="display:flex; align-items:center; gap:0.7rem; text-decoration:none; color:var(--fg);
					       background:var(--card); border:1px solid var(--border); border-radius:0.6rem; padding:0.7rem 0.9rem;"
				>
					<div style="flex:1; min-width:0;">
						<div style="font-weight:600;">{entry.name}</div>
						<div style="font-size:0.85rem; color:var(--muted);">
							{#if entry.category}{entry.category} ・ {/if}保証終了 {formatDate(entry.warrantyEndAt)}
						</div>
					</div>
					<span style="color:var(--muted); font-size:0.85rem;">{formatDate(entry.archivedAt)} にアーカイブ</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
