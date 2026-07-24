# JSR Publication Plan

## Goal

Publish `@grammyjs/parse-mode` to JSR as native TypeScript and synchronous ESM while preserving the existing npm CommonJS package for Node.js 14 users.

The intended near-term distribution model is:

| Registry | Published format                        | Intended consumers                                |
| -------- | --------------------------------------- | ------------------------------------------------- |
| JSR      | TypeScript source, distributed as ESM   | Deno, ESM projects, bundlers, and modern Node.js  |
| npm      | deno2node-generated CommonJS in `dist/` | Existing CommonJS consumers, including Node.js 14 |

The two publications should expose the same public API and use synchronized versions for all future coordinated releases.

## Current audit snapshot

The audit was performed with Deno 2.9.3. No repository changes were needed to obtain these findings.

- `deno publish --dry-run` stops because `deno.jsonc` does not contain the required JSR `name`, `version`, and `exports` fields.
- After temporarily adding the required metadata, the publish check reports 75 problems:
  - One unsupported external HTTPS import in `src/deps.deno.ts`.
  - 71 public functions or methods without explicit return types.
  - Three public variables without explicit types.
- After temporarily replacing the HTTPS import, `deno publish --dry-run --allow-slow-types` succeeds.
- The runtime module graph contains no top-level `await`, so it is synchronous ESM.
- The existing root `LICENSE` satisfies JSR's licensing requirement.
- The existing package is comfortably below JSR's package size limits.
- The `@grammyjs` JSR scope exists. A scope administrator still needs to create `@grammyjs/parse-mode`, grant publishing access, and link the GitHub repository.

## Caveats and compatibility decisions

### JSR is ESM-only

JSR does not publish CommonJS modules or a CommonJS fallback. JSR publishes the TypeScript source and generates ESM JavaScript and declarations for its npm compatibility layer.

The current `src/` implementation is already ESM. The CommonJS code under `dist/` is generated only for npm and should not be part of the JSR publication.

References:

- [JSR publishing rules](https://jsr.io/docs/publishing-packages)
- [JSR package configuration](https://jsr.io/docs/package-configuration)
- [JSR npm compatibility layer](https://jsr.io/docs/npm-compatibility)

### Synchronous ESM can only be required on sufficiently new Node.js

Node.js can synchronously `require()` an ESM module only if the complete runtime module graph has no top-level `await`.

- The feature is available without a flag starting in Node.js 20.19 and 22.12.
- Node.js 14 cannot synchronously require an ESM-only package.
- Node.js 20 is now end-of-life. If the project later drops Node.js 14, the practical supported floor should be Node.js 22.12 or a currently supported LTS release, rather than an unrestricted `>=20` declaration.
- JSR's own Node.js documentation still presents ESM projects as its supported consumption path. CommonJS `require()` of the JSR ESM package should therefore be treated as modern Node.js interoperability and covered by this project's own tests.

References:

- [Node.js `require(esm)` behavior](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)
- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Using JSR with Node.js](https://jsr.io/docs/with/node)

### Slow types should not be bypassed for a stable release

JSR permits `--allow-slow-types`, but using it prevents declaration generation for Node.js consumers and degrades generated API documentation and type-checking performance. It is acceptable for local investigation, but it should not be used for a stable publication of this library.

Reference: [JSR slow types](https://jsr.io/docs/about-slow-types)

### Publishing to JSR does not require dropping Node.js 14

JSR and npm can be published independently from the same source tree:

- JSR receives the TypeScript ESM source.
- npm continues to receive the generated CommonJS `dist/` output.
- Existing Node.js 14 users continue installing from npm.
- Modern users may install from JSR through native JSR support or its npm compatibility layer.

## Checklist: work that can be completed while retaining Node.js 14

### 1. Add JSR package configuration

- [ ] Add the following fields to `deno.jsonc`:
  - [ ] `"name": "@grammyjs/parse-mode"`.
  - [ ] `"version"` matching `package.json`.
  - [ ] `"exports": "./src/mod.ts"`.
  - [ ] `"license": "MIT"` for explicit metadata, while retaining `LICENSE`.
- [ ] Add a JSR-only publication filter:

  ```jsonc
  "publish": {
    "include": ["LICENSE", "README.md", "src/**/*.ts"]
  }
  ```

- [ ] Confirm that `dist/`, tests, coverage output, editor settings, CI files, and agent instructions are absent from the dry-run file list.
- [ ] Decide whether `src/deps.node.ts` should remain in the JSR tarball. It is harmless, but it is used only by the npm build and can be excluded for a minimal JSR package.

### 2. Replace the unsupported HTTPS type dependency

- [ ] Replace the `https://lib.deno.dev/x/grammy@^1.41/types.ts` export in `src/deps.deno.ts` with a JSR-supported dependency form.
- [ ] Prefer one of these validated approaches:
  - [ ] Explicit and self-contained: `npm:grammy@^1.41/types`.
  - [ ] Manifest-backed: `grammy/types`, using the version from `package.json`.
- [ ] Keep `src/deps.deno.ts` and `src/deps.node.ts` aligned with identical exported symbols.
- [ ] Confirm that the selected dependency form preserves the desired grammY peer-dependency behavior in the generated JSR npm-compatibility package.
- [ ] Run `deno task check` after the change.
- [ ] Run `deno task build` to verify that deno2node still rewrites the Deno dependency module correctly for npm.

The JSR `@grammyjs/grammy` package currently contains grammY 2.0 prereleases, so it is not a drop-in replacement for this project's `grammy@^1.41` type dependency.

### 3. Resolve all slow-type diagnostics

- [ ] Add explicit `EntityTag` return types to the 17 exported formatter functions in `src/entity-tag.ts`.
- [ ] Add explicit return types to the 54 public getters, static methods, instance methods, and exported functions reported in `src/format.ts`.
- [ ] Add explicit types to these public values in `src/stream-html-to-format.ts`:
  - [ ] `supportedBareAttributesSet`.
  - [ ] `supportedValuedAttributesSet`.
  - [ ] `tagsToRequiredAttributes`.
- [ ] Re-run `deno publish --dry-run` without `--allow-slow-types`.
- [ ] Do not suppress `no-slow-types` globally and do not make `--allow-slow-types` part of the release command.

Type annotations should describe the existing inferred API and must not change runtime behavior.

### 4. Improve JSR-facing documentation

- [ ] Add module-level JSDoc with an `@module` annotation to `src/mod.ts`.
- [ ] Ensure every public export reachable from `src/mod.ts` has useful JSDoc.
- [ ] Add installation and import examples for:
  - [ ] Deno with `deno add jsr:@grammyjs/parse-mode`.
  - [ ] Direct Deno usage with `jsr:@grammyjs/parse-mode`.
  - [ ] Node.js ESM through JSR's npm compatibility layer.
  - [ ] Existing npm CommonJS users.
- [ ] Explain that CommonJS `require()` of the JSR distribution requires a modern Node.js release.
- [ ] Keep `README.md` and `src/README.md` synchronized, as required by this repository's contribution guide.
- [ ] Fix the existing malformed examples in `src/README.md` while synchronizing the files.

Documentation coverage is not a publication blocker, but it affects generated documentation, discoverability, and the JSR package score.

### 5. Add local and CI verification

- [ ] Add a `deno task` for `deno publish --dry-run` so contributors use one canonical command.
- [ ] Add the dry-run task to pull-request CI.
- [ ] Keep `deno task ok` as the normal format, lint, test, and type-check gate.
- [ ] Run `deno task build` for every change affecting public types or entrypoints.
- [ ] Add or retain tests for all supported consumption modes:
  - [ ] Direct Deno source import.
  - [ ] npm CommonJS build on Node.js 14.
  - [ ] npm CommonJS build on a current Node.js LTS release.
  - [ ] JSR/native ESM on Deno.
  - [ ] JSR npm-compatibility ESM import on Node.js 22 and 24.
  - [ ] CommonJS `require()` of the JSR npm-compatibility package on Node.js 22.12 or newer.
- [ ] Confirm that named exports have the expected CommonJS namespace shape:

  ```js
  const { fmt, FormattedString } = require("@grammyjs/parse-mode");
  ```

- [ ] Add a guard or integration test that fails if top-level `await` is introduced into the JSR runtime graph.

Tests that install the actual JSR artifact can be enabled after publishing a prerelease version. Until then, equivalent local ESM output may be used for the Node.js interoperability test.

### 6. Prepare the JSR package and release workflow

- [ ] Ask an `@grammyjs` scope administrator to create `@grammyjs/parse-mode` on JSR.
- [ ] Link the JSR package to `grammyjs/parse-mode` on GitHub.
- [ ] Configure runtime compatibility on the JSR package page for the runtimes actually tested.
- [ ] Add a GitHub Actions publication workflow using OIDC:
  - [ ] Grant `contents: read`.
  - [ ] Grant `id-token: write`.
  - [ ] Run the full validation suite before publishing.
  - [ ] Publish using `deno publish` or `npx jsr publish` without `--allow-slow-types`.
  - [ ] Trigger publication from an intentional tag, release, or manual workflow rather than every push.
- [ ] Preserve provenance by publishing from the linked GitHub Actions workflow.
- [ ] Decide whether the first JSR version should backfill `2.3.0` or begin with the next coordinated npm/JSR release.
- [ ] Publish a prerelease version first and test it through native JSR and the npm compatibility layer.
- [ ] Verify the generated documentation, exported symbols, dependency metadata, files, license, and installation commands on jsr.io.
- [ ] Publish the stable version only after the prerelease consumption tests pass.

### 7. Preserve the npm CommonJS release during the transition

- [ ] Retain `package.json`'s CommonJS `main` and declaration `types` entries.
- [ ] Retain the deno2node build and `src/deps.node.ts`.
- [ ] Continue publishing `dist/` only to npm.
- [ ] Keep the npm Node.js engine range unchanged while Node.js 14 support remains a project requirement.
- [ ] Verify that adding JSR metadata to `deno.jsonc` does not change the npm tarball produced by `npm pack`.
- [ ] Document which registry supplies which module format so consumers do not assume that the JSR package is a Node.js 14 replacement.

## Checklist: work gated on dropping Node.js 14

These tasks are not required to publish to JSR. They become possible only when the project is ready to make a breaking Node.js compatibility change.

### Choose and enforce the modern Node.js floor

- [ ] Make the Node.js support change in a major release.
- [ ] Choose an exact minimum version that supports unflagged synchronous `require(esm)`:
  - [ ] Absolute technical minimum: Node.js `>=20.19`.
  - [ ] Recommended maintained baseline: Node.js `>=22.12`, or the oldest supported LTS release at migration time.
- [ ] Do not declare only `>=20`; Node.js 20.0 through 20.18 do not provide the same unflagged `require(esm)` behavior.
- [ ] Update `package.json#engines`, CI matrices, README files, and release notes together.

### Consider converging the npm package on ESM

- [ ] Decide whether npm should become ESM-only or remain dual-format.
- [ ] If npm becomes ESM-only:
  - [ ] Add `"type": "module"` and an explicit `exports` map.
  - [ ] Point npm entrypoints at ESM output or an appropriate TypeScript-to-ESM build.
  - [ ] Remove the CommonJS-only `main` contract.
  - [ ] Remove the deno2node CommonJS build after all npm consumers have a supported migration path.
  - [ ] Remove `src/deps.node.ts` if runtime-specific dependency rewriting is no longer needed.
  - [ ] Update CommonJS examples to state the modern Node.js minimum for synchronous `require()`.
- [ ] If npm remains dual-format:
  - [ ] Provide explicit `import` and `require` export conditions.
  - [ ] Test for the dual-package hazard when the same package is loaded through both formats.
  - [ ] Consider Node.js's `module-sync` condition for selecting synchronous ESM on modern Node.js while a CommonJS fallback still exists.
- [ ] Verify that `require()` returns the intended namespace shape and that no dependency introduces top-level `await`.

### Remove legacy compatibility promises

- [ ] Remove Node.js 14 from CI and documentation only after the breaking release is published.
- [ ] Announce that the JSR and npm distributions are both modern ESM if that convergence is chosen.
- [ ] Provide a final CommonJS release line or documented version pin for users who cannot upgrade Node.js.
- [ ] Retain security and bug-fix expectations appropriate for any supported legacy release line.

## Release definition of done

The project is JSR-ready when all of the following are true:

- [ ] `deno task ok` passes.
- [ ] `deno task build` passes.
- [ ] `deno publish --dry-run` passes without `--allow-slow-types`.
- [ ] The dry-run publishes only the intended source, README, license, and configuration files.
- [ ] The JSR dependency graph contains no unsupported HTTPS imports and no top-level `await`.
- [ ] npm CommonJS tests still pass on Node.js 14.
- [ ] JSR ESM tests pass on Deno and current Node.js LTS releases.
- [ ] CommonJS `require()` of the JSR npm-compatibility artifact passes on the documented modern Node.js minimum.
- [ ] README files, JSDoc, version metadata, and installation guidance are synchronized.
- [ ] The JSR package exists under `@grammyjs`, is linked to GitHub, and has an OIDC publication workflow.
- [ ] A prerelease has been installed and tested through every documented package-manager path.

## Open decisions

- [ ] Select explicit `npm:` or package-manifest resolution for the grammY 1.x type dependency.
- [ ] Decide whether the first JSR publication backfills version `2.3.0` or starts with the next release.
- [ ] Decide whether `src/deps.node.ts` should be excluded from the JSR tarball.
- [ ] Select the long-term Node.js minimum when Node.js 14 support is eventually removed.
- [ ] Decide whether the future npm package should be ESM-only or dual-format.
