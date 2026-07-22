# Browser compatibility testing

## Automated matrix

`npm run test:e2e` is the required PR gate. It starts the local Nuxt
application and runs the same public smoke scenarios in:

- Chromium desktop;
- Firefox desktop;
- WebKit desktop;
- Chromium with a mobile device profile;
- WebKit with a Mobile Safari device profile.

The suite checks the main public routes, horizontal overflow, browser runtime
errors, the cookie notice, modal keyboard behavior, the landing demo and room
code validation. Failed runs retain a screenshot, video and trace in
`test-results`; `npm run test:e2e:report` opens the HTML report.

`npm run test:e2e:mobile-matrix` is the extended responsive release suite. It
runs a focused spec instead of repeating the full functional suite on every
device profile:

- minimum supported viewport `320×568`;
- Galaxy S24 `360×780`;
- iPhone SE 3 `375×667`;
- production-class Android `390×844`;
- iPhone 13 `390×664`;
- generic Android `393×873` for Xiaomi/Huawei-class dimensions;
- iPhone 16 Pro Max `440×763`;
- Pixel 9 Pro XL `448×921`;
- Galaxy Z Fold 6 inner `928×1004`.

The focused suite checks public/auth/legal/error routes, horizontal overflow,
cookie and dialog bounds, `40×40px` compact-mobile touch targets, room settings,
sticky-header clearance and the select/deselect/undo controls. Use
`npm run test:e2e:release` to run the PR gate followed by this matrix.

Install the managed browser engines before the first local run:

```sh
npx playwright install chromium firefox webkit
npm run test:e2e
npm run test:e2e:mobile-matrix
```

Set `PLAYWRIGHT_BASE_URL` to test an already deployed preview instead of
starting Nuxt locally:

```sh
PLAYWRIGHT_BASE_URL=https://preview.example.com npm run test:e2e
PLAYWRIGHT_BASE_URL=https://preview.example.com npm run test:e2e:mobile-matrix
```

## Real-browser release smoke

Playwright Chromium/WebKit cover browser engines but do not prove compatibility
with every branded browser. Before a major production release, repeat this
short smoke on current Google Chrome, macOS Safari, iOS Safari, Firefox, Opera
and Yandex Browser:

1. Open `/` and confirm that the page has no horizontal scroll at 390 px and
   desktop width.
2. Accept or decline analytics, reopen the page and confirm that the notice
   stays dismissed.
3. Open and close “Как это работает” with the pointer and `Escape`; verify
   visible keyboard focus.
4. Create a guest room, join it from a second browser, configure filters and
   start the room.
5. Make decisions using touch swipe, mouse drag, explicit buttons and keyboard
   arrows where the device supports them.
6. Confirm realtime participant updates, a match, undo and final film selection.
7. Check the browser console for errors and record browser/OS versions with the
   result.

Use real Apple hardware or a real-browser cloud for Safari sign-off. Playwright
WebKit and its Mobile Safari profile are regression coverage, not Safari
certification.

## Responsive room-flow release checklist

Before a major UI release, repeat the complete room flow on the boundary
classes `360×780`, `375×667`, `390×844` and `440×763` or `448×921`:

1. Create a room and open its collection settings.
2. Start selection and perform select, deselect and undo.
3. Open matches, finish the room and submit feedback.
4. Confirm that the sticky header does not cover the room panel or controls,
   modals remain inside the viewport and no horizontal scroll appears.
5. Check `928×1004` separately before large layout changes to catch fold/tablet
   breakpoint regressions and stretched grid cards.

Portrait is the automated baseline. Keep one current iOS and Android landscape
smoke in the release checklist rather than in the permanent CI gate. Xiaomi and
Huawei vendor browsers should be tested on hardware or a real-browser cloud;
changing only the User-Agent does not emulate their browser behavior.
