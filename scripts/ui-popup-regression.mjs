import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const sourceRoot =
  path.join(
    root,
    "client",
    "src",
  );

const failures = [];
const inspected = [];

const primitiveRequirements =
  new Map([
    [
      "client/src/components/ui/dialog.tsx",
      [
        "DialogPrimitive.Close",
        "<X",
      ],
    ],
    [
      "client/src/components/ui/alert-dialog.tsx",
      [
        "AlertDialogPrimitive.Cancel",
        "<X",
      ],
    ],
    [
      "client/src/components/ui/sheet.tsx",
      [
        "SheetPrimitive.Close",
        "<X",
      ],
    ],
    [
      "client/src/components/ui/drawer.tsx",
      [
        "DrawerPrimitive.Close",
        "<X",
      ],
    ],
  ]);

const primitiveFiles =
  new Set(
    primitiveRequirements.keys(),
  );

function walk(directory) {
  const files = [];

  for (
    const entry
    of fs.readdirSync(
      directory,
      { withFileTypes:true },
    )
  ) {
    const full =
      path.join(
        directory,
        entry.name,
      );

    if (entry.isDirectory()) {
      files.push(
        ...walk(full),
      );
    } else if (
      /\.(tsx|jsx|ts|js)$/
        .test(entry.name)
    ) {
      files.push(full);
    }
  }

  return files;
}

function relative(file) {
  return path
    .relative(root,file)
    .replaceAll("\\","/");
}

function hasCustomDialog(text) {
  return (
    /<[^>]+\brole\s*=\s*["']dialog["']/s
      .test(text) ||
    /className\s*=\s*["'`][^"'`]*\bfixed\b[^"'`]*\binset-0\b/s
      .test(text)
  );
}

function hasFullPageBox(text) {
  return (
    /min-h-screen[\s\S]{0,1200}<Card\s+className=["'][^"']*(?:mx-auto|max-w-)/s
      .test(text)
  );
}

function hasVisibleClose(text) {
  return (
    /aria-label\s*=\s*["'`][^"'`]*(?:close|dismiss)/i
      .test(text) ||
    /<X(?:\s|>)/.test(text) ||
    />\s*[×✕]\s*</.test(text) ||
    /Primitive\.(?:Close|Cancel)/.test(text) ||
    /<PageCardClose\b/.test(text)
  );
}

for (
  const [file,tokens]
  of primitiveRequirements
) {
  const absolute =
    path.join(root,file);

  if (!fs.existsSync(absolute)) {
    failures.push(
      `${file}: shared popup primitive missing`,
    );
    continue;
  }

  const text =
    fs.readFileSync(
      absolute,
      "utf8",
    );

  for (const token of tokens) {
    if (!text.includes(token)) {
      failures.push(
        `${file}: missing universal close control "${token}"`,
      );
    }
  }
}

const pageClose =
  path.join(
    root,
    "client/src/components/PageCardClose.tsx",
  );

if (!fs.existsSync(pageClose)) {
  failures.push(
    "client/src/components/PageCardClose.tsx: universal full-page box close component missing",
  );
} else {
  const text =
    fs.readFileSync(
      pageClose,
      "utf8",
    );

  for (
    const token
    of [
      'aria-label="Close"',
      'event.key !== "Escape"',
      "data-ngf-page-card-close",
    ]
  ) {
    if (!text.includes(token)) {
      failures.push(
        `PageCardClose.tsx: missing "${token}"`,
      );
    }
  }
}

for (const file of walk(sourceRoot)) {
  const rel = relative(file);

  if (primitiveFiles.has(rel)) {
    continue;
  }

  const text =
    fs.readFileSync(
      file,
      "utf8",
    );

  const customDialog =
    hasCustomDialog(text);

  const fullPageBox =
    hasFullPageBox(text);

  if (
    !customDialog &&
    !fullPageBox
  ) {
    continue;
  }

  inspected.push(rel);

  if (
    customDialog &&
    /className\s*=\s*["'`][^"'`]*\bfixed\b[^"'`]*\binset-0\b/s
      .test(text) &&
    !/<[^>]+\brole\s*=\s*["']dialog["']/s
      .test(text)
  ) {
    failures.push(
      `${rel}: custom modal overlay has no role="dialog"`,
    );
  }

  if (!hasVisibleClose(text)) {
    failures.push(
      `${rel}: popup/full-page box has no visible X/Close control`,
    );
  }

  if (
    fullPageBox &&
    !/<PageCardClose\b/.test(text)
  ) {
    failures.push(
      `${rel}: centered full-page box must use PageCardClose for X + Escape`,
    );
  }
}


/*
 * Privacy UI is outside React.
 */
const indexPath =
  path.join(
    root,
    "client",
    "index.html",
  );

if (fs.existsSync(indexPath)) {
  const html =
    fs.readFileSync(
      indexPath,
      "utf8",
    );

  for (
    const id of [
      "ngf-consent-close",
      "ngf-modal-close",
    ]
  ) {
    if (
      !html.includes(
        `id="${id}"`,
      )
    ) {
      failures.push(
        `client/index.html: missing ${id}`,
      );
    }
  }
}

console.log(
  "===== COOGSNATION UNIVERSAL BOX / ESCAPE AUDIT =====",
);

console.log(
  `Interactive box files inspected: ${inspected.length}`,
);

for (const file of inspected) {
  console.log(
    `CHECKED: ${file}`,
  );
}

if (failures.length) {
  console.error(
    "\nUNIVERSAL BOX AUDIT FAILED:",
  );

  for (const failure of failures) {
    console.error(
      `  - ${failure}`,
    );
  }

  console.error(
    "\nRULE: Every popup, modal, dialog and centered full-page interaction box must have a visible upper-right X and an Escape path.",
  );

  process.exit(1);
}

console.log(
  "PASS: every detected popup/full-page interaction box has X + Escape coverage.",
);
