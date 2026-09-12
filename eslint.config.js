import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

/**
 * ESLint flat config。Svelte 5(runesモード) + TypeScript。
 * svelte.config.js を持たない構成(SvelteKit設定は vite.config.ts にインライン)のため、
 * eslint-plugin-svelte には svelteConfig を渡していない。
 */
export default ts.config(
	{
		ignores: ['.svelte-kit/', 'build/', 'node_modules/', 'drizzle/', 'static/', 'package-lock.json']
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				extraFileExtensions: ['.svelte']
			}
		}
	}
);
