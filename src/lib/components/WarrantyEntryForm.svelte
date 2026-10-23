<script lang="ts">
	import { untrack } from 'svelte';
	import { localDateInput } from '$lib/format';

	interface InitialValues {
		name?: string;
		category?: string | null;
		manufacturer?: string | null;
		modelNumber?: string | null;
		serialNumber?: string | null;
		purchasedAt?: number;
		purchasedFrom?: string | null;
		price?: number | null;
		warrantyMonths?: number | null;
		warrantyEndAt?: number;
		contactNote?: string | null;
		memo?: string | null;
	}

	let {
		initial = {},
		submitLabel = '登録する',
		onSave
	}: {
		initial?: InitialValues;
		submitLabel?: string;
		onSave: (body: Record<string, unknown>) => Promise<string | void>;
	} = $props();

	// 入力欄の初期値として最初の値だけを使う(編集中に親のデータが更新されても入力を上書きしない)。
	// 別の保証登録を開くときは呼び出し側が {#key} で作り直す。
	const init = untrack(() => initial);

	let name = $state(init.name ?? '');
	let category = $state(init.category ?? '');
	let manufacturer = $state(init.manufacturer ?? '');
	let modelNumber = $state(init.modelNumber ?? '');
	let serialNumber = $state(init.serialNumber ?? '');
	let purchasedAt = $state(init.purchasedAt ? localDateInput(new Date(init.purchasedAt)) : localDateInput());
	let purchasedFrom = $state(init.purchasedFrom ?? '');
	let price = $state(init.price != null ? String(init.price) : '');
	// 既存データに手動上書き(warrantyMonths が null)があればそのモードで開く。
	let endDateMode = $state<'months' | 'manual'>(init.warrantyMonths != null || init.warrantyEndAt === undefined ? 'months' : 'manual');
	let warrantyMonths = $state(init.warrantyMonths != null ? String(init.warrantyMonths) : '12');
	let warrantyEndAt = $state(init.warrantyEndAt ? localDateInput(new Date(init.warrantyEndAt)) : '');
	let contactNote = $state(init.contactNote ?? '');
	let memo = $state(init.memo ?? '');

	let saving = $state(false);
	let error = $state('');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (!name.trim()) {
			error = 'ガジェット名を入力してください。';
			return;
		}
		if (endDateMode === 'manual' && !warrantyEndAt) {
			error = '保証終了日を入力してください。';
			return;
		}

		saving = true;
		try {
			const body: Record<string, unknown> = {
				name: name.trim(),
				category: category.trim() || null,
				manufacturer: manufacturer.trim() || null,
				modelNumber: modelNumber.trim() || null,
				serialNumber: serialNumber.trim() || null,
				purchasedAt,
				purchasedFrom: purchasedFrom.trim() || null,
				price: price.trim() === '' ? null : price,
				contactNote: contactNote.trim() || null,
				memo: memo.trim() || null
			};
			if (endDateMode === 'months') {
				body.warrantyMonths = warrantyMonths;
			} else {
				body.warrantyMonths = null;
				body.warrantyEndAt = warrantyEndAt;
			}
			const result = await onSave(body);
			if (typeof result === 'string') error = result;
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={submit} style="display:flex; flex-direction:column; gap:0.9rem;">
	<label style="display:flex; flex-direction:column; gap:0.25rem;">
		<span>ガジェット名</span>
		<input bind:value={name} placeholder="ワイヤレスイヤホン" required />
	</label>

	<div style="display:flex; gap:0.9rem; flex-wrap:wrap;">
		<label style="display:flex; flex-direction:column; gap:0.25rem; flex:1; min-width:10rem;">
			<span>カテゴリー(任意)</span>
			<input bind:value={category} placeholder="家電" />
		</label>
		<label style="display:flex; flex-direction:column; gap:0.25rem; flex:1; min-width:10rem;">
			<span>メーカー(任意)</span>
			<input bind:value={manufacturer} />
		</label>
		<label style="display:flex; flex-direction:column; gap:0.25rem; flex:1; min-width:10rem;">
			<span>型番(任意)</span>
			<input bind:value={modelNumber} />
		</label>
	</div>

	<label style="display:flex; flex-direction:column; gap:0.25rem;">
		<span>シリアル番号(任意)</span>
		<input bind:value={serialNumber} />
	</label>

	<fieldset style="border:1px solid var(--border); border-radius:0.5rem; padding:0.8rem;">
		<legend style="padding:0 0.4rem; color:var(--muted);">購入情報</legend>
		<div style="display:flex; gap:0.9rem; flex-wrap:wrap;">
			<label style="display:flex; flex-direction:column; gap:0.25rem; flex:1; min-width:10rem;">
				<span>購入日</span>
				<input bind:value={purchasedAt} type="date" required />
			</label>
			<label style="display:flex; flex-direction:column; gap:0.25rem; flex:1; min-width:10rem;">
				<span>購入店舗・場所(任意)</span>
				<input bind:value={purchasedFrom} placeholder="Amazon" />
			</label>
			<label style="display:flex; flex-direction:column; gap:0.25rem; flex:1; min-width:8rem;">
				<span>金額(任意・円)</span>
				<input bind:value={price} type="text" inputmode="numeric" />
			</label>
		</div>
	</fieldset>

	<fieldset style="border:1px solid var(--border); border-radius:0.5rem; padding:0.8rem;">
		<legend style="padding:0 0.4rem; color:var(--muted);">保証</legend>
		<div style="display:flex; gap:1rem; margin-bottom:0.6rem; font-size:0.9rem;">
			<label style="display:flex; align-items:center; gap:0.3rem;">
				<input type="radio" bind:group={endDateMode} value="months" />
				購入日+期間(月数)から自動計算
			</label>
			<label style="display:flex; align-items:center; gap:0.3rem;">
				<input type="radio" bind:group={endDateMode} value="manual" />
				保証終了日を直接指定
			</label>
		</div>
		{#if endDateMode === 'months'}
			<label style="display:flex; flex-direction:column; gap:0.25rem; max-width:12rem;">
				<span>保証期間(月数)</span>
				<input bind:value={warrantyMonths} type="text" inputmode="numeric" required />
			</label>
		{:else}
			<label style="display:flex; flex-direction:column; gap:0.25rem; max-width:12rem;">
				<span>保証終了日</span>
				<input bind:value={warrantyEndAt} type="date" required />
			</label>
		{/if}
	</fieldset>

	<label style="display:flex; flex-direction:column; gap:0.25rem;">
		<span>保証を使うときの問い合わせ先(任意)</span>
		<input bind:value={contactNote} placeholder="メーカーサポート 0120-xxx-xxx" />
	</label>

	<label style="display:flex; flex-direction:column; gap:0.25rem;">
		<span>メモ(任意)</span>
		<textarea bind:value={memo} rows="3" style="width:100%; box-sizing:border-box; font-family:inherit;"></textarea>
	</label>

	{#if error}<p style="color:var(--danger); margin:0;">{error}</p>{/if}

	<button type="submit" disabled={saving} style="background:var(--accent); color:#fff; border:none; border-radius:0.5rem; padding:0.6rem; font-size:1rem; cursor:pointer;">
		{saving ? '保存中…' : submitLabel}
	</button>
</form>
