# CoogsNation v2.5.3 — Profile and Signup Fixes

## Owner decisions implemented

The signup/profile form now requires only:

- First name
- Last name
- Primary email
- Password and confirmation for local accounts
- Date of birth
- Required data-use consent

All other profile fields are optional.

## Changes

### Optional fields now behave as optional

Blank values are accepted and normalized for:

- Handle
- Backup email
- Street address, city, state, ZIP code, address line, and country
- Graduation year
- Member category and affiliation
- Social links
- Major/department, interests, comments, sports, and marketing choices

A blank handle no longer disables the Join button. Members without a handle are displayed by their name instead.

Name and address duplication checks were removed because different people can legitimately share a name or household address. Primary email and any supplied handle remain unique identifiers.

### Avatar selection during signup

Members may select an avatar before submitting the registration form.

Accepted formats:

- JPEG/JPG
- PNG
- WebP
- Maximum upload size: 2 MB

The server content-sniffs the image with Sharp, rejects unsafe/unsupported content, limits decoded pixel count, applies orientation, strips metadata by re-encoding, resizes to fit within 500 × 500, and stores the result as JPEG. SVG and other active/document formats remain blocked.

For local registration, the account is created and signed in before the selected avatar is sent through the authenticated avatar endpoint. Failure to auto-sign-in or upload the avatar does not falsely report that account creation failed.

### Development reCAPTCHA behavior

The client displays reCAPTCHA when `VITE_RECAPTCHA_SITE_KEY` is configured.

Codespaces/local development may use:

```env
RECAPTCHA_DEV_BYPASS=true
```

The server ignores this bypass when `NODE_ENV=production`.

### Release label

`package.json` and `package-lock.json` now report version `2.5.3`.

## Changed files

- `.env.example`
- `package.json`
- `package-lock.json`
- `shared/schema.ts`
- `server/routes.ts`
- `client/src/pages/ProfileCompletion.tsx`
- `client/src/components/ProfileDisplay.tsx`
- `client/src/pages/AdvancedProfile.tsx`
- `scripts/profile-form-contract-check.ts`

## Validation performed in the artifact environment

- TypeScript/TSX syntax transpilation passed for every changed source and test file.
- JSON parsing passed for both package manifests.
- Whitespace/diff checks passed.
- A regression test was added to assert that a minimal registration succeeds and blank optional fields do not block signup.

A full `npm ci`, `npm run check`, `npm run security:check`, and `npm run build` could not be completed in the artifact environment because its internal npm package mirror returned HTTP 404 for locked public packages. Run the commands below in GitHub Codespaces before accepting the build.

## Codespaces verification

```bash
cd /workspaces/Coogsnation
npm ci --no-audit --no-fund
npm run check
npm run security:check
npm run build
```

Then start PostgreSQL and the application using the currently working Codespaces startup procedure and test:

1. Register with handle, backup email, address, member category, graduation year, affiliation, and social links blank.
2. Confirm Join is enabled when the handle is blank.
3. Confirm a supplied handle still receives availability validation.
4. Select a JPG, PNG, or WebP avatar under 2 MB and confirm its preview appears.
5. Submit and confirm the account is created, signed in, and the avatar appears.
6. Confirm an invalid email, weak password, missing date of birth, or unchecked required consent blocks submission.
7. Confirm two users may share the same name or address, while duplicate email and supplied handle remain blocked.
