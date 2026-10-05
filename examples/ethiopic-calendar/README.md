# Ethiopian Calendar — demo

An **offline** Ethiopian calendar UI built on the `@ethiopic-primitives` package. Like the
[Ethiopic Ledger](../ethiopic-ledger/), it is an example — not part of the published
library — and reimplements nothing: every conversion, weekday, leap-year test, Ge'ez
numeral and fiscal value comes from the package.

## Features

- **Month view** — Monday-first grid of the 13 Ethiopian months, each day showing its
  Gregorian date; Pagumē rendered as a real 5- or 6-day month.
- **Year view** — all 13 months at a glance, with today and holidays marked.
- **Day details** — full Ethiopian and Gregorian dates, day of year, leap year,
  evangelist year (ዘመነ ማቴዎስ/ማርቆስ/ሉቃስ/ዮሐንስ), Amete Alem year, fiscal year /
  quarter / period, and distance from today.
- **Converter** — Gregorian ⇄ Ethiopian, with invalid input reported verbatim from the primitive.
- **Holidays** — about 48 a year, filterable by group, each tagged as a *public holiday*
  (a day off) or an *observance*:
  - **National:** Enkutatash, Adwa, Labour Day, Patriots' Victory, Ginbot 20, plus
    observances such as Martyrs' Day (Yekatit 12) and Nations, Nationalities & Peoples' Day.
  - **Orthodox:** Meskel, Genna, Timket, the Easter cycle (Hosanna, Siklet, Fasika, Erget,
    Peraklitos, Debre Zeit) and major feasts (Hidar Tsion, Kulubi Gabriel, Filseta,
    Kidane Mehret, …). Julian-based feasts are placed through the package's JDN API.
    Every day also shows its monthly commemoration (ወርኃዊ በዓላት) for all 30 days of the
    month, as listed by ethiopianorthodox.org — the principal saint in the grid, the full
    list in the day panel.
  - **Islamic:** Eid al-Fitr, Eid al-Adha and Mawlid (public), plus Ramadan, Laylat al-Qadr,
    Arafah, Islamic New Year and Ashura. Dates use the browser's Umm al-Qura calendar
    (falling back to the arithmetic Hijri calendar) and are marked ≈, since Ethiopia
    fixes them by moon sighting.
  - **Cultural:** Irreecha (approximate) and Ashenda / Shadey / Solel.
- **Orthodox fasts** — the seven fasts of the Ethiopian Orthodox Tewahedo Church:
  Abiy Tsom (55 days to Holy Saturday), Nineveh, the Apostles' fast (Monday after
  Pentecost to Hamle 4), Filseta (Nehase 1–15), the Prophets' fast (Hidar 15 to the eve of
  Genna), Gahad (eve of Timket), and the Wednesday/Friday fast (not in the Fifty Days
  after Fasika, nor on Genna/Timket). Shown on the grid, in day details with
  "day N of M", and as a seasonal list; can be hidden with "Show fasts".
- Amharic / English labels, Arabic / Ge'ez numerals, light / dark theme, keyboard
  navigation (arrows, PgUp/PgDn, `T`), and a phone layout.

## Run it locally

```bash
cd javascript && npm run build && npm run demo:lib && cd ..
npx --yes http-server examples/ethiopic-calendar -p 8080 -c-1
# open http://localhost:8080
```

`lib/` is generated (copied from `javascript/dist`, git-ignored) by `npm run demo:lib`.

## Tests

```bash
node --test examples/ethiopic-calendar/test/*.test.js
```

They check wiring and structural invariants (grids are contiguous and Monday-first,
Easter is always a Sunday, holidays stay inside their year, Abiy Tsom is 55 days
ending the Saturday before Fasika, no Wednesday/Friday fast in the Fifty Days) — never a hand-authored
Layer-0 value (Principle I).

## Constitution note

Outside the Layer-0 library scope. The system clock picks only the starting page
(Principle VIII); preferences live in `localStorage` and never affect a computed value.
