# Turbiny Live — Dashboard turbin wiatrowych

Dashboard dla firmy z branży OZE, skupiony na **komercyjnych, lądowych turbinach wiatrowych**.
Pobiera aktualne warunki pogodowe z **OpenWeatherMap** i na podstawie parametrów turbiny
(krzywa mocy) szacuje produkcję energii. Interfejs w stylu **glasmorfizmu**.

## Stack

- React 18 + Vite
- Tailwind CSS (efekt glasmorfizmu)
- Recharts (wykresy)
- lucide-react (ikony)
- Vitest (testy jednostkowe), ESLint
- Firebase Hosting + Cloudflare Worker (proxy do API)

## Funkcje

- 🔎 Wyszukiwanie lokalizacji (geokodowanie po nazwie miasta, obsługa klawiatury)
- 🌬️ Aktualny wiatr (prędkość, kierunek, poryw), temperatura, ciśnienie, wilgotność
- 🗼 Ekstrapolacja wiatru z 10 m na wysokość piasty (prawo potęgowe Hellmanna)
- ⚙️ Edytowalne parametry turbiny + presety komercyjne (Vestas, Enercon, GE, Siemens Gamesa)
- 📈 Krzywa mocy z bieżącym punktem pracy
- ⚡ Szacowana moc chwilowa, produkcja dobowa/roczna, współczynnik wykorzystania mocy
- 🔆 Korekta mocy o gęstość powietrza — osobno dla każdego kroku prognozy
- 🗓️ Prognoza produkcji na 5 dni
- 🔄 Automatyczne odświeżanie co 10 min i po powrocie do karty przeglądarki
- 📱 Układ responsywny (telefon / tablet / desktop)
- 💾 Zapamiętywanie lokalizacji i parametrów turbiny (localStorage, z walidacją odczytu)

## Uruchomienie

1. Zainstaluj zależności:

   ```bash
   npm install
   ```

2. Skonfiguruj klucz API:

   ```bash
   cp .env.example .env
   ```

   W pliku `.env` wstaw swój klucz:

   ```
   OPENWEATHER_API_KEY=twoj_klucz
   ```

   Darmowy klucz: https://home.openweathermap.org/api_keys
   (aktywacja nowego klucza może potrwać do ~2 godzin).

3. Uruchom serwer deweloperski:

   ```bash
   npm run dev
   ```

   Aplikacja: http://localhost:5173

4. Testy i linter:

   ```bash
   npm test
   npm run lint
   ```

5. Build produkcyjny:

   ```bash
   npm run build
   npm run preview
   ```

## Bezpieczeństwo klucza API

Klucz **nie trafia do bundla przeglądarki**. Frontend woła proxy, a `appid` dokłada
warstwa serwerowa:

| Środowisko                        | Adres wołany przez klienta | Kto dokłada klucz                  |
| --------------------------------- | -------------------------- | ---------------------------------- |
| `npm run dev` / `npm run preview`  | `/api/owm/...`             | proxy Vite (`vite.config.js`)      |
| Firebase Hosting (produkcja)       | `VITE_API_BASE`            | Cloudflare Worker (`worker/`)      |

Dlatego zmienna z kluczem nazywa się `OPENWEATHER_API_KEY`, a **nie**
`VITE_OPENWEATHER_API_KEY` — prefiks `VITE_` kazałby Vite wstrzyknąć wartość do kodu
wysyłanego do przeglądarki. `VITE_API_BASE` to z kolei sam publiczny adres Workera,
więc jego obecność w bundlu jest w porządku.

Worker dodatkowo:

- przepuszcza tylko trzy ścieżki OWM (geocoding, current, forecast) — nie jest otwartym proxy,
- ignoruje `appid` przysłany przez klienta,
- odrzuca żądania z obcych originów (lista w `worker/index.js`),
- cache'uje odpowiedzi na 5 minut, co ogranicza zużycie limitu zapytań.

> **Uwaga o powłoce:** Windows PowerShell 5.1 nie obsługuje operatora `&&`
> (`The token '&&' is not a valid statement separator in this version`).
> Poniższe komendy są rozpisane pojedynczo, więc działają w PowerShellu,
> w cmd i w bashu tak samo. Uprawnienia administratora nie są potrzebne.

### Wdrożenie Workera (jednorazowo)

Wejdź do katalogu Workera:

```
cd "C:\Users\mariu\OneDrive\Pulpit\APKI\Turbiny Live\worker"
```

Zaloguj się do Cloudflare (otworzy przeglądarkę):

```
npx wrangler login
```

Wgraj klucz OpenWeatherMap jako sekret (wklej go, gdy pojawi się prośba):

```
npx wrangler secret put OPENWEATHER_API_KEY
```

Wdróż Workera:

```
npx wrangler deploy
```

Wrangler wypisze adres w postaci `https://turbiny-live-owm.<subdomena>.workers.dev`.
Wpisz go do `.env` jako `VITE_API_BASE` z sufiksem `/api/owm`.

Jeśli hosting stoi pod innym adresem niż `turbiny-live.web.app`, dopisz go do
`ALLOWED_ORIGINS` w `worker/index.js` i wdróż Workera ponownie.

### Wdrożenie frontendu

Wróć do katalogu projektu:

```
cd "C:\Users\mariu\OneDrive\Pulpit\APKI\Turbiny Live"
```

Zbuduj:

```
npm run build
```

Wgraj na Firebase (dopiero gdy build zakończył się bez błędu):

```
firebase deploy --only hosting
```

> Kolejność ma znaczenie: Worker musi działać, zanim wgrasz nowy frontend — inaczej
> aplikacja na produkcji nie dostanie danych pogodowych.

## Rozwiązywanie problemów

### Aplikacja nie pokazuje pogody — „Serwer odrzucił klucz API (401)”

Klucz jest nieprawidłowy albo jeszcze nieaktywny. Nowy klucz z OpenWeatherMap
potrzebuje do ~2 godzin na aktywację i do tego czasu zwraca 401.

W dev sprawdź, czy `.env` ma wypełnione `OPENWEATHER_API_KEY` i **zrestartuj serwer** —
Vite czyta `.env` tylko przy starcie.

Na produkcji sprawdź, czy sekret Workera istnieje:

```
npx wrangler secret list
```

Powinien być na liście `OPENWEATHER_API_KEY`. Jeśli go nie ma albo jest zły, wgraj go
ponownie (`npx wrangler secret put OPENWEATHER_API_KEY`) i wdróż Workera.

### „Serwer nie ma skonfigurowanego klucza” / plakietka „Brak klucza API” (503)

Worker działa, ale nie ma sekretu. To ta sama naprawa co wyżej: `wrangler secret put`.
W dev ten sam objaw oznacza pusty `OPENWEATHER_API_KEY` w `.env`.

### Na produkcji 404 na `/api/owm/...`

Build powstał bez `VITE_API_BASE`, więc klient woła ścieżkę względną, której Firebase
Hosting nie obsługuje. Sprawdź, czy adres Workera faktycznie wszedł do bundla:

```
findstr /S "workers.dev" dist\assets\*.js
```

Brak wyniku = zmienna była pusta przy `npm run build`. Uzupełnij `VITE_API_BASE`
w `.env`, zbuduj **ponownie** i wgraj hosting jeszcze raz.

### Na produkcji 403 i komunikat „Origin niedozwolony”

Strona działa pod adresem, którego Worker nie ma na liście dozwolonych — tak działa
zabezpieczenie przed zużywaniem Twojego limitu przez obce witryny. Dopisz domenę do
`ALLOWED_ORIGINS` w `worker/index.js` i wdróż Workera ponownie (`npx wrangler deploy`).

### Przekroczony limit zapytań (429)

Darmowy plan OWM to 60 zapytań/min i 1000/dobę. Aplikacja odświeża się co 10 minut
(2 zapytania na cykl), a Worker cache'uje odpowiedzi na 5 minut, więc limit jest
trudny do wyczerpania — 429 zwykle znaczy, że tego samego klucza używa coś jeszcze.
Jeśli stary klucz wyciekł kiedyś w bundlu, wygeneruj nowy i podmień sekret.

### Aplikacja pokazuje dziwne wartości albo pusty wykres krzywej

Najpewniej masz w przeglądarce zapisane własne parametry turbiny. Kliknij **Reset**
na zakładce, którą edytowałeś (przycisk przywraca wartości presetu), albo wyczyść
stan całkowicie — w konsoli przeglądarki:

```
localStorage.clear(); location.reload()
```

Uszkodzony zapis nie wywala już aplikacji: `src/lib/schema.js` uzupełnia braki
z presetu, a `ErrorBoundary` łapie resztę i daje przycisk przywracający ustawienia.

### `The token '&&' is not a valid statement separator in this version`

Windows PowerShell 5.1 nie zna operatora `&&`. Uruchamiaj komendy pojedynczo albo
użyj odpowiednika:

```
npm run build; if ($?) { firebase deploy --only hosting }
```

### Port 5173 jest zajęty

Vite sam wybierze kolejny wolny port i wypisze go w konsoli. Jeśli chcesz zwolnić 5173,
znajdź proces:

```
netstat -ano | findstr :5173
```

## Struktura projektu

```
src/
├── api/weather.js          # klient OWM przez proxy /api/owm (bez klucza w przeglądarce)
├── hooks/
│   ├── useWeather.js       # pobieranie pogody + prognozy, auto-odświeżanie
│   └── useLocalStorage.js  # trwały stan z walidacją odczytu
├── lib/
│   ├── energy.js           # ekstrapolacja wiatru, krzywa mocy, szereg prognozy, AEP
│   ├── airDensity.js       # gęstość powietrza i korekta mocy
│   ├── schema.js           # normalizacja stanu z localStorage
│   └── energy.test.js      # testy jednostkowe
├── data/turbinePresets.js  # presety turbin komercyjnych
└── components/
    ├── ErrorBoundary.jsx   # awaryjny ekran zamiast białej strony
    ├── layout/             # Header
    ├── ui/                 # GlassCard, StatTile, TurbineIcon
    ├── weather/            # WeatherPanel, LocationSearch
    ├── turbine/            # TurbineForm, PowerCurveEditor
    └── production/         # ProductionEstimate, PowerCurveChart, ForecastChart
worker/                     # Cloudflare Worker: proxy do OpenWeatherMap
```

## Uwagi metodyczne

- Prędkość wiatru z OpenWeatherMap dotyczy ~10 m n.p.t.; do obliczeń jest ekstrapolowana
  na wysokość piasty wykładnikiem szorstkości terenu **α** (regulowanym w formularzu).
- Krzywe mocy presetów to wartości **orientacyjne** (dla ρ₀ = 1.225 kg/m³). Do obliczeń
  wiążących używaj kart katalogowych producenta.
- **Moc chwilowa** liczona jest z aktualnej prędkości wiatru. **Produkcja dobowa i roczna**
  liczone są ze ŚREDNIEJ mocy z pełnej prognozy 5-dniowej (OWM) — obie z tej samej średniej,
  więc zawsze się zgadzają (`rok = doba × 365`).
- **Współczynnik wykorzystania (CF)** jest wskaźnikiem prezentacyjnym przycinanym do 0–100 %.
  Nie służy do wyliczenia produkcji rocznej — przy krzywej mocy przekraczającej zadeklarowaną
  moc znamionową przycięcie zaniżałoby wynik.
- **Roczny uzysk to ekstrapolacja z 5 dni** — nie uwzględnia sezonowości wiatru, strat farmy,
  dostępności turbiny ani efektu zacienienia (wake). Traktuj go jako rząd wielkości, nie prognozę
  budżetową. Rzetelny AEP wymaga rozkładu Weibulla z wieloletnich danych wiatrowych dla lokalizacji.
