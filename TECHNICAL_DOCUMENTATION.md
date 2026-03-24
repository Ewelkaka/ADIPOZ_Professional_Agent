# Dokumentacja Techniczna: AdiPOZ (Sovereign AI Medical)

## 1. Przegląd Projektu
AdiPOZ to zaawansowany asystent medyczny AI, zaprojektowany do wspomagania lekarzy w analizie przypadków pacjentów, przeszukiwaniu wytycznych medycznych oraz zarządzaniu dokumentacją. Aplikacja stawia na bezpieczeństwo danych, oferując zarówno tryb chmurowy (Gemini/OpenAI), jak i tryb suwerenny (lokalne przetwarzanie).

## 2. Stos Technologiczny
*   **Frontend:** React 18+
*   **Język:** TypeScript
*   **Stylizacja:** Tailwind CSS (z pełnym wsparciem dla Dark Mode)
*   **Budowanie:** Vite
*   **Wykresy:** Recharts
*   **Ikony:** Lucide React
*   **AI SDK:** `@google/genai` (Gemini), OpenAI SDK

## 3. Struktura Projektu
*   `/src/components/`: Komponenty UI (Chat, History, PatientView, NotificationCenter, itp.)
*   `/src/services/`: Logika biznesowa i integracje (Orchestrator, DB, AI Engines)
*   `/src/lib/`: Narzędzia pomocnicze (np. `cn()` dla Tailwind)
*   `/src/types.ts`: Definicje typów TypeScript

## 4. Kluczowe Serwisy
*   **`SystemOrchestrator`**: Główny koordynator analizy danych pacjenta.
*   **`SovereignEngine`**: Silnik analizy lokalnej (tryb offline).
*   **`LocalPatientDB`**: Zarządzanie lokalną bazą historii wizyt (localStorage).
*   **`gemini.ts` / `openai.ts`**: Integracje z zewnętrznymi modelami AI.
*   **`NotificationService`**: Obsługa powiadomień systemowych.
*   **`SettingsService`**: Zarządzanie ustawieniami użytkownika (motyw, jednostki).

## 5. Przepływ Danych i Analiza
1.  **Wejście**: Dane pacjenta (wiek, waga, wzrost, objawy, leki) są wprowadzane w panelu lekarza lub przez czat.
2.  **Orkiestracja**: `SystemOrchestrator` decyduje o sposobie analizy (tryb suwerenny vs. chmura).
3.  **Analiza AI**: Modele generują odpowiedź w formacie JSON, zawierającą:
    *   `podsumowanie_wizyty`
    *   `decision` (diagnoza, kody ICD-10)
    *   `dane_do_wizualizacji` (dla wykresów Recharts)
    *   `podsumowanie_dla_pacjenta` (zalecenia)
4.  **Wizualizacja**: Jeśli odpowiedź zawiera `dane_do_wizualizacji`, komponent `Chat` automatycznie renderuje wykres słupkowy.

## 6. Dark Mode
Aplikacja wspiera tryb ciemny poprzez klasy Tailwind CSS (`dark:`).
*   Stan motywu jest zarządzany w `SettingsService` i stosowany poprzez dodanie klasy `dark` do elementu `document.documentElement`.
*   Wszystkie komponenty zostały dostosowane do obsługi obu motywów.

## 7. Utrzymanie i Rozwój
*   **Dodawanie nowych funkcji**: Nowe komponenty UI powinny być tworzone w `/src/components/` i wykorzystywać Tailwind CSS.
*   **Integracja AI**: Zmiany w promptach systemowych należy wprowadzać w `/src/services/gemini.ts` lub `/src/services/openai.ts`.
*   **Walidacja**: Każda zmiana powinna być weryfikowana za pomocą `lint_applet` oraz `compile_applet`.
