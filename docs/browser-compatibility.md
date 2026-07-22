# Browser compatibility testing

## Automated matrix

`npm run test:e2e` starts the local Nuxt application and runs the same public
smoke scenarios in:

- Chromium desktop;
- Firefox desktop;
- WebKit desktop;
- Chromium with a mobile device profile;
- WebKit with a Mobile Safari device profile.

The suite checks the main public routes, horizontal overflow, browser runtime
errors, the cookie notice, modal keyboard behavior, the landing demo and room
code validation. Failed runs retain a screenshot, video and trace in
`test-results`; `npm run test:e2e:report` opens the HTML report.

Install the managed browser engines before the first local run:

```sh
npx playwright install chromium firefox webkit
npm run test:e2e
```

Set `PLAYWRIGHT_BASE_URL` to test an already deployed preview instead of
starting Nuxt locally:

```sh
PLAYWRIGHT_BASE_URL=https://preview.example.com npm run test:e2e
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
