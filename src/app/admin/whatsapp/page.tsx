"use client";

import React, { useEffect, useState } from "react";
import { WhatsAppBotConfig, WhatsAppMessageLog } from "@/types/domain";
import {
  BellRing,
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Play,
  PowerOff,
  QrCode,
  RefreshCw,
  Save,
  Send,
  Smartphone,
  Sparkles,
} from "lucide-react";

export default function AdminWhatsAppBotPage() {
  const [config, setConfig] = useState<WhatsAppBotConfig | null>(null);
  const [logs, setLogs] = useState<WhatsAppMessageLog[]>([]);
  const [loadingQr, setLoadingQr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [pairingPhone, setPairingPhone] = useState("5522999990001");
  const [testPhone, setTestPhone] = useState("5522999990001");
  const [testName, setTestName] = useState("Mariana Silva (Teste)");
  const [isWhatsappDirect, setIsWhatsappDirect] = useState(false);

  async function loadBotData() {
    const [res, siteRes] = await Promise.all([
      fetch("/api/admin/whatsapp"),
      fetch("/api/admin/site"),
    ]);
    const data = await res.json();
    const siteData = await siteRes.json();

    if (siteData.settings?.booking_mode === "whatsapp_direct") {
      setIsWhatsappDirect(true);
    }

    if (data.config) {
      setConfig(data.config);
      setPairingPhone(data.config.professional_phone || "5522999990001");
      setTestPhone(data.config.professional_phone || "5522999990001");
    }
    if (data.logs) setLogs(data.logs);
  }

  useEffect(() => {
    loadBotData();
    const timer = setInterval(loadBotData, 4000);
    return () => clearInterval(timer);
  }, []);

  function notify(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handleGenerateQr() {
    setLoadingQr(true);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_qr" }),
      });
      const data = await res.json();
      if (data.config) setConfig(data.config);
      notify(
        "QR Code de conexão gerado! Escaneie no WhatsApp da Dra. Fernanda ou confirme o pareamento."
      );
    } finally {
      setLoadingQr(false);
    }
  }

  async function handleConfirmPairing() {
    setLoadingQr(true);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_pairing",
          phone: pairingPhone,
          name: "Dra. Fernanda Caetano • WhatsApp Oficial",
        }),
      });
      const data = await res.json();
      if (data.config) setConfig(data.config);
      notify(
        "WhatsApp da Dra. Fernanda conectado com sucesso! Os lembretes automáticos estão ativos."
      );
    } finally {
      setLoadingQr(false);
    }
  }

  async function handleDisconnect() {
    const res = await fetch("/api/admin/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    const data = await res.json();
    if (data.config) setConfig(data.config);
    notify("Sessão do WhatsApp desconectada.");
  }

  async function handleSaveTemplates(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_templates",
          ...config,
        }),
      });
      const data = await res.json();
      if (data.config) setConfig(data.config);
      notify("Modelos de mensagens e regras de lembrete salvos!");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTestMessage() {
    const res = await fetch("/api/admin/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send_test_message",
        testPhone,
        testName,
      }),
    });
    const data = await res.json();
    if (data.logs) setLogs(data.logs);
    notify("Mensagem de teste processada e registrada no histórico abaixo!");
  }

  async function handleRunSweepNow() {
    const res = await fetch("/api/admin/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run_reminders_now" }),
    });
    const data = await res.json();
    if (data.logs) setLogs(data.logs);
    notify(
      `Varredura de lembretes executada (${
        data.result?.sentCount || 0
      } atendimento(s) do dia notificados).`
    );
  }

  if (!config) {
    return (
      <div className="py-12 text-center text-sm text-slate">
        Carregando módulo WhatsApp Bot...
      </div>
    );
  }

  const isConnected = config.status === "connected";
  const isQrReady = config.status === "qr_ready";

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
            Automação de Lembretes & Notificações (Estilo Bot Barbearia)
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
            WhatsApp Bot & Conexão QR Code
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            Conecte o WhatsApp da Dra. Fernanda para que os pacientes recebam
            confirmações e lembretes automáticos (2h antes) e ela receba alertas
            em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunSweepNow}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy hover:bg-navy-800 text-offwhite text-xs font-semibold"
          >
            <Play className="w-3.5 h-3.5 text-gold" />
            <span>Verificar Lembretes de Hoje Agora</span>
          </button>
        </div>
      </div>

      {isWhatsappDirect && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <MessageCircle className="w-4 h-4 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-amber-950">
              Plano Essencial Ativo (WhatsApp Direto)
            </p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              No momento, todos os procedimentos e agendamentos do site direcionam
              diretamente para o aplicativo do WhatsApp oficial da Dra. Fernanda, sem
              necessidade de manter o robô pareado ou ativo. Quando você solicitar o
              upgrade para o Plano Avançado, este módulo de robô automático será reativado
              pelo desenvolvedor responsável (Luan Nogueira).
            </p>
          </div>
        </div>
      )}

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* GRID PRINCIPAL: CONEXÃO QR CODE (5 COLUNAS) + TEMPLATES EDITÁVEIS (7 COLUNAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: PAREAMENTO QR CODE */}
        <div className="lg:col-span-5 bg-navy text-offwhite rounded-3xl p-6 sm:p-7 border border-gold/30 shadow-luxury space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 text-gold flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-semibold">
                  Status do Aparelho
                </h2>
                <p className="text-xs text-offwhite/75">
                  Sessão Multi-Dispositivo (Baileys / Web)
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                isConnected
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                  : isQrReady
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  : "bg-white/10 text-offwhite/70"
              }`}
            >
              {isConnected
                ? "Conectado"
                : isQrReady
                ? "QR Code Pronto"
                : "Desconectado"}
            </span>
          </div>

          {/* ESTADO 1: CONECTADO */}
          {isConnected && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-semibold text-white">
                  Bot do WhatsApp Conectado!
                </h3>
                <p className="text-xs text-emerald-200 mt-1">
                  {config.connected_name} ({config.connected_phone})
                </p>
                <p className="text-xs text-offwhite/80 mt-2 leading-relaxed">
                  O robô está ativo e enviando confirmações de agendamento e
                  lembretes de 2 horas de antecedência para os pacientes e para
                  a Dra. Fernanda.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold transition-colors"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Desconectar Aparelho</span>
              </button>
            </div>
          )}

          {/* ESTADO 2: QR CODE PRONTO PARA LEITURA */}
          {isQrReady && config.qr_code_data && (
            <div className="bg-white text-navy rounded-2xl p-5 text-center space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-terracotta">
                Escaneie o QR Code no WhatsApp da Dra. Fernanda:
              </p>

              <div className="inline-block p-3 rounded-2xl border-4 border-emerald-500 bg-white shadow-md">
                <img
                  src={config.qr_code_data}
                  alt="QR Code WhatsApp Bot"
                  className="w-56 h-56 mx-auto"
                />
              </div>

              <ol className="text-xs text-slate text-left space-y-1 bg-offwhite p-3.5 rounded-xl">
                <li>1. Abra o WhatsApp no celular da Dra. Fernanda</li>
                <li>
                  2. Toque em <strong>Dispositivos conectados</strong> &gt;{" "}
                  <strong>Conectar um dispositivo</strong>
                </li>
                <li>3. Aponte a câmera para o QR Code acima</li>
              </ol>

              <div className="pt-2 border-t border-offwhite-border space-y-2">
                <label className="block text-[11px] font-semibold text-navy">
                  Número do WhatsApp da Profissional para Pareamento:
                </label>
                <input
                  type="text"
                  value={pairingPhone}
                  onChange={(e) => setPairingPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-xs text-center font-mono text-navy"
                />
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateQr}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-offwhite hover:bg-offwhite-warm text-navy text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Atualizar QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPairing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Confirmar Leitura / Pareamento</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ESTADO 3: DESCONECTADO */}
          {!isConnected && !isQrReady && (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-4">
              <QrCode className="w-12 h-12 text-gold mx-auto opacity-85" />
              <div>
                <h3 className="font-serif text-xl font-semibold">
                  Gerar QR Code de Conexão
                </h3>
                <p className="text-xs text-offwhite/75 mt-1 leading-relaxed">
                  Clique abaixo para iniciar a sessão e exibir o QR Code na tela
                  para a Dra. Fernanda conectar o WhatsApp dela.
                </p>
              </div>
              <button
                type="button"
                disabled={loadingQr}
                onClick={handleGenerateQr}
                className="w-full py-3.5 px-5 rounded-2xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-semibold shadow-luxury flex items-center justify-center gap-2"
              >
                {loadingQr ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando QR Code...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Gerar QR Code do WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Disparo de Teste Rápido */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>Testar Envio de Lembrete Agora</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Nome para teste"
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-white/50"
              />
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5522999990001"
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-white/50"
              />
            </div>
            <button
              type="button"
              onClick={handleSendTestMessage}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-gold text-xs font-semibold transition-colors"
            >
              Simular Disparo de Mensagem de Lembrete
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: CONFIGURAÇÃO DE MENSAGENS AUTOMÁTICAS (CLIENTE & PROFISSIONAL) */}
        <form
          onSubmit={handleSaveTemplates}
          className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-7 border border-offwhite-border shadow-card space-y-5"
        >
          <div className="flex items-center justify-between border-b border-offwhite-border pb-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-navy">
                Modelos de Mensagens Automáticas
              </h2>
              <p className="text-xs text-slate">
                Variáveis disponíveis:{" "}
                <code className="text-terracotta font-semibold">
                  {"{clienteName}"}
                </code>
                ,{" "}
                <code className="text-terracotta font-semibold">
                  {"{procedimentoName}"}
                </code>
                ,{" "}
                <code className="text-terracotta font-semibold">
                  {"{unidadeName}"}
                </code>
                ,{" "}
                <code className="text-terracotta font-semibold">
                  {"{data}"}
                </code>
                ,{" "}
                <code className="text-terracotta font-semibold">
                  {"{horario}"}
                </code>
                ,{" "}
                <code className="text-terracotta font-semibold">
                  {"{codigo}"}
                </code>
                ,{" "}
                <code className="text-terracotta font-semibold">
                  {"{status}"}
                </code>
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shrink-0 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Salvando..." : "Salvar Mensagens"}</span>
            </button>
          </div>

          {/* Switches de Automação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="p-3.5 rounded-2xl bg-offwhite border border-offwhite-border flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.auto_confirm_msg_enabled)}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    auto_confirm_msg_enabled: e.target.checked ? 1 : 0,
                  })
                }
                className="mt-0.5 w-4 h-4 accent-terracotta"
              />
              <span className="text-xs font-semibold text-navy">
                Enviar confirmação ao Cliente após agendar
              </span>
            </label>

            <label className="p-3.5 rounded-2xl bg-offwhite border border-offwhite-border flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.reminder_2h_enabled)}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    reminder_2h_enabled: e.target.checked ? 1 : 0,
                  })
                }
                className="mt-0.5 w-4 h-4 accent-terracotta"
              />
              <span className="text-xs font-semibold text-navy">
                Enviar lembrete automático 2h antes do atendimento
              </span>
            </label>

            <label className="p-3.5 rounded-2xl bg-offwhite border border-offwhite-border flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.notify_professional_enabled)}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    notify_professional_enabled: e.target.checked ? 1 : 0,
                  })
                }
                className="mt-0.5 w-4 h-4 accent-terracotta"
              />
              <span className="text-xs font-semibold text-navy">
                Avisar a Dra. Fernanda no WhatsApp dela
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              WhatsApp da Dra. Fernanda para receber alertas dos agendamentos
            </label>
            <input
              type="text"
              value={config.professional_phone}
              onChange={(e) =>
                setConfig({ ...config, professional_phone: e.target.value })
              }
              placeholder="5522999990001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              1. Mensagem de Confirmação / Solicitação para o Cliente
            </label>
            <textarea
              rows={4}
              value={config.template_client_booking}
              onChange={(e) =>
                setConfig({
                  ...config,
                  template_client_booking: e.target.value,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-xs sm:text-sm text-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              2. Mensagem de Lembrete Automático (2 horas antes) para o Cliente
            </label>
            <textarea
              rows={4}
              value={config.template_client_reminder}
              onChange={(e) =>
                setConfig({
                  ...config,
                  template_client_reminder: e.target.value,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-xs sm:text-sm text-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              3. Alerta enviado para o WhatsApp da Dra. Fernanda Caetano
            </label>
            <textarea
              rows={4}
              value={config.template_professional_alert}
              onChange={(e) =>
                setConfig({
                  ...config,
                  template_professional_alert: e.target.value,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-xs sm:text-sm text-navy"
            />
          </div>
        </form>
      </div>

      {/* HISTÓRICO DE DISPAROS DO BOT */}
      <div className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-terracotta" />
            <h2 className="font-serif text-2xl font-semibold text-navy">
              Registro de Mensagens e Lembretes Processados pelo Bot
            </h2>
          </div>
          <span className="text-xs text-slate">
            Últimos {logs.length} disparos
          </span>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-slate py-6 text-center">
            Nenhuma mensagem disparada ainda. Faça um agendamento ou clique em
            &quot;Simular Disparo&quot; para testar.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-offwhite border border-offwhite-border space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <strong className="text-xs text-navy">
                      Para: {log.recipient_name} ({log.recipient_phone})
                    </strong>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-navy text-gold">
                    {log.recipient_type === "professional"
                      ? "Dra. Fernanda"
                      : "Paciente"}
                  </span>
                </div>
                <pre className="text-xs text-navy/85 whitespace-pre-wrap font-sans bg-white p-3 rounded-xl border border-offwhite-border">
                  {log.message_content}
                </pre>
                <div className="flex items-center justify-between text-[11px] text-slate">
                  <span>Evento: {log.message_type}</span>
                  <span>
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

