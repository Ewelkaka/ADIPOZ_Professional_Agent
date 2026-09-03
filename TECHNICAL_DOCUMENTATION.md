# Dokumentacja Techniczna: 🩺 ADIPOZ → Professional Agent

## 📌 Metadane Projektu i Prawa Własności
* **Nazwa Systemu:** 🩺 ADIPOZ → Professional Agent (Autonomiczny Asystent Medyczny POZ / CDSS)
* **Twórca i Wyłączny Właściciel:** Ewelina Lesiak (`ewelinalesiak7@gmail.com`)
* **Status Prawny:** Wszelkie Prawa Zastrzeżone (All Rights Reserved) © 2026 Ewelina Lesiak
* **Licencja:** Oprogramowanie Własnościowe / Zastrzeżone (Proprietary Commercial License - zob. plik `LICENSE`)
* **Wersja Systemu:** 1.0.0-PROD
* **Środowisko:** Cloud Run / Node.js + Express + React 19 + TypeScript

---

## 🎯 1. Filozofia Agentyczna i Główny Przepływ Pracy (Workflow)
Fundamentem działania systemu **🩺 ADIPOZ → Professional Agent** jest precyzyjnie zdefiniowany, 5-etapowy proces asysty klinicznej o wysokim stopniu autonomii, z zachowaniem nadrzędnej roli lekarza (paradygmat *Human-in-the-Loop*):

> **„Lekarz kończy wizytę → AdiPOZ autonomicznie analizuje przypadek → znajduje rzeczy, które mogą wymagać uwagi → proponuje działania → lekarz zatwierdza.”**

### Etapy Przepływu:
1. **Lekarz kończy wizytę:**
   * Lekarz POZ wprowadza w interfejsie wywiad, objawy pacjenta, zaktualizowaną listę leków, parametry życiowe (ciśnienie, tętno, temperatura) oraz pomiary antropometryczne (waga, wzrost, BMI).
   * Kliknięcie przycisku zakończenia wizyty („Zakończ wizytę i przekaż do AdiPOZ”) inicjuje autonomiczny proces analizy w tle.

2. **AdiPOZ autonomicznie analizuje przypadek:**
   * System wieloagentyczny (`SystemOrchestrator`) uruchamia kaskadę wyspecjalizowanych podsystemów analitycznych.
   * Porównuje bieżący stan z całą zarejestrowaną historią pacjenta w bazie `LocalPatientDB`.
   * Przetwarza dane w oparciu o wytyczne medyczne (EBM), algorytmy ICD-10 oraz modele LLM (Gemini / OpenAI) lub lokalny silnik suwerenny (`SovereignEngine`).

3. **Znajduje rzeczy, które mogą wymagać uwagi:**
   * **Bezpieczeństwo lekowe i polipragmazja:** Wykrywanie niebezpiecznych interakcji międzylekowych, powielania substancji czynnych oraz przeciwwskazań narządowych (np. niewydolność nerek przy ACEI/metforminie).
   * **Wahania wagi i BMI:** Moduł `BmiVarianceService` identyfikuje nagłe anomalie (np. niezamierzony spadek wagi >2 pkt BMI mogący wskazywać na chorobę nowotworową, lub gwałtowny skok wagi w dekompensacji krążenia).
   * **Korelacja farmakoterapii z metabolizmem:** Moduł `MedicationCorrelationService` wskazuje, które leki mogły wywołać zmiany masy ciała.
   * **Luki diagnostyczne NFZ:** Identyfikacja brakujących badań profilaktycznych lub laboratoryjnych wymaganych dla pacjenta z daną chorobą przewlekłą (np. brak lipidogramu i HbA1c w cukrzycy t. 2).
   * **Czerwone Flagi (Red Flags):** Natychmiastowa eskalacja objawów sugerujących stany zagrożenia życia.

4. **Proponuje działania:**
   * Agent formułuje konkretne, gotowe do podjęcia decyzje kliniczne:
     * Sugestie modyfikacji dawek lub odstawienia leków wchodzących w interakcje.
     * Pakiety badań laboratoryjnych do zlecenia w ramach budżetu powierzonego POZ.
     * Wyznaczenie terminu wizyty kontrolnej wraz z celem terapeutycznym.
     * Propozycje wpisu do e-Recepty (format P1 JSON).
     * Szkic ustrukturyzowanej notatki lekarskiej SOAP.

5. **Lekarz zatwierdza (Human-in-the-Loop):**
   * Lekarz przegląda przygotowane propozycje w dedykowanym panelu agenta.
   * Ma możliwość zatwierdzenia poszczególnych rekomendacji, ich edycji lub odrzucenia, albo skorzystania z opcji „Zatwierdź wszystkie działania jednym kliknięciem”.
   * Każde zatwierdzenie jest nieodwracalnie rejestrowane w dzienniku audytowym `MedicalAuditLog` wraz ze znacznikiem czasu i identyfikatorem lekarza.

---

## 2. Przegląd i Architektura Projektu
**🩺 ADIPOZ → Professional Agent** to specjalistyczny system wspomagania decyzji klinicznych (CDSS) zaprojektowany od podstaw dla specyfiki polskiej Podstawowej Opieki Zdrowotnej. Architektura łączy suwerenność danych (Privacy-First) z zaawansowaną inteligencją kognitywną:
* **Warstwa Klienta (SPA):** Reaktywny interfejs w React 19 z natychmiastowym czasem reakcji, interaktywnymi wykresami Recharts i animacjami Motion.
* **Warstwa Backendowa (Proxy):** Dedykowany serwer Node.js/Express, który chroni klucze API, zapewnia szyfrowanie transmisji i obsługuje strumieniowanie odpowiedzi AI (SSE).
* **Warstwa Odporności Danych:** Zabezpieczona obsługa pamięci lokalnej (LocalPatientDB) z defensywnym `try/catch` i mechanizmami automatycznego odzyskiwania po błędach.

---

## 3. Stos Technologiczny
* **Frontend:** React 19 + TypeScript 5.8
* **Stylizacja:** Tailwind CSS v4 (wsparcie trybu jasnego i ciemnego)
* **Wizualizacja:** Recharts 3.8 (krzywe BMI, poziomy ciśnienia tętniczego, punkty zdarzeń lekowych, strefy referencyjne)
* **Animacje:** Motion (`motion/react`)
* **Ikony:** Lucide React
* **AI & Modele:** `@google/genai` (Google Gemini), OpenAI SDK
* **Generowanie Dokumentacji & Raportów:** jsPDF + AutoTable
* **Środowisko Uruchomieniowe:** Node.js v20+ / Docker Cloud Run

---

## 4. Kluczowe Moduły i Serwisy Systemowe
* **`SystemOrchestrator`**: Centralny dyrygent orkiestrujący cykl analizy pacjenta, przełączanie między trybami i integrację podsystemów.
* **`DecisionEngine`**: Silnik wnioskowania diagnostycznego (kody ICD-10, diagnozy różnicowe, plany leczenia).
* **`MedicationAnalysisEngine`**: Weryfikacja bezpieczeństwa farmakoterapii, interakcji lekowych i polipragmazji.
* **`BmiVarianceService`**: Algorytm wyliczający wariancję BMI (delta BMI) oraz generujący alerty o gwałtownych skokach masy ciała.
* **`MedicationCorrelationService`**: Mapowanie i korelacja wdrożeń leków (np. Ozempic, Forxiga, Ramipril) z osią czasu wykresu BMI.
* **`WeightGoalService`**: Zarządzanie celami wagowymi pacjenta i obliczanie dynamicznych linii referencyjnych na wykresie.
* **`MedicalAuditLog`**: Niezmienny rejestr audytu zdarzeń medycznych i decyzji podejmowanych przez lekarza.
* **`SovereignEngine`**: W 100% lokalny silnik analizy regułowej EBM, funkcjonujący bez połączenia z zewnętrznymi API.
* **`EReceptaService`**: Generowanie i walidacja pakietów e-recepty w standardzie P1 JSON.
* **`LocalPatientDB`**: Bezpieczna lokalna baza historii wizyt z weryfikacją spójności danych.
* **`NotificationService`**: Dźwiękowe i wizualne centrum powiadomień klinicznych.

---

## 5. Prawa Autorskie, Własność Intelektualna i Klauzula Prawna
System **🩺 ADIPOZ → Professional Agent**, wszystkie jego komponenty programistyczne, algorytmy analizy korelacyjnej, struktury danych, szablony raportów oraz interfejs graficzny stanowią wyłączną własność intelektualną i majątkową:

**Ewelina Lesiak**  
Adres e-mail do kontaktu: `ewelinalesiak7@gmail.com`  
© 2026 Ewelina Lesiak. Wszelkie Prawa Zastrzeżone (All Rights Reserved).

Kopiowanie, powielanie, dekompilacja, dystrybucja, oferowanie w modelu SaaS lub komercyjne wdrażanie kodu źródłowego bez uprzedniej pisemnej umowy licencyjnej zawartej z Właścicielką jest surowo zabronione i podlega sankcjom prawnym.
