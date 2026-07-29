import React, { useState, useRef, useEffect, useMemo } from "react";
import { Send, Stethoscope, Search, MapPin, Loader2, Copy, Check, Trash2, Mic, Square, Pill, FileText, AlertCircle, Activity, FilePlus, User, FileCode, ShieldAlert, HeartPulse, Printer, FileText as FileTextIcon, Scale, TrendingUp, Zap, Sparkles, Shield, Plus, ListPlus } from "lucide-react";
import { ClinicalAlertEngine, ClinicalAlert, AlertSeverity } from "../services/ClinicalAlertEngine";
import ReactMarkdown from "react-markdown";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { streamChatResponse, ChatMode } from "../services/gemini";
import { streamOpenAIChat } from "../services/openai";
import { SovereignEngine } from "../services/SovereignEngine";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "../lib/utils";
import QuickActions, { CopyButton } from "./QuickActions";

const sovereignEngine = new SovereignEngine();

const handlePrintSummaryAndNote = (dataToPrint: any) => {
  if (!dataToPrint) {
    alert("Brak danych wizyty do wydruku. Najpierw wygeneruj podsumowanie podając dane pacjenta i objawy.");
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    alert("Nie udało się zainicjować drukowania nadrzędnego.");
    return;
  }

  const currentDate = new Date().toLocaleString("pl-PL");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="utf-8">
      <title>Notatka Medyczna z Wizyty - AdiPOZ</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          line-height: 1.5;
          padding: 30px;
          margin: 0;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #059669;
          padding-bottom: 12px;
          margin-bottom: 25px;
        }
        .header h1 {
          color: #047857;
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        .header .meta {
          text-align: right;
          font-size: 11px;
          color: #64748b;
        }
        .section {
          margin-bottom: 22px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .section-content {
          font-size: 13px;
          color: #334155;
          white-space: pre-wrap;
          text-align: justify;
        }
        .grid {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 16px;
          margin-bottom: 22px;
        }
        .card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
        }
        .card-title {
          font-weight: 700;
          font-size: 11px;
          color: #475569;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .footer {
          margin-top: 40px;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
        }
        .signature-area {
          margin-top: 50px;
          display: flex;
          justify-content: flex-end;
        }
        .signature-box {
          border-top: 1px dashed #94a3b8;
          width: 180px;
          text-align: center;
          padding-top: 4px;
          font-size: 11px;
          color: #64748b;
        }
        .badge {
          display: inline-block;
          background: #f1f5f9;
          color: #334155;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-right: 4px;
          border: 1px solid #e2e8f0;
        }
        .alert-badge {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>AdiPOZ</h1>
          <div style="font-size: 12px; color: #475569; margin-top: 1px; font-weight: 500;">Szpitalny & POZ Asystent Medyczny Decyzji Klinicznych</div>
        </div>
        <div class="meta">
          <div><strong>Data sporządzenia:</strong> ${currentDate}</div>
          <div><strong>Status dokumentu:</strong> Oryginał (Podsumowanie)</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Podsumowanie Kliniczne Wizyty</div>
        <div class="section-content">
          ${dataToPrint.podsumowanie_wizyty || "Brak sporządzonego klinicznego podsumowania wizyty."}
        </div>
      </div>

      ${dataToPrint.podsumowanie_leczenia ? `
      <div class="section">
        <div class="section-title">2. Podsumowanie i Plan Terapii</div>
        <div class="section-content">
          ${dataToPrint.podsumowanie_leczenia}
        </div>
      </div>
      ` : ''}

      <div class="grid">
        ${dataToPrint.kody_rozliczeniowe ? `
        <div class="card">
          <div class="card-title">Klasyfikacja NFZ (Rozliczenia)</div>
          <div style="font-size: 12px; color: #334155;">
            <p style="margin: 3px 0;"><strong>ICD-10 (Rozpoznania):</strong></p>
            <div style="margin: 4px 0 8px 0;">
              ${dataToPrint.kody_rozliczeniowe["ICD-10"]?.map((c: string) => `<span class="badge">${c}</span>`).join('') || '—'}
            </div>
            <p style="margin: 3px 0;"><strong>ICD-9 (Procedury):</strong></p>
            <div style="margin: 4px 0 8px 0;">
              ${dataToPrint.kody_rozliczeniowe["ICD-9"]?.map((c: string) => `<span class="badge">${c}</span>`).join('') || '—'}
            </div>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b; font-style: italic; line-height: 1.3;">
              <strong>Medyczne Uzasadnienie:</strong> ${dataToPrint.kody_rozliczeniowe.Uzasadnienie || '—'}
            </p>
          </div>
        </div>
        ` : ''}

        ${dataToPrint.bezpieczenstwo_lekowe ? `
        <div class="card">
          <div class="card-title">Farmakoterapia & Bezpieczeństwo</div>
          <div style="font-size: 12px; color: #334155; line-height: 1.4;">
            <p style="margin: 3px 0;"><strong>Poziom ryzyka interakcji:</strong> 
              <span class="badge alert-badge" style="text-transform: uppercase;">
                ${dataToPrint.bezpieczenstwo_lekowe.poziom_ryzyka || 'niskie'}
              </span>
            </p>
            <p style="margin: 6px 0 3px 0;"><strong>Wykryte interakcje:</strong></p>
            <p style="margin: 0; font-size: 11.5px; color: #475569;">${dataToPrint.bezpieczenstwo_lekowe.interakcje || 'Brak krytycznych interakcji międzylekowych.'}</p>
            <p style="margin: 6px 0 3px 0;"><strong>Dawkowanie / Wskazówki:</strong></p>
            <p style="margin: 0; font-size: 11.5px; color: #475569;">${dataToPrint.bezpieczenstwo_lekowe.dawkowanie || 'Zgodne ze standardem klinicznym.'}</p>
          </div>
        </div>
        ` : ''}
      </div>

      ${dataToPrint.opieka_koordynowana ? `
      <div class="section">
        <div class="section-title">3. Ścieżka Opieki Koordynowanej</div>
        <div class="section-content" style="font-size: 12.5px;">
          <p style="margin: 2px 0;"><strong>Profil opieki koordynowanej:</strong> <span class="badge" style="background:#eef2ff; color:#4f46e5; border-color:#c7d2fe;">${dataToPrint.opieka_koordynowana.sciezka || 'Ogólny POZ'}</span></p>
          <p style="margin: 6px 0 0 0;"><strong>Rekomendowane konsultacje specjalistyczne i diagnostyka:</strong></p>
          <p style="margin: 2px 0; color: #475569;">${dataToPrint.opieka_koordynowana.konsultacje || 'Brak pilnych wskazań specjalistycznych poza standardową ambulatoryjną ścieżką POZ.'}</p>
        </div>
      </div>
      ` : ''}

      ${dataToPrint.podsumowanie_dla_pacjenta ? `
      <div class="section" style="page-break-before: always; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1;">
        <div class="section-title" style="color: #047857; border-bottom-color: #a7f3d0;">4. Zalecenia i Instrukcje dla Pacjenta (Karta Pacjenta)</div>
        <div class="section-content" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; color: #14532d;">
          <p style="margin-top: 0; font-size: 13px; line-height: 1.5; font-weight: 500;">
            ${dataToPrint.podsumowanie_dla_pacjenta.wyjasnienie || 'Zaleca się regularny tryb życia i monitorowanie podstawowych parametrów życiowych.'}
          </p>
          <p style="margin: 10px 0 5px 0; font-size: 12.5px;"><strong>Pilność wizyt kontrolnych / badań:</strong> <span class="badge" style="background:#ffffff; color:#15803d; border-color:#bbf7d0;">${dataToPrint.podsumowanie_dla_pacjenta.pilnosc_badan || 'Standardowa'}</span></p>
          <p style="margin: 12px 0 4px 0; font-size: 12.5px; font-weight: 700;">Zasady postępowania i przyjmowania leków:</p>
          <ol style="margin-bottom: 0; margin-top: 4px; padding-left: 20px; font-size: 12.5px; line-height: 1.5;">
            ${dataToPrint.podsumowanie_dla_pacjenta.zalecenia?.map((z: string) => `<li style="margin-bottom: 4px;">${z}</li>`).join('') || '<li>Stosuj się do dotychczasowych wskazówek lekarskich.</li>'}
          </ol>
        </div>
      </div>
      ` : ''}

      <div class="signature-area">
        <div class="signature-box">
          Podpis i pieczątka lekarza
        </div>
      </div>

      <div class="footer">
        Dokument wygenerowany asystencko przy użyciu oprogramowania wspomagania decyzji AdiPOZ. Ma charakter pomocniczy. Ostateczną diagnozę i decyzję terapeutyczną podejmuje lekarz ubezpieczenia zdrowotnego / prowadzący.
      </div>
    </body>
    </html>
  `;

  const iframeWindow = iframe.contentWindow;
  if (iframeWindow) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframeWindow.focus();
      iframeWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  } else {
    alert("Nie udało się otworzyć okna wydruku.");
    document.body.removeChild(iframe);
  }
};


interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  mode: ChatMode;
  modelType?: "gemini" | "gpt4o";
}

interface ChatProps {
  isSovereignMode?: boolean;
  patientInfo?: any;
}

export default function Chat({ isSovereignMode = false, patientInfo = {} }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("analysis");
  const [modelType, setModelType] = useState<"gemini" | "gpt4o">("gpt4o");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicalAlerts, setClinicalAlerts] = useState<ClinicalAlert[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const lastModelMessage = useMemo(() => {
    return [...messages].reverse().find(m => m.role === 'model');
  }, [messages]);

  const lastParsedJson = useMemo(() => {
    if (!lastModelMessage) return null;
    try {
      return JSON.parse(lastModelMessage.content);
    } catch {
      return null;
    }
  }, [lastModelMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const alerts = ClinicalAlertEngine.analyzeInput(input);
      setClinicalAlerts(alerts);
    }, 300); // 300ms debounce
    return () => clearTimeout(handler);
  }, [input]);

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Twoja przeglądarka nie obsługuje rozpoznawania mowy.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pl-PL';
    recognition.interimResults = true;
    recognition.continuous = true;

    const currentInput = input;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      
      setInput((currentInput ? currentInput + ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Nie udało się uruchomić mikrofonu.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    
    if (trimmedInput.length === 0) {
      setError("Wiadomość nie może być pusta.");
      return;
    }
    
    if (trimmedInput.length > 10000) {
      setError("Wiadomość jest zbyt długa (maksymalnie 10000 znaków).");
      return;
    }

    if (isLoading) return;

    setError(null);

    let latLng: { latitude: number; longitude: number } | undefined;
    if (mode === "maps") {
      setIsLoading(true);
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        latLng = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
      } catch (e) {
        console.error("Location error:", e);
        setError("Nie udało się pobrać lokalizacji. Upewnij się, że udzieliłeś uprawnień do lokalizacji w przeglądarce.");
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedInput,
      mode,
      modelType,
    };

    // BP Alert check
    // Removed: bpAlert logic moved to useEffect

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const modelMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: modelMessageId, role: "model", content: "", mode, modelType },
    ]);

    try {
      if (isSovereignMode && mode === "analysis") {
        // Sovereign Mode: 100% Local Analysis
        const result = await sovereignEngine.analyze(trimmedInput, "", patientInfo);
        const jsonResponse = JSON.stringify(result, null, 2);
        
        // Simulate streaming for better UX
        let currentText = "";
        const words = jsonResponse.split(" ");
        for (let i = 0; i < words.length; i++) {
          currentText += words[i] + (i === words.length - 1 ? "" : " ");
          if (i % 5 === 0 || i === words.length - 1) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === modelMessageId
                  ? { ...msg, content: currentText }
                  : msg
              )
            );
            await new Promise(r => setTimeout(r, 10));
          }
        }
      } else if (modelType === "gpt4o" && mode === "analysis") {
        // Truncate history to avoid token limits (last 10 messages)
        const history = messages
          .filter(m => m.mode === "analysis")
          .slice(-10)
          .map(m => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content
          }));
        
        const stream = streamOpenAIChat([...history, { role: "user", content: userMessage.content }]);
        
        let fullResponse = "";
        for await (const chunk of stream) {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        }
      } else {
        // Fallback to Gemini for other modes or if selected
        // Truncate history to avoid token limits (last 10 messages)
        const history = mode === "analysis" 
          ? messages.filter(m => m.mode === "analysis").slice(-10).map(m => ({
              role: m.role,
              parts: [{ text: m.content }]
            }))
          : [];

        const stream = streamChatResponse(userMessage.content, mode, history, latLng, patientInfo);
        
        let fullResponse = "";
        for await (const chunk of stream) {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      let displayError = "Wystąpił nieoczekiwany błąd podczas komunikacji z AI.";
      
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        displayError = "Błąd sieci: Nie można połączyć się z serwerem. Sprawdź swoje połączenie internetowe.";
      } else if (error.message && error.message.includes("401")) {
        displayError = "Błąd uwierzytelnienia: Brak uprawnień do korzystania z API. Sprawdź klucz API.";
      } else if (error.message && error.message.includes("429")) {
        displayError = "Osiągnięto limit zapytań do API. Spróbuj ponownie za chwilę.";
      } else if (error.message && error.message.includes("500")) {
        displayError = "Błąd serwera AI: Serwer napotkał problem. Spróbuj ponownie później.";
      } else {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) displayError = `${parsed.service || 'System'}: ${parsed.error}`;
        } catch {
          displayError = error.message || displayError;
        }
      }
      
      setError(displayError);
      setMessages((prev) => prev.filter(msg => msg.id !== modelMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && input.length <= 10000) {
        handleSubmit(e as any);
      }
    }
  };

  const handleSummarize = async () => {
    if (messages.length === 0 || isLoading) return;
    
    setMode("analysis");
    const summaryPrompt = "Proszę o zwięzłe podsumowanie tej wizyty na podstawie dotychczasowej rozmowy. Skup się na kluczowych objawach, wstępnej diagnozie i planowanych krokach.";
    
    // We need to trigger handleSubmit with this prompt
    // But handleSubmit uses the 'input' state.
    // Let's modify handleSubmit slightly or just set input and call it.
    setInput(summaryPrompt);
    // We can't easily call handleSubmit directly because it's an async event handler.
    // Better to just trigger it by setting a flag or similar, but let's try setting input and then triggering.
    // Actually, I'll just copy the logic into handleSummarize for clarity.
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: summaryPrompt,
      mode: "analysis",
      modelType,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const modelMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: modelMessageId, role: "model", content: "", mode: "analysis", modelType },
    ]);

    try {
      if (isSovereignMode) {
        const result = await sovereignEngine.analyze(summaryPrompt, "", patientInfo);
        const jsonResponse = JSON.stringify(result, null, 2);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? { ...msg, content: jsonResponse }
              : msg
          )
        );
      } else if (modelType === "gpt4o") {
        const history = messages
          .filter(m => m.mode === "analysis")
          .slice(-10)
          .map(m => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content
          }));
        
        const stream = streamOpenAIChat([...history, { role: "user", content: userMessage.content }]);
        
        let fullResponse = "";
        for await (const chunk of stream) {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        }
      } else {
        const history = messages.filter(m => m.mode === "analysis").slice(-10).map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

        const stream = streamChatResponse(userMessage.content, "analysis", history, undefined, patientInfo);
        
        let fullResponse = "";
        for await (const chunk of stream) {
          fullResponse += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        }
      }
    } catch (error: any) {
      console.error("Summarize error:", error);
      let displayError = "Wystąpił błąd podczas generowania podsumowania.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) displayError = `${parsed.service || 'System'}: ${parsed.error}`;
      } catch {
        displayError = error.message || displayError;
      }
      setError(displayError);
      setMessages((prev) => prev.filter(msg => msg.id !== modelMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setClinicalAlerts([]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-700 dark:text-blue-400">
            <Stethoscope size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">AdiPOZ</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Twój asystent medyczny AI</p>
          </div>
          {isSovereignMode && (
            <div className="ml-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <Shield size={12} />
              TRYB SUWERENNY (OFFLINE)
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => alert("Profil użytkownika")}><User size={14} className="mr-1"/>Użytkownik</Button>
            <Button variant="outline" size="sm" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => alert("Otwieram e-receptę")}><Pill size={14} className="mr-1"/>e-Recepta</Button>
            <Button variant="outline" size="sm" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => alert("Otwieram e-wizytę")}><FileText size={14} className="mr-1"/>e-Wizyta</Button>
            <Button variant="outline" size="sm" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => alert("Otwieram e-skierowanie")}><FilePlus size={14} className="mr-1"/>e-Skierowanie</Button>
            <Button variant="outline" size="sm" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => window.print()}><Printer size={14} className="mr-1"/>Drukuj Zalecenia dla Pacjenta</Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/40 font-semibold" 
              onClick={() => handlePrintSummaryAndNote(lastParsedJson)}
              disabled={!lastParsedJson}
              title={!lastParsedJson ? "Najpierw wygeneruj wizytę za pomocą asystenta" : "Szybkie drukowanie sformatowanej karty pacjenta"}
            >
              <Printer size={14} className="mr-1 text-emerald-600 dark:text-emerald-400"/> Szybki Druk A4
            </Button>
          </div>
          {clinicalAlerts.map(alert => (
            <div 
              key={alert.id}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 border animate-pulse ring-2 ring-offset-1",
                alert.severity === AlertSeverity.CRITICAL 
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800 ring-red-400"
                  : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800 ring-yellow-400"
              )}
            >
              <AlertCircle size={16} />
              {alert.message}
            </div>
          ))}
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
            <div className="relative group">
              <button
                onClick={() => setMode("analysis")}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  mode === "analysis" ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm" : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                )}
              >
                <Stethoscope size={16} />
                Analiza Wizyty
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-800 dark:bg-slate-700 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg pointer-events-none">
                Analizuj objawy i notatki z wizyty
              </div>
            </div>
            <div className="relative group">
              <button
                onClick={() => setMode("search")}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  mode === "search" ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm" : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                )}
              >
                <Search size={16} />
                Szukaj Wytycznych
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-800 dark:bg-slate-700 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg pointer-events-none">
                Przeszukuj wytyczne i bazę wiedzy medycznej
              </div>
            </div>
            <div className="relative group">
              <button
                onClick={() => setMode("maps")}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  mode === "maps" ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm" : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                )}
              >
                <MapPin size={16} />
                Znajdź Placówkę
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-800 dark:bg-slate-700 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg pointer-events-none">
                Wyszukaj pobliskie placówki i specjalistów
              </div>
            </div>
          </div>

          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setModelType("gpt4o")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                modelType === "gpt4o" ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm" : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              )}
            >
              <Zap size={16} className={modelType === "gpt4o" ? "text-amber-500" : ""} />
              GPT-4o
            </button>
            <button
              onClick={() => setModelType("gemini")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                modelType === "gemini" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
              )}
            >
              <Sparkles size={16} className={modelType === "gemini" ? "text-indigo-500" : ""} />
              Gemini
            </button>
          </div>
          
          {messages.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearChat}
              className="text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 size={16} className="mr-2" />
              Wyczyść czat
            </Button>
          )}
        </div>
      </header>

      
      <QuickActions 
        gotoweTeksty={lastParsedJson?.gotowe_teksty} 
        onSummarize={handleSummarize}
        hasMessages={messages.length > 0}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-slate-950">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-4 text-blue-600 dark:text-blue-400">
              <Stethoscope size={48} />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-2">AdiPOZ 3.1 Pro gotowy.</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              Podaj przypadek pacjenta lub transkrypcję wizyty.
            </p>
            <div className="grid grid-cols-1 gap-3 w-full">
              <button 
                onClick={() => { 
                  setMode("analysis"); 
                  setInput("Pacjent lat 65, zgłasza się z dusznością wysiłkową od 2 tygodni. W wywiadzie nadciśnienie i cukrzyca typu 2."); 
                  setError(null);
                }}
                className="text-left p-3 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-sm text-gray-700 dark:text-slate-300"
              >
                "Pacjent lat 65, zgłasza się z dusznością wysiłkową..."
              </button>
              <button 
                onClick={() => { 
                  setMode("search"); 
                  setInput("Jakie są aktualne wytyczne PTNT dotyczące leczenia nadciśnienia u kobiet w ciąży?"); 
                  setError(null);
                }}
                className="text-left p-3 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-sm text-gray-700 dark:text-slate-300"
              >
                "Wytyczne PTNT nadciśnienie w ciąży"
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex flex-col gap-2">
          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm px-1 font-medium">
              {error}
            </div>
          )}
          <div className="relative flex items-end gap-2">
            <div className="relative flex-1">
              <Textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === "analysis" ? "Opisz przebieg wizyty lub wklej notatki..." :
                  mode === "search" ? "Czego szukasz w wytycznych?" :
                  "Jakiej placówki lub specjalisty szukasz?"
                }
                className={cn(
                  "resize-none pr-12 pb-7 pt-3 min-h-[80px] text-base dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500",
                  (error || input.length > 10000) && "border-red-500 focus-visible:ring-red-500"
                )}
                disabled={isLoading}
              />
              <div 
                className={cn(
                  "absolute bottom-2 right-3 text-xs",
                  input.length > 10000 ? "text-red-500 font-medium" : "text-gray-400 dark:text-slate-500"
                )}
              >
                {input.length}/10000
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button 
                type="button"
                onClick={toggleRecording}
                variant={isRecording ? "default" : "outline"}
                className={cn(
                  "h-12 w-12 rounded-full",
                  isRecording ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" : "dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
                title={isRecording ? "Zatrzymaj nagrywanie" : "Rozpocznij nagrywanie"}
              >
                {isRecording ? <Square size={20} /> : <Mic size={20} />}
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim() || input.length > 10000}
                className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </Button>
            </div>
          </div>
        </form>
        <div className="text-center mt-2">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            AdiPOZ to asystent AI. Ostateczna decyzja kliniczna zawsze należy do lekarza.
          </p>
        </div>
      </div>

    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const parsedJson = useMemo(() => {
    if (isUser || !message.content) return null;
    try {
      const parsed = JSON.parse(message.content);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }, [message.content, isUser]);

  const isJson = parsedJson !== null;
  const chartData = parsedJson?.dane_do_wizualizacji;
  const hasChartData = Array.isArray(chartData) && chartData.length > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div 
        className={cn(
          "max-w-[85%] rounded-2xl px-5 py-4 relative group transition-colors duration-200",
          isUser 
            ? "bg-blue-600 dark:bg-blue-700 text-white rounded-br-sm shadow-md" 
            : "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-200 rounded-bl-sm shadow-sm"
        )}
      >
        {!isUser && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            {isJson && (
              <button 
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md text-gray-600 dark:text-slate-400 transition-colors text-xs font-medium"
                title="Kopiuj JSON do schowka"
              >
                {copiedJson ? <Check size={14} className="text-green-600 dark:text-green-400" /> : <Copy size={14} />}
                Kopiuj JSON
              </button>
            )}
            <button 
              onClick={handleCopy}
              className="p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md text-gray-500 dark:text-slate-400 transition-colors"
              title="Kopiuj tekst"
            >
              {copied ? <Check size={14} className="text-green-600 dark:text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
        )}
        
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose prose-sm max-w-none prose-blue dark:prose-invert">
            {message.content ? (
              <>
                {isJson ? (
                  <div className="flex flex-col gap-4 w-full mt-2">
                    {parsedJson.ryzyko === 'wysokie' && (
                      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded shadow-sm">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertCircle size={20} />
                          <span>UWAGA: Wysokie ryzyko!</span>
                        </div>
                      </div>
                    )}

                    {parsedJson.brakujące_dane && parsedJson.brakujące_dane.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-400 p-4 rounded shadow-sm">
                        <h4 className="font-semibold flex items-center gap-2 mb-2 dark:text-yellow-300"><Search size={16}/> Brakujące dane - pytania do lekarza:</h4>
                        <ul className="list-disc pl-5 space-y-1 dark:text-yellow-400/80">
                          {parsedJson.brakujące_dane.map((pytanie: string, i: number) => <li key={i}>{pytanie}</li>)}
                        </ul>
                      </div>
                    )}

                    {parsedJson.podsumowanie_wizyty && (
                      <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2"><FileText size={16}/> Podsumowanie wizyty</h4>
                          <Button size="sm" variant="outline" className="text-xs h-7 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/20 font-semibold" onClick={() => handlePrintSummaryAndNote(parsedJson)}>
                            <Printer size={12} className="mr-1" /> Szybki Druk Karty Wizyty (A4)
                          </Button>
                        </div>
                        <p className="text-gray-600 dark:text-slate-400 leading-relaxed text-sm">{parsedJson.podsumowanie_wizyty}</p>
                      </div>
                    )}

                    {parsedJson.mapped_symptoms && parsedJson.mapped_symptoms.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-1"><Activity size={16}/> Zmapowane objawy (terminologia medyczna)</h4>
                        <div className="flex flex-wrap gap-2">
                          {parsedJson.mapped_symptoms.map((symptom: string, i: number) => (
                            <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800">
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {parsedJson.care_gaps && parsedJson.care_gaps.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-1"><AlertCircle size={16}/> Care Gaps</h4>
                        <ul className="list-disc pl-5 text-gray-600 dark:text-slate-400 space-y-1">
                          {parsedJson.care_gaps.map((gap: string, i: number) => <li key={i}>{gap}</li>)}
                        </ul>
                      </div>
                    )}

                    {parsedJson.proponowane_kroki && parsedJson.proponowane_kroki.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2"><Activity size={16}/> Proponowane kroki</h4>
                          <div className="flex gap-2">
                            {parsedJson.proponowane_kroki.find((k: string) => k.toLowerCase().includes('ekg')) && (
                              <CopyButton 
                                label="Kopiuj EKG" 
                                text={parsedJson.proponowane_kroki.find((k: string) => k.toLowerCase().includes('ekg'))} 
                                icon={<Activity size={14}/>} 
                              />
                            )}
                            <Button size="sm" variant="outline" className="text-xs h-7 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => alert("Generuję skierowania: " + parsedJson.proponowane_kroki.join(", "))}>
                              <FileTextIcon size={12} className="mr-1" /> Generuj Skierowania
                            </Button>
                          </div>
                        </div>
                        <ul className="list-disc pl-5 text-gray-600 dark:text-slate-400 space-y-1">
                          {parsedJson.proponowane_kroki.map((krok: string, i: number) => <li key={i}>{krok}</li>)}
                        </ul>
                      </div>
                    )}

                    {parsedJson.podsumowanie_leczenia && (
                      <div className="mt-2">
                        <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-1"><FileText size={16}/> Podsumowanie leczenia</h4>
                        <p className="text-gray-600 dark:text-slate-400 leading-relaxed">{parsedJson.podsumowanie_leczenia}</p>
                      </div>
                    )}

                    {parsedJson.kody_rozliczeniowe && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-2"><FileCode size={16}/> Kody rozliczeniowe (NFZ)</h4>
                        <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                          <p className="flex items-center gap-2">
                            <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                            <strong>ICD-10:</strong> {parsedJson.kody_rozliczeniowe["ICD-10"]?.join(", ")}
                          </p>
                          <p className="flex items-center gap-2">
                            <ListPlus size={14} className="text-blue-600 dark:text-blue-400" />
                            <strong>ICD-9:</strong> {parsedJson.kody_rozliczeniowe["ICD-9"]?.join(", ")}
                          </p>
                          <p className="mt-2 text-xs italic opacity-80">{parsedJson.kody_rozliczeniowe.Uzasadnienie}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                      <CopyButton label="Kopiuj ICD-10" text={parsedJson.kody_rozliczeniowe?.["ICD-10"]?.join(", ")} icon={<FileCode size={14}/>} />
                      <CopyButton label="Kopiuj ICD-9" text={parsedJson.kody_rozliczeniowe?.["ICD-9"]?.join(", ")} icon={<FileCode size={14}/>} />
                      <CopyButton label="Kopiuj Uzasadnienie" text={parsedJson.kody_rozliczeniowe?.Uzasadnienie} icon={<FileText size={14}/>} />
                    </div>

                    {parsedJson.bezpieczenstwo_lekowe && (
                      <div className={cn(
                        "p-4 rounded-xl border-l-4 shadow-sm",
                        parsedJson.bezpieczenstwo_lekowe.poziom_ryzyka === 'krytyczne' 
                          ? "bg-red-50 dark:bg-red-900/20 border-red-500" 
                          : parsedJson.bezpieczenstwo_lekowe.poziom_ryzyka === 'wysokie'
                          ? "bg-orange-50 dark:bg-orange-900/20 border-orange-500"
                          : "bg-amber-50 dark:bg-amber-900/20 border-amber-400"
                      )}>
                        <h4 className={cn(
                          "font-semibold flex items-center gap-2 mb-2",
                          parsedJson.bezpieczenstwo_lekowe.poziom_ryzyka === 'krytyczne'
                            ? "text-red-900 dark:text-red-300"
                            : parsedJson.bezpieczenstwo_lekowe.poziom_ryzyka === 'wysokie'
                            ? "text-orange-900 dark:text-orange-300"
                            : "text-amber-900 dark:text-amber-300"
                        )}>
                          <ShieldAlert size={16}/> 
                          Moduł Bezpieczeństwa (Interakcje)
                          {parsedJson.bezpieczenstwo_lekowe.poziom_ryzyka && (
                            <span className="ml-auto text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">
                              {parsedJson.bezpieczenstwo_lekowe.poziom_ryzyka}
                            </span>
                          )}
                        </h4>
                        <div className={cn(
                          "text-sm space-y-2",
                          parsedJson.bezpieczenstwo_lekowe.poziom_ryzyka === 'krytyczne'
                            ? "text-red-800 dark:text-red-400"
                            : parsedJson.bezpieczenstwo_lekowe.poziom_ryzyka === 'wysokie'
                            ? "text-orange-800 dark:text-orange-400"
                            : "text-amber-800 dark:text-amber-400"
                        )}>
                          <p><strong>Interakcje:</strong> {parsedJson.bezpieczenstwo_lekowe.interakcje}</p>
                          <p><strong>Dawkowanie:</strong> {parsedJson.bezpieczenstwo_lekowe.dawkowanie}</p>
                          <p><strong>Ostrzeżenia:</strong> {parsedJson.bezpieczenstwo_lekowe.ostrzezenia}</p>
                        </div>
                      </div>
                    )}

                    {parsedJson.podsumowanie_dla_pacjenta && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <h4 className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2"><HeartPulse size={16}/> Podsumowanie dla pacjenta</h4>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-xs h-7 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30" onClick={() => window.print()}>
                              <Printer size={12} className="mr-1" /> Drukuj Całą Stronę
                            </Button>
                            <Button size="sm" className="text-xs h-7 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-700 font-bold" onClick={() => handlePrintSummaryAndNote(parsedJson)}>
                              <Printer size={12} className="mr-1" /> Szybki Druk A4 (Karta i Notatki)
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-emerald-800 dark:text-emerald-400/80 space-y-2">
                          <p>{parsedJson.podsumowanie_dla_pacjenta.wyjasnienie}</p>
                          <p className="font-medium text-emerald-900 dark:text-emerald-300">Pilność badań: {parsedJson.podsumowanie_dla_pacjenta.pilnosc_badan}</p>
                          <ul className="list-decimal pl-5 space-y-1">
                            {parsedJson.podsumowanie_dla_pacjenta.zalecenia?.map((krok: string, i: number) => <li key={i}>{krok}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}

                    {parsedJson.opieka_koordynowana && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2"><Stethoscope size={16}/> Opieka Koordynowana</h4>
                          {parsedJson.opieka_koordynowana.sciezka === 'Kardiologiczna' && (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">Kardiolog</span>
                              <CopyButton label="Kopiuj" text="Kardiolog" icon={<Copy size={14}/>} />
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-indigo-800 dark:text-indigo-400/80 space-y-2">
                          <p><strong>Ścieżka:</strong> {parsedJson.opieka_koordynowana.sciezka}</p>
                          <p><strong>Uzasadnienie:</strong> {parsedJson.opieka_koordynowana.uzasadnienie}</p>
                          <div>
                            <strong>Badania powierzone:</strong>
                            <ul className="list-disc pl-5">
                              {parsedJson.opieka_koordynowana.badania_powierzone?.map((badanie: string, i: number) => <li key={i}>{badanie}</li>)}
                            </ul>
                          </div>
                          <p><strong>IPOM (6 mies.):</strong> {parsedJson.opieka_koordynowana.ipom}</p>
                        </div>
                      </div>
                    )}

                    {parsedJson.chronicDiseaseManagement && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity size={16} className="text-amber-600 dark:text-amber-400" />
                          <h4 className="font-semibold text-amber-900 dark:text-amber-300 uppercase text-xs">Zarządzanie Chorobą Przewlekłą</h4>
                        </div>
                        <p className="text-sm text-amber-800 dark:text-amber-400/80 leading-relaxed">
                          {parsedJson.chronicDiseaseManagement}
                        </p>
                      </div>
                    )}

                    {parsedJson.legal_compliance && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
                        <h4 className="font-semibold text-red-900 dark:text-red-300 flex items-center gap-2 mb-2"><Scale size={16}/> Legal & Compliance</h4>
                        <div className="text-sm text-red-800 dark:text-red-400/80 space-y-2">
                          <div>
                            <strong>Czerwone Flagi:</strong>
                            <ul className="list-disc pl-5">
                              {parsedJson.legal_compliance.czerwone_flagi?.map((flaga: string, i: number) => <li key={i}>{flaga}</li>)}
                            </ul>
                          </div>
                          <p><strong>Zgoda i Pouczenie:</strong> {parsedJson.legal_compliance.zgoda_i_pouczenie}</p>
                          <p className="font-bold text-red-950 dark:text-red-200">Ryzyko błędu: {parsedJson.legal_compliance.ryzyko_bledu}/10</p>
                        </div>
                      </div>
                    )}
                    {parsedJson.legal_compliance && (
                      <div className="mt-2">
                        <CopyButton label="Kopiuj Zgoda i Pouczenie" text={parsedJson.legal_compliance.zgoda_i_pouczenie} icon={<Copy size={14}/>} />
                      </div>
                    )}

                    {parsedJson.predictive_health && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                        <h4 className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2 mb-2"><TrendingUp size={16}/> Predictive Health</h4>
                        <div className="text-sm text-amber-800 dark:text-amber-400/80 space-y-2">
                          <p><strong>Ryzyko SCORE2 (10 lat):</strong> {parsedJson.predictive_health.score2}</p>
                          <p><strong>Prognoza (po interwencji):</strong> {parsedJson.predictive_health.prognoza}</p>
                          <p className="font-bold text-amber-950 dark:text-amber-200">Potencjalne oszczędności: {parsedJson.predictive_health.oszczednosci}</p>
                        </div>
                      </div>
                    )}

                    {parsedJson.integration_engine && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2 mb-2"><FileCode size={16}/> Integration Engine</h4>
                        <div className="text-sm text-slate-800 dark:text-slate-400 space-y-2">
                          <p><strong>SQL Queries:</strong> {parsedJson.integration_engine.sql_queries}</p>
                          <p><strong>NoSQL Document:</strong> {parsedJson.integration_engine.nosql_document}</p>
                          <p><strong>P1/P2 Mapping:</strong> {parsedJson.integration_engine.p1_p2_mapping_logic}</p>
                        </div>
                      </div>
                    )}

                    {parsedJson.sovereign_engine && (
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-2 mb-2"><ShieldAlert size={16}/> Sovereign Engine (Local-First)</h4>
                        <div className="text-sm text-zinc-800 dark:text-zinc-400 space-y-2">
                          <p><strong>Clinical Analysis:</strong> {parsedJson.sovereign_engine.local_clinical_analysis}</p>
                          <p><strong>Immutable Ledger:</strong> {parsedJson.sovereign_engine.immutable_ledger_entry}</p>
                          <p><strong>P2P Payload:</strong> {parsedJson.sovereign_engine.p2p_sync_payload}</p>
                        </div>
                      </div>
                    )}

                    {parsedJson.gotowe_teksty && (
                      <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                        <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-3"><Copy size={16}/> Gotowe teksty</h4>
                        <div className="flex flex-wrap gap-2">
                          {parsedJson.gotowe_teksty.do_eWUS && <CopyButton label="Kopiuj eWUŚ" text={parsedJson.gotowe_teksty.do_eWUS} icon={<Search size={14}/>} />}
                          {parsedJson.gotowe_teksty.do_e_recepty && <CopyButton label="Kopiuj e-Recepta" text={parsedJson.gotowe_teksty.do_e_recepty} icon={<Pill size={14}/>} />}
                          {parsedJson.gotowe_teksty.skierowanie && <CopyButton label="Kopiuj e-Skierowanie" text={parsedJson.gotowe_teksty.skierowanie} icon={<FilePlus size={14}/>} />}
                          {parsedJson.gotowe_teksty.dla_pacjenta && <CopyButton label="Kopiuj Dla pacjenta" text={parsedJson.gotowe_teksty.dla_pacjenta} icon={<User size={14}/>} />}
                        </div>
                      </div>
                    )}

                    {parsedJson.uwagi_dodatkowe && (
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2 mb-1"><FileText size={16}/> Uwagi dodatkowe</h4>
                        <p className="text-gray-600 dark:text-slate-400 leading-relaxed">{parsedJson.uwagi_dodatkowe}</p>
                      </div>
                    )}

                    {parsedJson.disclaimer && (
                      <div className="mt-2 text-xs text-gray-400 dark:text-slate-500 italic border-t border-gray-100 dark:border-slate-800 pt-3">
                        {parsedJson.disclaimer}
                      </div>
                    )}
                  </div>
                ) : (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                )}
                {hasChartData && (
                  <div className="mt-6 w-full h-64 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-4 text-center">Wizualizacja danych</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-700" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:fill-slate-400" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:fill-slate-400" />
                        <Tooltip 
                          cursor={{ fill: '#f3f4f6' }}
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            backgroundColor: 'var(--tooltip-bg, #fff)',
                            color: 'var(--tooltip-text, #000)'
                          }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                <span>Analizuję...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
