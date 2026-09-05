# Wskazówki dla Claude Code

Dashboard turbin wiatrowych: React 18 + Vite + Tailwind, dane z OpenWeatherMap,
hosting na Firebase, proxy do API na Cloudflare Workers. Szczegóły w [README.md](README.md).

## Środowisko

- **Powłoka to Windows PowerShell 5.1** — nie obsługuje `&&`. Komendy podawaj
  pojedynczo albo jako `A; if ($?) { B }`. To samo dotyczy instrukcji pisanych
  dla użytkownika.
- Ścieżka projektu zawiera spację (`Turbiny Live`) — cytuj ją w komendach.

## Język

Komentarze w kodzie, teksty w interfejsie, komunikaty błędów, README i opisy commitów
piszemy **po polsku**. Nazwy zmiennych, funkcji i plików zostają po angielsku.

## Klucz API — nienegocjowalne

Klucz OpenWeatherMap **nigdy nie może trafić do bundla przeglądarki**. W praktyce:

- zmienna nazywa się `OPENWEATHER_API_KEY`, **bez** prefiksu `VITE_` — prefiks
  kazałby Vite wstrzyknąć wartość do kodu klienta,
- klient woła wyłącznie proxy: `/api/owm/...` w dev, `VITE_API_BASE` na produkcji,
- `appid` dokłada warstwa serwerowa — proxy Vite (`vite.config.js`) albo Worker
  (`worker/index.js`),
- `VITE_API_BASE` to publiczny URL Workera, nie sekret — w bundlu jest w porządku.

Po każdej zmianie w tym obszarze sprawdź, czy klucz nie wyciekł do builda.

## Gdzie co siedzi

| Obszar | Plik | Uwagi |
| --- | --- | --- |
| Fizyka i obliczenia | `src/lib/energy.js`, `src/lib/airDensity.js` | pokryte testami — zmiana wymaga aktualizacji testów |
| Kształt stanu z localStorage | `src/lib/schema.js` | patrz niżej |
| Klient API | `src/api/weather.js` | tylko ścieżki proxy, zero kluczy |
| Proxy produkcyjne | `worker/index.js` | whitelista ścieżek i originów |
| Testy | `src/lib/energy.test.js` | Vitest |

`forecastPowerSeries` w `energy.js` jest **jednym źródłem prawdy** dla wykresu prognozy
i dla kafelków produkcji. Nie duplikuj tego rachunku w komponentach — inaczej liczby
w dwóch miejscach ekranu zaczną się rozjeżdżać.

## Reguły, które łatwo naruszyć

- **Zmiana kształtu obiektu turbiny wymaga aktualizacji `src/lib/schema.js`.**
  Użytkownicy mają stary kształt zapisany w `localStorage`; brak normalizacji
  kiedyś już wywalił aplikację białym ekranem (`curve is not iterable`).
- **Produkcja roczna liczy się ze średniej mocy, nie z capacity factor.** CF jest
  przycinany do 0..1, więc AEP liczony z niego rozjeżdżał się z produkcją dobową.
  Jest na to test regresyjny — nie „upraszczaj" tego z powrotem.
- **Wykresy Recharts wymagają rodzica o określonej wysokości.** Poniżej breakpointu
  `lg` karty mają sztywne `h-72`; `flex-1` w kontenerze bez ustalonej wysokości daje
  `ResponsiveContainer` zero pikseli i wykres znika.
- **Korekta gęstości powietrza liczona jest per krok prognozy**, nie raz z bieżącej
  pogody — dane `temp`/`pressure` przychodzą dla każdego kroku z OWM.
- Layout jest responsywny od 375 px. Poniżej `lg` układ jest pionowy i przewijalny;
  `overflow-hidden` obowiązuje dopiero od `lg`.

## Przed uznaniem zmiany za gotową

```
npm run lint
```

```
npm test
```

Oba muszą przechodzić. Jeśli zmiana jest widoczna w przeglądarce, sprawdź ją realnie
przez Browser pane — łącznie z widokiem mobilnym (375 px), bo tam najłatwiej
o regresję układu.

## Zależności

Bundle jest podzielony na chunki (`vite.config.js`): `react`, `charts`, `vendor`.
Recharts to już ~334 kB — nie dokładaj kolejnych bibliotek bez wyraźnej potrzeby.

## Czego nie robić

- Nie commituj `.env` (jest w `.gitignore`) ani żadnego klucza w kodzie.
- Nie wdrażaj hostingu, jeśli Worker nie działa — aplikacja straci dane pogodowe.
- Nie przywracaj `aepFromCapacityFactor` ani innych funkcji usuniętych jako martwy kod.
