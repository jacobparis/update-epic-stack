import { correctPatch } from './patch.js'
import { describe, it, expect } from 'vitest'

describe('correctPatch', () => {
	it('removes context from replacements', () => {
		const patchText = `diff --git a/.eslintrc.cjs b/.eslintrc.cjs
index 5dae40c..77b562b 100644
--- a/.eslintrc.cjs
+++ b/.eslintrc.cjs
@@ -2,7 +2,7 @@ const vitestFiles = ['app/**/__tests__/**/*', 'app/**/*.{spec,test}.*']
 const testFiles = ['**/tests/**', ...vitestFiles]
 const appFiles = ['app/**']
 
-/** @type {import('@types/eslint').Linter.BaseConfig} */
+/** @type {import('@types/eslint').Linter.Config} */
 module.exports = {
 	extends: [
 		'@remix-run/eslint-config',
`

		const targetFileContent = `const appFiles = ['app/**']

/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
	extends: [
		'@remix-run/eslint-config',
		'@remix-run/eslint-config/node',
		'prettier',
	],`

		const expectedCorrectedPatch = `--- .eslintrc.cjs
+++ .eslintrc.cjs
@@ -4,1 +4,1 @@
-/** @type {import('@types/eslint').Linter.BaseConfig} */
+/** @type {import('@types/eslint').Linter.Config} */
`

		const correctedPatchText = correctPatch(patchText, targetFileContent)

		expect(correctedPatchText).toBe(expectedCorrectedPatch)
	})

	it.only('keeps count above zero', () => {
		const patchText = `
diff --git a/app/root.tsx b/app/root.tsx
index 39e8bca..d984345 100644
--- a/app/root.tsx
+++ b/app/root.tsx
@@ -60,7 +60,6 @@ export const links: LinksFunction = () => {
 		// Preload svg sprite as a resource to avoid render blocking
 		{ rel: 'preload', href: iconsHref, as: 'image' },
 		// Preload CSS as a resource to avoid render blocking
-		{ rel: 'preload', href: tailwindStyleSheetUrl, as: 'style' },
 		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
 		{
 			rel: 'alternate icon',
`

		const targetFileContent = `import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node'
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useFetchers,
	useLoaderData,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { EpicProgress } from './components/progress-bar.tsx'
import { useToast } from './components/toaster.tsx'
import { href as iconsHref } from './components/ui/icon.tsx'
import { EpicToaster } from './components/ui/sonner.tsx'
import { KCDShop } from './kcdshop.tsx'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints, useHints } from './utils/client-hints.tsx'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { combineHeaders, getDomainUrl } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { useRequestInfo } from './utils/request-info.ts'
import { type Theme, setTheme, getTheme } from './utils/theme.server.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'

export const links: LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconsHref, as: 'image' },
		// Preload CSS as a resource to avoid render blocking
		{ rel: 'preload', href: tailwindStyleSheetUrl, as: 'style' },
		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
		{
			rel: 'alternate icon',
			type: 'image/png',
			href: '/favicons/favicon-32x32.png',
		},
		{ rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon.png' },
		{
			rel: 'manifest',
			href: '/site.webmanifest',
			crossOrigin: 'use-credentials',
		} as const, // necessary to make typescript happy
		//These should match the css preloads above to avoid css as render blocking resource
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
	].filter(Boolean)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [
		{ title: data ? 'Epic Notes' : 'Error | Epic Notes' },
		{ name: 'description', content: \`Your own captain's log\` },
	]
}
`
		const correctedPatchText = correctPatch(patchText, targetFileContent)

		expect(correctedPatchText).toBe(`--- app/root.tsx
+++ app/root.tsx
@@ -51,1 +51,0 @@
-		{ rel: 'preload', href: tailwindStyleSheetUrl, as: 'style' },
`)
	})

	it('fly.toml', () => {
		const patchText = `
diff --git a/fly.toml b/fly.toml
index 76170c4..9d13e59 100644
--- a/fly.toml
+++ b/fly.toml
@@ -16,3 +15,0 @@ destination = "/data"
-[deploy]
-release_command = "node ./other/sentry-create-release"
-
`

		const targetFileContent = `app = "01-problem-e37d"
primary_region = "sjc"
kill_signal = "SIGINT"
kill_timeout = 5
processes = [ ]

[experimental]
allowed_public_ports = [ ]
auto_rollback = true

[mounts]
source = "data"
destination = "/data"

[deploy]
release_command = "node ./other/sentry-create-release"

[[services]]
internal_port = 8080
processes = [ "app" ]
protocol = "tcp"
script_checks = [ ]
`

		const correctedPatchText = correctPatch(patchText, targetFileContent)

		expect(correctedPatchText).toBe(`--- fly.toml
+++ fly.toml
@@ -15,3 +14,0 @@
-[deploy]
-release_command = "node ./other/sentry-create-release"
-
`)
	})

	it('removes context before removal', () => {
		const patchText = `diff --git a/types/deps.d.ts b/types/deps.d.ts
index 5821c73..121be70 100644
--- a/types/deps.d.ts
+++ b/types/deps.d.ts
@@ -1,9 +1,6 @@
 // This module should contain type definitions for modules which do not have
 // their own type definitions and are not available on DefinitelyTyped.
 
-declare module 'tailwindcss-animate' {
-	declare const _default: {
-		handler: () => void
-	}
-	export = _default
-}
+// declare module 'some-untyped-pkg' {
+// 	export function foo(): void;
+// }
`

		const targetFileContent = `// This module should contain type definitions for modules which do not have
// their own type definitions and are not available on DefinitelyTyped.

declare module 'tailwindcss-animate' {
	declare const _default: {
		handler: () => void
	}
	export = _default
}
`

		const correctedPatchText = correctPatch(patchText, targetFileContent)

		expect(correctedPatchText).toBe(`--- types/deps.d.ts
+++ types/deps.d.ts
@@ -4,6 +4,3 @@
-declare module 'tailwindcss-animate' {
-	declare const _default: {
-		handler: () => void
-	}
-	export = _default
-}
+// declare module 'some-untyped-pkg' {
+// 	export function foo(): void;
+// }
`)
	})

	it('vite.config.ts', () => {
		const patchText = `diff --git a/vite.config.ts b/vite.config.ts
index b4e95c3..cc5c292 100644
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -1,0 +2,2 @@ import { vitePlugin as remix } from '@remix-run/dev'
+import { sentryVitePlugin } from '@sentry/vite-plugin'
+import { glob } from 'glob'
@@ -9,0 +12 @@ export default defineConfig({
+
@@ -12,0 +16,2 @@ export default defineConfig({
+
+		sourcemap: true,
@@ -25,4 +30,5 @@ export default defineConfig({
-						// This is for server-side utilities you want to colocate next to
-						// your routes without making an additional directory.
-						// If you need a route that includes "server" or "client" in the
-						// filename, use the escape brackets like: my-route.[server].tsx
+						// This is for server-side utilities you want to colocate
+						// next to your routes without making an additional
+						// directory. If you need a route that includes "server" or
+						// "client" in the filename, use the escape brackets like:
+						// my-route.[server].tsx
@@ -34,0 +41,20 @@ export default defineConfig({
+		process.env.SENTRY_AUTH_TOKEN
+			? sentryVitePlugin({
+					disable: MODE !== 'production',
+					authToken: process.env.SENTRY_AUTH_TOKEN,
+					org: process.env.SENTRY_ORG,
+					project: process.env.SENTRY_PROJECT,
+					release: {
+						name: process.env.COMMIT_SHA,
+						setCommits: {
+							auto: true,
+						},
+					},
+					sourcemaps: {
+						filesToDeleteAfterUpload: await glob([
+							'./build/**/*.map',
+							'.server-build/**/*.map',
+						]),
+					},
+				})
+			: null,
`
		const targetFileContent = `import { vitePlugin as remix } from '@remix-run/dev'
import { flatRoutes } from 'remix-flat-routes'
import { defineConfig } from 'vite'

const MODE = process.env.NODE_ENV

export default defineConfig({
	build: {
		cssMinify: MODE === 'production',
		rollupOptions: {
			external: [/node:.*/, 'stream', 'crypto', 'fsevents'],
		},
	},
	plugins: [
		remix({
			ignoredRouteFiles: ['**/*'],
			serverModuleFormat: 'esm',
			routes: async defineRoutes => {
				return flatRoutes('routes', defineRoutes, {
					ignoredRouteFiles: [
						'.*',
						'**/*.css',
						'**/__*.*',
						// This is for server-side utilities you want to colocate next to
						// your routes without making an additional directory.
						// If you need a route that includes "server" or "client" in the
						// filename, use the escape brackets like: my-route.[server].tsx
						'**/*.server.*',
						'**/*.client.*',
					],
				})
			},
		}),
	],
})
`
		const correctedPatchText = correctPatch(patchText, targetFileContent)

		expect(correctedPatchText).toBe(`--- vite.config.ts
+++ vite.config.ts
@@ -1,0 +2,2 @@
+import { sentryVitePlugin } from '@sentry/vite-plugin'
+import { glob } from 'glob'
@@ -9,0 +12,1 @@
+
@@ -12,0 +16,2 @@
+
+		sourcemap: true,
@@ -24,4 +29,5 @@
-						// This is for server-side utilities you want to colocate next to
-						// your routes without making an additional directory.
-						// If you need a route that includes "server" or "client" in the
-						// filename, use the escape brackets like: my-route.[server].tsx
+						// This is for server-side utilities you want to colocate
+						// next to your routes without making an additional
+						// directory. If you need a route that includes "server" or
+						// "client" in the filename, use the escape brackets like:
+						// my-route.[server].tsx
@@ -22,0 +29,20 @@
+		process.env.SENTRY_AUTH_TOKEN
+			? sentryVitePlugin({
+					disable: MODE !== 'production',
+					authToken: process.env.SENTRY_AUTH_TOKEN,
+					org: process.env.SENTRY_ORG,
+					project: process.env.SENTRY_PROJECT,
+					release: {
+						name: process.env.COMMIT_SHA,
+						setCommits: {
+							auto: true,
+						},
+					},
+					sourcemaps: {
+						filesToDeleteAfterUpload: await glob([
+							'./build/**/*.map',
+							'.server-build/**/*.map',
+						]),
+					},
+				})
+			: null,
`)
	})

	it('package.json smol', () => {
		const patchText = `diff --git a/package.json b/package.json
index a8eace8..ab97654 100644
--- a/package.json
+++ b/package.json
@@ -12,7 +12,7 @@
 		"scripts": {
 		"build": "run-s build:*",
 		"build:icons": "tsx ./other/build-icons.ts",
-		"build:remix": "remix vite:build --sourcemapClient",
+		"build:remix": "remix vite:build --sourcemapClient --sourcemapServer",
 		"build:server": "tsx ./other/build-server.ts",
 		"predev": "npm run build:icons --silent",
 		"dev": "node ./server/dev-server.js",
@@ -62,7 +62,8 @@
 		"@remix-run/react": "2.8.0",
 		"@remix-run/server-runtime": "2.8.0",
 		"@sentry/profiling-node": "^7.105.0",
-		"@sentry/remix": "^7.105.0",
+		"@sentry/remix": "^7.107.0",
+		"@sentry/vite-plugin": "^2.15.0",
 		"address": "^2.0.2",
 		"bcryptjs": "^2.4.3",
 		"better-sqlite3": "^9.4.3",
`

		const targetFileContent = `{
	"name": "exercises__sep__01.create__sep__01.problem.nested-routing",
	"private": true,
	"sideEffects": false,
	"type": "module",
	"imports": {
		"#*": "./*"
	},
	"scripts": {
		"build": "run-s build:*",
		"build:icons": "tsx ./other/build-icons.ts",
		"build:remix": "remix vite:build --sourcemapClient",
		"build:server": "tsx ./other/build-server.ts",
		"predev": "npm run build:icons --silent",
		"dev": "node ./server/dev-server.js",
		"prisma:studio": "prisma studio",
		"format": "prettier --write .",
		"lint": "eslint .",
		"setup": "npm run build && prisma generate && prisma migrate deploy",
		"start": "cross-env NODE_ENV=production node .",
		"start:mocks": "cross-env NODE_ENV=production MOCKS=true tsx .",
		"typecheck": "tsc",
		"validate": "run-p lint typecheck"
	},
	"eslintIgnore": [
		"/node_modules",
		"/build",
		"/public/build",
		"/server-build"
	],
	"dependencies": {
		"@conform-to/react": "^1.0.2",
		"@conform-to/zod": "^1.0.2",
		"@epic-web/cachified": "^5.1.2",
		"@epic-web/client-hints": "^1.3.0",
		"@epic-web/invariant": "^1.0.0",
		"@epic-web/remember": "^1.0.2",
		"@epic-web/totp": "^1.1.2",
		"@kentcdodds/workshop-utils": "3.14.1",
		"@nasa-gcn/remix-seo": "^2.0.0",
		"@paralleldrive/cuid2": "^2.2.2",
		"@prisma/client": "^5.10.2",
		"@radix-ui/react-checkbox": "^1.0.4",
		"@radix-ui/react-dropdown-menu": "^2.0.6",
		"@radix-ui/react-label": "^2.0.2",
		"@radix-ui/react-slot": "^1.0.2",
		"@radix-ui/react-toast": "^1.1.5",
		"@radix-ui/react-tooltip": "^1.0.7",
		"@react-email/components": "0.0.15",
		"@remix-run/express": "2.8.1",
		"@remix-run/node": "2.8.1",
		"@remix-run/react": "2.8.1",
		"@remix-run/server-runtime": "2.8.1",
		"@sentry/profiling-node": "^7.105.0",
		"@sentry/remix": "^7.105.0",
		"address": "^2.0.2",
		"bcryptjs": "^2.4.3",
		"better-sqlite3": "^9.4.3",
		"chalk": "^5.3.0",
		"class-variance-authority": "^0.7.0",
		"close-with-grace": "^1.3.0",
		"clsx": "^2.1.0",
		"compression": "^1.7.4",
		"cookie": "^0.6.0",
		"cross-env": "^7.0.3",
		"crypto-js": "^4.2.0",
		"date-fns": "^3.3.1",
		"dotenv": "^16.4.5",
		"eslint-plugin-remix-react-routes": "^1.0.5",
		"execa": "^8.0.1",
		"express": "^4.18.3",
		"express-rate-limit": "^7.2.0",
		"get-port": "^7.0.0",
		"glob": "^10.3.10",
		"helmet": "^7.1.0",
		"intl-parse-accept-language": "^1.0.0",
		"isbot": "^5.1.1",
		"litefs-js": "^1.1.2",
		"lru-cache": "^10.2.0",
		"morgan": "^1.10.0",
		"prisma": "^5.10.2",
		"qrcode": "^1.5.3",
		"react": "^18.2.0",
		"react-dom": "^18.2.0",
		"remix-auth": "^3.6.0",
		"remix-auth-form": "^1.4.0",
		"remix-auth-github": "^1.6.0",
		"remix-utils": "^7.5.0",
		"set-cookie-parser": "^2.6.0",
		"sonner": "^1.4.3",
		"source-map-support": "^0.5.21",
		"spin-delay": "^1.2.0",
		"tailwind-merge": "^2.2.1",
		"tailwindcss": "^3.4.1",
		"tailwindcss-animate": "^1.0.7",
		"tailwindcss-radix": "^2.8.0",
		"zod": "^3.22.4"
	},
	"devDependencies": {
		"@faker-js/faker": "^8.4.1",
		"@remix-run/dev": "2.8.1",
		"@remix-run/eslint-config": "2.8.1",
		"@remix-run/serve": "2.8.1",
		"@remix-run/testing": "2.8.1",
		"@sly-cli/sly": "^1.10.0",
		"@total-typescript/ts-reset": "^0.5.1",
		"@types/bcryptjs": "^2.4.6",
		"@types/better-sqlite3": "^7.6.9",
		"@types/compression": "^1.7.5",
		"@types/cookie": "^0.6.0",
		"@types/eslint": "^8.56.5",
		"@types/express": "^4.17.21",
		"@types/fs-extra": "^11.0.4",
		"@types/glob": "^8.1.0",
		"@types/morgan": "^1.9.9",
		"@types/node": "^20.11.24",
		"@types/qrcode": "^1.5.5",
		"@types/react": "^18.2.63",
		"@types/react-dom": "^18.2.20",
		"@types/set-cookie-parser": "^2.4.7",
		"@types/source-map-support": "^0.5.10",
		"@vitejs/plugin-react": "^4.2.1",
		"autoprefixer": "^10.4.18",
		"enforce-unique": "^1.3.0",
		"esbuild": "^0.20.1",
		"eslint": "^8.57.0",
		"eslint-config-prettier": "^9.1.0",
		"fs-extra": "^11.2.0",
		"msw": "2.2.2",
		"node-html-parser": "^6.1.12",
		"npm-run-all": "^4.1.5",
		"prettier": "^3.2.5",
		"prettier-plugin-sql": "^0.18.0",
		"prettier-plugin-tailwindcss": "^0.5.11",
		"remix-flat-routes": "^0.6.4",
		"tsx": "^4.7.1",
		"typescript": "^5.4.5",
		"vite": "^5.1.5"
	},
	"engines": {
		"node": "20"
	},
	"epic-stack": true
}
`
		const correctedPatchText = correctPatch(patchText, targetFileContent)
		console.log(correctedPatchText)

		expect(correctedPatchText).toBe(`--- package.json
+++ package.json
@@ -12,1 +12,1 @@
-		"build:remix": "remix vite:build --sourcemapClient",
+		"build:remix": "remix vite:build --sourcemapClient --sourcemapServer",
@@ -52,7 +52,8 @@
 		"@remix-run/react": "2.8.0",
 		"@remix-run/server-runtime": "2.8.0",
 		"@sentry/profiling-node": "^7.105.0",
-		"@sentry/remix": "^7.105.0",
+		"@sentry/remix": "^7.107.0",
+		"@sentry/vite-plugin": "^2.15.0",
 		"address": "^2.0.2",
 		"bcryptjs": "^2.4.3",
 		"better-sqlite3": "^9.4.3",
`)
	})

	it('package.json', () => {
		const patchText = `diff --git a/package.json b/package.json
index ab97654..3337322 100644
--- a/package.json
+++ b/package.json
@@ -40,8 +40,8 @@
     "/server-build"
   ],
   "dependencies": {
-    "@conform-to/react": "^1.0.2",
-    "@conform-to/zod": "^1.0.2",
+    "@conform-to/react": "^1.0.4",
+    "@conform-to/zod": "^1.0.4",
     "@epic-web/cachified": "^5.1.2",
     "@epic-web/client-hints": "^1.3.0",
     "@epic-web/invariant": "^1.0.0",
@@ -49,7 +49,7 @@
     "@epic-web/totp": "^1.1.2",
     "@nasa-gcn/remix-seo": "^2.0.0",
     "@paralleldrive/cuid2": "^2.2.2",
-    "@prisma/client": "^5.10.2",
+    "@prisma/client": "^5.11.0",
     "@radix-ui/react-checkbox": "^1.0.4",
     "@radix-ui/react-dropdown-menu": "^2.0.6",
     "@radix-ui/react-label": "^2.0.2",
@@ -57,13 +57,13 @@
     "@radix-ui/react-toast": "^1.1.5",
     "@radix-ui/react-tooltip": "^1.0.7",
     "@react-email/components": "0.0.15",
-    "@remix-run/express": "2.8.0",
-    "@remix-run/node": "2.8.0",
-    "@remix-run/react": "2.8.0",
-    "@remix-run/server-runtime": "2.8.0",
-    "@sentry/profiling-node": "^7.105.0",
+    "@remix-run/express": "2.8.1",
+    "@remix-run/node": "2.8.1",
+    "@remix-run/react": "2.8.1",
+    "@remix-run/server-runtime": "2.8.1",
+    "@sentry/profiling-node": "^7.107.0",
     "@sentry/remix": "^7.107.0",
-    "@sentry/vite-plugin": "^2.15.0",
+    "@sentry/vite-plugin": "^2.16.0",
     "address": "^2.0.2",
     "bcryptjs": "^2.4.3",
     "better-sqlite3": "^9.4.3",
@@ -75,7 +75,7 @@
     "cookie": "^0.6.0",
     "cross-env": "^7.0.3",
     "crypto-js": "^4.2.0",
-    "date-fns": "^3.3.1",
+    "date-fns": "^3.6.0",
     "dotenv": "^16.4.5",
     "eslint-plugin-remix-react-routes": "^1.0.5",
     "execa": "^8.0.1",
@@ -85,23 +85,23 @@
     "glob": "^10.3.10",
     "helmet": "^7.1.0",
     "intl-parse-accept-language": "^1.0.0",
-    "isbot": "^5.1.1",
+    "isbot": "^5.1.2",
     "litefs-js": "^1.1.2",
     "lru-cache": "^10.2.0",
     "morgan": "^1.10.0",
-    "prisma": "^5.10.2",
+    "prisma": "^5.11.0",
     "qrcode": "^1.5.3",
     "react": "^18.2.0",
     "react-dom": "^18.2.0",
     "remix-auth": "^3.6.0",
     "remix-auth-form": "^1.4.0",
-    "remix-auth-github": "^1.6.0",
+    "remix-auth-github": "^1.7.0",
     "remix-utils": "^7.5.0",
     "set-cookie-parser": "^2.6.0",
     "sonner": "^1.4.3",
     "source-map-support": "^0.5.21",
-    "spin-delay": "^1.2.0",
-    "tailwind-merge": "^2.2.1",
+    "spin-delay": "^2.0.0",
+    "tailwind-merge": "^2.2.2",
     "tailwindcss": "^3.4.1",
     "tailwindcss-animate": "^1.0.7",
     "tailwindcss-radix": "^2.8.0",
@@ -110,10 +110,10 @@
   "devDependencies": {
     "@faker-js/faker": "^8.4.1",
     "@playwright/test": "^1.42.1",
-    "@remix-run/dev": "2.8.0",
-    "@remix-run/eslint-config": "2.8.0",
-    "@remix-run/serve": "2.8.0",
-    "@remix-run/testing": "2.8.0",
+    "@remix-run/dev": "2.8.1",
+    "@remix-run/eslint-config": "2.8.1",
+    "@remix-run/serve": "2.8.1",
+    "@remix-run/testing": "2.8.1",
     "@sly-cli/sly": "^1.10.0",
     "@testing-library/jest-dom": "^6.4.2",
     "@testing-library/react": "^14.2.1",
@@ -123,37 +123,37 @@
     "@types/better-sqlite3": "^7.6.9",
     "@types/compression": "^1.7.5",
     "@types/cookie": "^0.6.0",
-    "@types/eslint": "^8.56.5",
+    "@types/eslint": "^8.56.6",
     "@types/express": "^4.17.21",
     "@types/fs-extra": "^11.0.4",
     "@types/glob": "^8.1.0",
     "@types/morgan": "^1.9.9",
-    "@types/node": "^20.11.24",
+    "@types/node": "^20.11.30",
     "@types/qrcode": "^1.5.5",
-    "@types/react": "^18.2.63",
-    "@types/react-dom": "^18.2.20",
+    "@types/react": "^18.2.67",
+    "@types/react-dom": "^18.2.22",
     "@types/set-cookie-parser": "^2.4.7",
     "@types/source-map-support": "^0.5.10",
     "@vitejs/plugin-react": "^4.2.1",
-    "@vitest/coverage-v8": "^1.3.1",
+    "@vitest/coverage-v8": "^1.4.0",
     "autoprefixer": "^10.4.18",
     "enforce-unique": "^1.3.0",
-    "esbuild": "^0.20.1",
+    "esbuild": "^0.20.2",
     "eslint": "^8.57.0",
     "eslint-config-prettier": "^9.1.0",
     "fs-extra": "^11.2.0",
     "jsdom": "^24.0.0",
-    "msw": "2.2.2",
+    "msw": "2.2.8",
     "node-html-parser": "^6.1.12",
     "npm-run-all": "^4.1.5",
     "prettier": "^3.2.5",
     "prettier-plugin-sql": "^0.18.0",
-    "prettier-plugin-tailwindcss": "^0.5.11",
+    "prettier-plugin-tailwindcss": "^0.5.12",
     "remix-flat-routes": "^0.6.4",
     "tsx": "^4.7.1",
-    "typescript": "^5.3.3",
-    "vite": "^5.1.5",
-    "vitest": "^1.3.1"
+    "typescript": "^5.4.2",
+    "vite": "^5.1.6",
+    "vitest": "^1.4.0"
   },
   "engines": {
     "node": "20"
`

		const targetFileContent = `
{
  "name": "exercises__sep__01.create__sep__01.problem.nested-routing",
  "private": true,
  "sideEffects": false,
  "type": "module",
  "imports": {
    "#*": "./*"
  },
  "scripts": {
    "build": "run-s build:*",
    "build:icons": "tsx ./other/build-icons.ts",
    "build:remix": "remix vite:build --sourcemapClient --sourcemapServer",
    "build:server": "tsx ./other/build-server.ts",
    "predev": "npm run build:icons --silent",
    "dev": "node ./server/dev-server.js",
    "prisma:studio": "prisma studio",
    "format": "prettier --write .",
    "lint": "eslint .",
    "setup": "npm run build && prisma generate && prisma migrate deploy",
    "start": "cross-env NODE_ENV=production node .",
    "start:mocks": "cross-env NODE_ENV=production MOCKS=true tsx .",
    "typecheck": "tsc",
    "validate": "run-p lint typecheck"
  },
  "eslintIgnore": [
    "/node_modules",
    "/build",
    "/public/build",
    "/server-build"
  ],
  "dependencies": {
    "@conform-to/react": "^1.0.2",
    "@conform-to/zod": "^1.0.2",
    "@epic-web/cachified": "^5.1.2",
    "@epic-web/client-hints": "^1.3.0",
    "@epic-web/invariant": "^1.0.0",
    "@epic-web/remember": "^1.0.2",
    "@epic-web/totp": "^1.1.2",
    "@kentcdodds/workshop-utils": "3.14.1",
    "@nasa-gcn/remix-seo": "^2.0.0",
    "@paralleldrive/cuid2": "^2.2.2",
    "@prisma/client": "^5.10.2",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@react-email/components": "0.0.15",
    "@remix-run/express": "2.8.1",
    "@remix-run/node": "2.8.1",
    "@remix-run/react": "2.8.1",
    "@remix-run/server-runtime": "2.8.1",
    "@sentry/profiling-node": "^7.105.0",
    "@sentry/remix": "^7.107.0",
    "@sentry/vite-plugin": "^2.15.0",    "address": "^2.0.2",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^9.4.3",
    "chalk": "^5.3.0",
    "class-variance-authority": "^0.7.0",
    "close-with-grace": "^1.3.0",
    "clsx": "^2.1.0",
    "compression": "^1.7.4",
    "cookie": "^0.6.0",
    "cross-env": "^7.0.3",
    "crypto-js": "^4.2.0",
    "date-fns": "^3.3.1",
    "dotenv": "^16.4.5",
    "eslint-plugin-remix-react-routes": "^1.0.5",
    "execa": "^8.0.1",
    "express": "^4.18.3",
    "express-rate-limit": "^7.2.0",
    "get-port": "^7.0.0",
    "glob": "^10.3.10",
    "helmet": "^7.1.0",
    "intl-parse-accept-language": "^1.0.0",
    "isbot": "^5.1.1",
    "litefs-js": "^1.1.2",
    "lru-cache": "^10.2.0",
    "morgan": "^1.10.0",
    "prisma": "^5.10.2",
    "qrcode": "^1.5.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "remix-auth": "^3.6.0",
    "remix-auth-form": "^1.4.0",
    "remix-auth-github": "^1.6.0",
    "remix-utils": "^7.5.0",
    "set-cookie-parser": "^2.6.0",
    "sonner": "^1.4.3",
    "source-map-support": "^0.5.21",
    "spin-delay": "^1.2.0",
    "tailwind-merge": "^2.2.1",
    "tailwindcss": "^3.4.1",
    "tailwindcss-animate": "^1.0.7",
    "tailwindcss-radix": "^2.8.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@faker-js/faker": "^8.4.1",
    "@remix-run/dev": "2.8.1",
    "@remix-run/eslint-config": "2.8.1",
    "@remix-run/serve": "2.8.1",
    "@remix-run/testing": "2.8.1",
    "@sly-cli/sly": "^1.10.0",
    "@total-typescript/ts-reset": "^0.5.1",
    "@types/bcryptjs": "^2.4.6",
    "@types/better-sqlite3": "^7.6.9",
    "@types/compression": "^1.7.5",
    "@types/cookie": "^0.6.0",
    "@types/eslint": "^8.56.5",
    "@types/express": "^4.17.21",
    "@types/fs-extra": "^11.0.4",
    "@types/glob": "^8.1.0",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.11.24",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^18.2.63",
    "@types/react-dom": "^18.2.20",
    "@types/set-cookie-parser": "^2.4.7",
    "@types/source-map-support": "^0.5.10",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "enforce-unique": "^1.3.0",
    "esbuild": "^0.20.1",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "fs-extra": "^11.2.0",
    "msw": "2.2.2",
    "node-html-parser": "^6.1.12",
    "npm-run-all": "^4.1.5",
    "prettier": "^3.2.5",
    "prettier-plugin-sql": "^0.18.0",
    "prettier-plugin-tailwindcss": "^0.5.11",
    "remix-flat-routes": "^0.6.4",
    "tsx": "^4.7.1",
    "typescript": "^5.4.5",
    "vite": "^5.1.5"
  },
  "engines": {
    "node": "20"
  },
  "epic-stack": true
}`
		const correctedPatchText = correctPatch(patchText, targetFileContent)
		console.log(correctedPatchText)

		expect(correctedPatchText).toBe(`--- package.json
+++ package.json
@@ -29,2 +29,2 @@
-    "@conform-to/react": "^1.0.2",
-    "@conform-to/zod": "^1.0.2",
+    "@conform-to/react": "^1.0.4",
+    "@conform-to/zod": "^1.0.4",
@@ -38,1 +38,1 @@
-    "@prisma/client": "^5.10.2",
+    "@prisma/client": "^5.11.0",
@@ -47,6 +47,6 @@
-    "@remix-run/express": "2.8.1",
-    "@remix-run/node": "2.8.1",
-    "@remix-run/react": "2.8.1",
-    "@remix-run/server-runtime": "2.8.1",
-    "@sentry/profiling-node": "^7.105.0",
+    "@remix-run/express": "2.8.1",
+    "@remix-run/node": "2.8.1",
+    "@remix-run/react": "2.8.1",
+    "@remix-run/server-runtime": "2.8.1",
+    "@sentry/profiling-node": "^7.107.0",
-    "@sentry/vite-plugin": "^2.15.0",
+    "@sentry/vite-plugin": "^2.16.0",
@@ -65,1 +65,1 @@
-    "date-fns": "^3.3.1",
+    "date-fns": "^3.6.0",
@@ -75,5 +75,5 @@
-    "isbot": "^5.1.1",
+    "isbot": "^5.1.2",
-    "prisma": "^5.10.2",
+    "prisma": "^5.11.0",
-    "remix-auth-github": "^1.6.0",
+    "remix-auth-github": "^1.7.0",
-    "spin-delay": "^1.2.0",
-    "tailwind-merge": "^2.2.1",
+    "spin-delay": "^2.0.0",
+    "tailwind-merge": "^2.2.2",
@@ -100,4 +100,4 @@
-    "@remix-run/dev": "2.8.0",
-    "@remix-run/eslint-config": "2.8.1",
-    "@remix-run/serve": "2.8.1",
-    "@remix-run/testing": "2.8.1",
+    "@remix-run/dev": "2.8.1",
+    "@remix-run/eslint-config": "2.8.1",
+    "@remix-run/serve": "2.8.1",
+    "@remix-run/testing": "2.8.1",
@@ -109,11 +109,11 @@
-    "@types/eslint": "^8.56.5",
+    "@types/eslint": "^8.56.6",
-    "@types/node": "^20.11.24",
+    "@types/node": "^20.11.30",
-    "@types/react": "^18.2.63",
-    "@types/react-dom": "^18.2.20",
+    "@types/react": "^18.2.67",
+    "@types/react-dom": "^18.2.22",
-    "@vitest/coverage-v8": "^1.3.1",
+    "@vitest/coverage-v8": "^1.4.0",
-    "esbuild": "^0.20.1",
+    "esbuild": "^0.20.2",
-    "msw": "2.2.2",
+    "msw": "2.2.8",
-    "prettier-plugin-tailwindcss": "^0.5.11",
+    "prettier-plugin-tailwindcss": "^0.5.12",
-    "typescript": "^5.4.5",
-    "vite": "^5.1.5"
-    "vitest": "^1.3.1"
+    "typescript": "^5.4.2",
+    "vite": "^5.1.6",
+    "vitest": "^1.4.0"
`)
	})

	it('root.tsx', () => {
		const patchText = `diff --git a/app/root.tsx b/app/root.tsx
index d984345..4d86eb7 100644
--- a/app/root.tsx
+++ b/app/root.tsx
@@ -183,0 +184 @@ function Document({
+	allowIndexing = true,
@@ -188,0 +190 @@ function Document({
+	allowIndexing?: boolean
@@ -196,0 +199,3 @@ function Document({
+				{allowIndexing ? null : (
+					<meta name="robots" content="noindex, nofollow" />
+				)}
@@ -221,0 +227 @@ function App() {
+	const allowIndexing = data.ENV.ALLOW_INDEXING !== 'false'
@@ -225 +231,6 @@ function App() {
-		<Document nonce={nonce} theme={theme} env={data.ENV}>
+		<Document
+			nonce={nonce}
+			theme={theme}
+			allowIndexing={allowIndexing}
+			env={data.ENV}
+		>
`

		const targetFileContent = `import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node'
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useFetchers,
	useLoaderData,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { EpicProgress } from './components/progress-bar.tsx'
import { useToast } from './components/toaster.tsx'
import { href as iconsHref } from './components/ui/icon.tsx'
import { EpicToaster } from './components/ui/sonner.tsx'
import { KCDShop } from './kcdshop.tsx'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints, useHints } from './utils/client-hints.tsx'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { combineHeaders, getDomainUrl } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { useRequestInfo } from './utils/request-info.ts'
import { type Theme, setTheme, getTheme } from './utils/theme.server.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'

export const links: LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconsHref, as: 'image' },
		// Preload CSS as a resource to avoid render blocking
		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
		{
			rel: 'alternate icon',
			type: 'image/png',
			href: '/favicons/favicon-32x32.png',
		},
		{ rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon.png' },
		{
			rel: 'manifest',
			href: '/site.webmanifest',
			crossOrigin: 'use-credentials',
		} as const, // necessary to make typescript happy
		//These should match the css preloads above to avoid css as render blocking resource
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
	].filter(Boolean)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [
		{ title: data ? 'Epic Notes' : 'Error | Epic Notes' },
		{ name: 'description', content: \`Your own captain's log\` },
	]
}

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const user = userId
		? await time(
				() =>
					prisma.user.findUniqueOrThrow({
						select: {
							id: true,
							name: true,
							username: true,
							image: { select: { id: true } },
							roles: {
								select: {
									name: true,
									permissions: {
										select: { entity: true, action: true, access: true },
									},
								},
							},
						},
						where: { id: userId },
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: '/' })
	}
	const { toast, headers: toastHeaders } = await getToast(request)
	const honeyProps = honeypot.getInputProps()

	return json(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				userPrefs: {
					theme: getTheme(request),
				},
			},
			ENV: getEnv(),
			toast,
			honeyProps,
		},
		{
			headers: combineHeaders(
				{ 'Server-Timing': timings.toString() },
				toastHeaders,
			),
		},
	)
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	const headers = {
		'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
	}
	return headers
}

const ThemeFormSchema = z.object({
	theme: z.enum(['system', 'light', 'dark']),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: ThemeFormSchema,
	})

	invariantResponse(submission.status === 'success', 'Invalid theme received')

	const { theme } = submission.value

	const responseInit = {
		headers: { 'set-cookie': setTheme(theme) },
	}
	return json({ result: submission.reply() }, responseInit)
}

function Document({
	children,
	nonce,
	theme = 'light',
	env = {},
}: {
	children: React.ReactNode
	nonce: string
	theme?: Theme
	env?: Record<string, string>
}) {
	return (
		<html lang="en" className={\`\${theme} h-full overflow-x-hidden\`}>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<Links />
			</head>
			<body className="bg-background text-foreground">
				{children}
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: \`window.ENV = \${JSON.stringify(env)}\`,
					}}
				/>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
				<KCDShop />
			</body>
		</html>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const nonce = useNonce()
	const theme = useTheme()
	useToast(data.toast)

	return (
		<Document nonce={nonce} theme={theme} env={data.ENV}>
			<Outlet />
			<EpicToaster closeButton position="top-center" theme={theme} />
			<EpicProgress />
		</Document>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<HoneypotProvider {...data.honeyProps}>
			<App />
		</HoneypotProvider>
	)
}

export default withSentry(AppWithProviders)

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
	const hints = useHints()
	const requestInfo = useRequestInfo()
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? hints.theme : optimisticMode
	}
	return requestInfo.userPrefs.theme ?? hints.theme
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
	const fetchers = useFetchers()
	const themeFetcher = fetchers.find(f => f.formAction === '/')

	if (themeFetcher && themeFetcher.formData) {
		const submission = parseWithZod(themeFetcher.formData, {
			schema: ThemeFormSchema,
		})

		if (submission.status === 'success') {
			return submission.value.theme
		}
	}
}

export function ErrorBoundary() {
	// the nonce doesn't rely on the loader so we can access that
	const nonce = useNonce()

	// NOTE: you cannot use useLoaderData in an ErrorBoundary because the loader
	// likely failed to run so we have to do the best we can.
	// We could probably do better than this (it's possible the loader did run).
	// This would require a change in Remix.

	// Just make sure your root route never errors out and you'll always be able
	// to give the user a better UX.

	return (
		<Document nonce={nonce}>
			<GeneralErrorBoundary />
		</Document>
	)
}`

		const correctedPatchText = correctPatch(patchText, targetFileContent)

		expect(correctedPatchText).toBe(`--- app/root.tsx
+++ app/root.tsx
@@ -165,0 +166,1 @@
+	allowIndexing = true,
theme = 'light',
@@ -172,0 +173,1 @@
+	allowIndexing?: boolean
theme?: Theme
@@ -182,0 +185,3 @@
+				{allowIndexing ? null : (
+					<meta name="robots" content="noindex, nofollow" />
+				)}
@@ -209,0 +210,1 @@
+	const allowIndexing = data.ENV.ALLOW_INDEXING !== 'false'
@@ -211,1 +217,6 @@
-		<Document nonce={nonce} theme={theme} env={data.ENV}>
+		<Document
+			nonce={nonce}
+			theme={theme}
+			allowIndexing={allowIndexing}
+			env={data.ENV}
+		>
`)
	})

	it('Dockerfile', () => {
		const patchText = `diff --git a/other/Dockerfile b/other/Dockerfile
index 82652ba..a7671ba 100644
--- a/other/Dockerfile
+++ b/other/Dockerfile
@@ -29,6 +29,9 @@ RUN npm prune --omit=dev
 # Build the app
 FROM base as build
 
+ARG COMMIT_SHA
+ENV COMMIT_SHA=$COMMIT_SHA
+
 WORKDIR /myapp
 
 COPY --from=deps /myapp/node_modules /myapp/node_modules
@@ -37,7 +40,11 @@ ADD prisma .
 RUN npx prisma generate
 
 ADD . .
-RUN npm run build
+
+# Mount the secret and set it as an environment variable and run the build
+RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
+    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
+    npm run build
 
 # Finally, build the production image with minimal footprint
 FROM base
`

		const targetFileContent = `# This file is moved to the root directory before building the image

# base node image
FROM node:20-bookworm-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV production

# Install openssl for Prisma
RUN apt-get update && apt-get install -y fuse3 openssl sqlite3 ca-certificates

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /myapp

ADD package.json package-lock.json .npmrc ./
RUN npm install --include=dev

# Setup production node_modules
FROM base as production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD package.json package-lock.json .npmrc ./
RUN npm prune --omit=dev

# Build the app
FROM base as build
ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA


WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules

ADD prisma .
RUN npx prisma generate

ADD . .
# Mount the secret and set it as an environment variable and run the build
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
    npm run build


# Finally, build the production image with minimal footprint
FROM base

ENV FLY="true"
ENV LITEFS_DIR="/litefs/data"
ENV DATABASE_FILENAME="sqlite.db"
ENV DATABASE_PATH="$LITEFS_DIR/$DATABASE_FILENAME"
ENV DATABASE_URL="file:$DATABASE_PATH"
ENV CACHE_DATABASE_FILENAME="cache.db"
ENV CACHE_DATABASE_PATH="$LITEFS_DIR/$CACHE_DATABASE_FILENAME"
ENV INTERNAL_PORT="8080"
ENV PORT="8081"
ENV NODE_ENV="production"
# For WAL support: https://github.com/prisma/prisma-engines/issues/4675#issuecomment-1914383246
ENV PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1"

# add shortcut for connecting to database CLI
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$DATABASE_URL" > /usr/local/bin/database-cli && chmod +x /usr/local/bin/database-cli

WORKDIR /myapp

COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/node_modules/.prisma /myapp/node_modules/.prisma

COPY --from=build /myapp/server-build /myapp/server-build
COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/package.json /myapp/package.json
COPY --from=build /myapp/prisma /myapp/prisma
COPY --from=build /myapp/app/components/ui/icons /myapp/app/components/ui/icons

# prepare for litefs
COPY --from=flyio/litefs:0.5.11 /usr/local/bin/litefs /usr/local/bin/litefs
ADD other/litefs.yml /etc/litefs.yml
RUN mkdir -p /data \${LITEFS_DIR}

ADD . .

CMD ["litefs", "mount"]
`
		const correctedPatchText = correctPatch(patchText, targetFileContent)
		console.log(correctedPatchText)

		expect(correctedPatchText).toBe(`--- other/Dockerfile
+++ other/Dockerfile
@@ -29,6 +29,9 @@
 # Build the app
 FROM base as build
 
+ARG COMMIT_SHA
+ENV COMMIT_SHA=$COMMIT_SHA
+
 WORKDIR /myapp
 
 COPY --from=deps /myapp/node_modules /myapp/node_modules
@@ -40,5 +40,9 @@
-RUN npm run build
+
+# Mount the secret and set it as an environment variable and run the build
+RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
+    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) && \
+    npm run build
 
 # Finally, build the production image with minimal footprint
 FROM base
`)
	})
})
