# Rehab Tracker

A personal, offline-first web app for your lower-limb rehab plan: morning and evening routines plus a Tue/Fri lower-body finisher (ticked and logged separately), Leg day A/B logging, Sunday tests, a running gate and walk–run stages, and progress charts. All data stays in your browser. There is no account and no server.

This is a personal tracker, not medical software.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173).

Other commands:

```bash
npm test
```

```bash
npm run build
```

`npm test` runs the logic tests (1RM, pain rule, load progression, ladders, CSV). `npm run build` writes the finished app to `dist/`.

## Open it on your phone

**Quick test on home Wi-Fi.** `npm run dev` also prints a "Network" address such as `http://192.168.1.20:5173`. Open that on your phone while it's on the same Wi-Fi. This is only for trying it out: the data you enter there lives on the phone's copy at that address.

**Proper setup (free hosting with GitHub Pages).** This lets you use the app anywhere, offline included:

1. Create a new repository on GitHub and push this folder to its `main` branch.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) tests, builds and publishes the app on every push. The address appears under Settings → Pages, e.g. `https://<your-user>.github.io/<repo>/`.
4. Open that address on your phone, then:
   - **iPhone (Safari):** Share → **Add to Home Screen**.
   - **Android (Chrome):** menu ⋮ → **Install app** (or **Add to Home screen**).

Once it's installed it opens like an app and works with no signal. Updates install automatically the next time you open it online.

## Back up and restore your data

Your data is stored only in the browser on that device. Clearing site data, or uninstalling the home-screen app on some phones, deletes it.

- **Back up:** More → Settings & backup → **Export backup (JSON)**. Save the file somewhere safe (cloud drive, email to yourself). Do this every week or two.
- **Restore:** More → Settings & backup → **Restore backup**, then pick the JSON file. Restoring **replaces** everything currently in the app.
- **Move to a new phone:** export on the old one, then restore on the new one.

## Import from your tracker spreadsheet

Export the workout sheet as CSV (in Google Sheets: File → Download → Comma-separated values; in Excel: Save As → CSV UTF-8). The first row must be these headers:

```
Date,Session,Exercise,Sets,Reps,Load (kg),Hold (s) or carry (m),RPE,Knee pain,Notes
```

Then go to More → Settings & backup → **Import workouts (CSV)**.

How each column is read:

| Column | Accepted values |
| --- | --- |
| Date | `2026-11-25`, `25/11/2026` or `25.11.2026` (day first) |
| Session | `Leg day A` / `Leg day B` (anything with A or B as a word), `Morning`, `Evening`, `Finisher`. Older `Daily routine` rows are split automatically: finisher exercises (heel raises, wall sit, side plank) go to Finisher, evening ones (balance, stretches, 90/90, deep squat, dead bug) to Evening, the rest to Morning |
| Exercise | Matched to the plan by name, ignoring case and punctuation. Common short names work (e.g. `RDL`, `Leg curl`, `Hip abduction`). Unknown names are still imported under their own name |
| Sets | Number of sets |
| Reps | One number for every set (`12`) or one per set (`12/12/10`) |
| Load (kg) | Same format as Reps |
| Hold (s) or carry (m) | Seconds for holds; metres for carries (farmer's carry) |
| RPE | Optional. If present it's used; otherwise the app estimates it |
| Knee pain | 0–10 |
| Notes | Free text |

Rows are grouped into one workout per date and session. Importing the same file twice won't create duplicates: an exercise that's already logged for that date and session is skipped.

**Export workouts (CSV)** writes the same format, so you can open your log in a spreadsheet at any time.

## How the smart parts work

- **No RPE typing:** the app estimates effort from how your reps hold up across sets. Reps level at the top of the range = RPE ≤ 8; dropping 1 rep = ~9; dropping 2+ or missing the bottom of the range = ~10. It needs at least 2 sets to estimate.
- **Load suggestions:** when you hit the top of the rep range on every set, with knee pain ≤ 3/10, in **two sessions in a row at the same weight**, the next session suggests about 2.5–5% more load, rounded to your weight steps (Settings). After the first such session it says "do it once more to go up". Missing the bottom of the range two sessions in a row suggests holding the weight or dropping about 5%.
- **Ladders:** tibialis (7 levels – the last three are the wall raises with heels 10–15, 15–20 and 20–25 cm out), single-leg balance, short foot, wall-sit depth (about 45° → 60° → thighs near level) and squat (heels-elevated goblet → heels-elevated back squat, on the 45-min Leg day A). For each: tick an item on Today and answer the quality question (for example "relaxed toes, no cramping"). The tag next to the exercise shows your count, e.g. `L1 · 2/3`. After 3 clean sessions in a row at a level, a **Move up** card appears ("Not yet" restarts the count). You can also tap the exercise and choose **Move up now** or **Step back** at any time.
- **Logging routines:** Morning, Evening and the finisher are separate sessions in the Log tab. Each routine card on Today has a **Log reps & holds** button for that routine. Saving a routine log also ticks its items on Today.
- **Pain rule:** pain above 5/10, pain of 3–5 that hasn't settled to 2 or less by the next morning, morning pain going up, or weekly walking pain going up all trigger a 3-day back-off. During back-off, routine doses are halved and suggested leg-day loads are halved.
- **Schedule:** morning routine Mon–Sat, evening routine every day (leg days too), the 6-minute finisher on Tuesdays and Fridays. On Sundays the morning is a rest and the evening is at half dose, and the Tests tab is suggested.
- **Running:** the Runs tab shows the 5-item running gate until it's all ticked, then the walk–run stage. It suggests moving up after 3 clean runs (pain 3/10 or less during, 2/10 or less the next morning) and at least a week on the stage, and shows the 10% longest-run cap.
- **45-min leg days:** from 14 Dec 2026 the app offers to switch. You can delay it a week at a time or switch by hand in Settings.

## Everyday use

- **Today:** the week strip at the top shows each day's routine and leg-day status (filled dot = done); tap a day to see or fix it. Finished routines fold away once their ladder questions are answered.
- **Guided timer:** ▶ next to any hold exercise runs it for you – sets, sides, reps with short holds, relax and rest gaps – with beeps and vibration, and keeps the screen on. At the end, **Mark as done** ticks it.
- **Gym logging:** set **Knee pain this session** once instead of per exercise (use "Different knee pain?" only when one exercise was different). Type the weight on set 1 and the other sets follow. Tap **Done ✓** to fold an exercise away. **Rest 90s** starts a rest timer (⟳ cycles 60/90/120 s). **Recent sessions** at the bottom reopens past logs.
- **Backup reminder:** once you've used the app for a week, Today reminds you to export a backup every 14 days.

## Credits

- Gym exercise photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense, public domain), stored in `public/exercises/`.
- Routine illustrations: original SVG drawings in `src/components/Illustration.tsx`.
- Typeface: Atkinson Hyperlegible (SIL Open Font License).
- Built with React, Dexie, Recharts, vite-plugin-pwa.

## For development

- Plan content (exercises, doses, cues, schedule, tests) is in `src/data/plan.ts`.
- Logic is in `src/logic/` and tested in `src/logic/logic.test.ts`.
- `http://localhost:5173/?demo` fills the app with 4 weeks of fake data. **It erases your real data first**, so only use it in development. `?demo=clear` erases everything. `?gallery` shows every illustration. All three work only in `npm run dev`.
