const {
  test,
  expect,
} = require("@playwright/test");


test(
  "intramural participation popup has X and Escape",
  async ({ page }) => {

    await page.goto(
      "/intramurals",
      {
        waitUntil:
          "domcontentloaded",
      },
    );

    const suggest =
      page.getByRole(
        "button",
        {
          name:
            /suggest a sport or activity/i,
        },
      );

    await expect(
      suggest,
    ).toBeVisible();

    await suggest.click();

    const dialog =
      page.getByRole(
        "dialog",
        {
          name:
            /join coogsnation to participate/i,
        },
      );

    await expect(
      dialog,
    ).toBeVisible();

    const close =
      page.getByRole(
        "button",
        {
          name:
            /close membership popup/i,
        },
      );

    await expect(
      close,
    ).toBeVisible();

    await close.click();

    await expect(
      dialog,
    ).toBeHidden();

    await suggest.click();

    await expect(
      dialog,
    ).toBeVisible();

    await page.keyboard.press(
      "Escape",
    );

    await expect(
      dialog,
    ).toBeHidden();
  },
);


test(
  "privacy choices popup has a visible X",
  async ({ page }) => {

    await page.goto(
      "/",
      {
        waitUntil:
          "domcontentloaded",
      },
    );

    const modify =
      page.locator(
        "#ngf-modify",
      );

    if (
      await modify.isVisible()
    ) {
      await modify.click();

      await expect(
        page.locator(
          "#ngf-modal",
        ),
      ).toBeVisible();

      const close =
        page.locator(
          "#ngf-modal-close",
        );

      await expect(
        close,
      ).toBeVisible();

      await close.click();

      await expect(
        page.locator(
          "#ngf-modal",
        ),
      ).toBeHidden();
    }
  },
);
