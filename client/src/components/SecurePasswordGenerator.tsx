import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LOWER =
  "abcdefghijkmnopqrstuvwxyz";

const UPPER =
  "ABCDEFGHJKLMNPQRSTUVWXYZ";

const DIGITS =
  "23456789";

const SPECIAL =
  "!@#$%^&*_-+=?";

const ALL =
  LOWER +
  UPPER +
  DIGITS +
  SPECIAL;

function secureIndex(
  maximum: number,
): number {
  if (
    !Number.isInteger(maximum) ||
    maximum <= 0
  ) {
    throw new Error(
      "Invalid secure random range",
    );
  }

  const values =
    new Uint32Array(1);

  const range =
    0x100000000;

  const limit =
    range -
    (range % maximum);

  while (true) {
    crypto.getRandomValues(values);

    if (values[0] < limit) {
      return (
        values[0] %
        maximum
      );
    }
  }
}

function pick(
  characters: string,
): string {
  return characters[
    secureIndex(
      characters.length,
    )
  ];
}

function generateStrongPassword():
  string {
  const characters = [
    pick(LOWER),
    pick(UPPER),
    pick(DIGITS),
    pick(SPECIAL),
  ];

  while (
    characters.length < 16
  ) {
    characters.push(
      pick(ALL),
    );
  }

  for (
    let index =
      characters.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex =
      secureIndex(
        index + 1,
      );

    [
      characters[index],
      characters[swapIndex],
    ] = [
      characters[swapIndex],
      characters[index],
    ];
  }

  return characters.join("");
}

export default function SecurePasswordGenerator({
  onUse,
}: {
  onUse:
    (password: string) =>
      void;
}) {
  const [
    generated,
    setGenerated,
  ] = useState("");

  const [
    show,
    setShow,
  ] = useState(false);

  const [
    selected,
    setSelected,
  ] = useState(false);

  function generate() {
    setGenerated(
      generateStrongPassword(),
    );

    setSelected(false);
  }

  function usePassword() {
    if (!generated) {
      return;
    }

    onUse(generated);
    setSelected(true);
  }

  async function copy() {
    if (!generated) {
      return;
    }

    try {
      await navigator.clipboard
        .writeText(
          generated,
        );
    } catch {
      // Clipboard permission may
      // be denied by the browser.
    }
  }

  return (
    <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
      <p className="font-semibold">
        Create Your Password
      </p>

      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        Choose your own password
        or let CoogsNation
        generate a strong
        password for you.
      </p>

      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Your password must
        contain at least 9
        characters, including
        one uppercase letter,
        one lowercase letter,
        one number, and one
        special character.
      </p>

      {!generated ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={generate}
        >
          GENERATE STRONG PASSWORD
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <Input
            type={
              show
                ? "text"
                : "password"
            }
            value={generated}
            readOnly
            autoComplete="off"
            aria-label="Generated password"
          />

          <div
            className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900"
            data-testid="generated-password-save-warning"
          >
            Write down or save this password now. Update your password manager, just in case it does not save automatically.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={
                usePassword
              }
            >
              USE THIS PASSWORD
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={generate}
            >
              GENERATE ANOTHER
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setShow(
                  value =>
                    !value,
                )
              }
            >
              {show
                ? "HIDE"
                : "SHOW"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={copy}
            >
              COPY
            </Button>
          </div>

          {selected && (
            <p className="text-sm font-semibold">
              Generated password
              selected.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
