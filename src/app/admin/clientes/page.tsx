"use client";

import React, { useEffect, useState } from "react";
import { ClientRecord } from "@/types/domain";
import {
  Check,
  Edit3,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

export default function AdminClientesPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function loadClients(q = search) {
    const res = await fetch(
      `/api/admin/clients?search=${encodeURIComponent(q)}`
    );
    const data = await res.json();
    if (data.clients) setClients(data.clients);
  }

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setEditingClient(null);
    setFullName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setShowModal(true);
  }

  function openEdit(c: ClientRecord) {
    setEditingClient(c);
    setFullName(c.full_name);
    setPhone(c.whatsapp_phone);
    setEmail(c.email || "");
    setNotes(c.notes || "");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingClient?.id,
        full_name: fullName,
        whatsapp_phone: phone,
        email,
        notes,
      }),
    });
    setShowModal(false);
    setToast(
      editingClient ? "Dados do cliente atualizados!" : "Cliente cadastrado!"
    );
    setTimeout(() => setToast(null), 3500);
    loadClients();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
            Relacionamento & Histórico de Comparecimento
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
            Gerenciamento de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            Cadastro automático após agendamentos ou inclusão manual (Sem dados
            clínicos sensíveis — Conformidade LGPD).
          </p>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {/* Barra de Busca */}
      <div className="bg-white rounded-2xl p-4 border border-offwhite-border shadow-card flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              loadClients(e.target.value);
            }}
            placeholder="Buscar cliente por nome ou WhatsApp..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-offwhite-border bg-offwhite/40 text-sm text-navy"
          />
        </div>
        <span className="text-xs text-slate hidden sm:inline">
          {clients.length} registro(s)
        </span>
      </div>

      {/* Lista de Clientes (Cards no Mobile + Tabela no Desktop) */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-offwhite-border shadow-card">
        <div className="md:hidden space-y-3">
          {clients.map((c) => {
            const waDigits = (c.whatsapp_phone || "").replace(/\D/g, "");
            return (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-offwhite/60 border border-offwhite-border space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-navy text-sm">{c.full_name}</p>
                    <p className="font-mono text-xs text-slate mt-0.5">
                      {c.whatsapp_phone}
                    </p>
                    {c.email && (
                      <p className="text-xs text-slate break-all">{c.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-navy/5 text-navy font-semibold">
                    Total: {c.total_appointments || 0}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    Comparecimentos/Ativos: {c.completed_count || 0}
                  </span>
                  {(c.cancelled_count || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">
                      Cancelados: {c.cancelled_count}
                    </span>
                  )}
                </div>

                {c.notes && (
                  <p className="text-xs text-slate leading-relaxed bg-white p-2.5 rounded-xl border border-offwhite-border">
                    {c.notes}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-offwhite-border">
                  {waDigits && (
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-navy hover:text-white text-navy border border-offwhite-border text-xs font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-offwhite-border text-[11px] uppercase tracking-wider text-slate">
              <th className="py-3 px-3">Nome do Cliente</th>
              <th className="py-3 px-3">WhatsApp / E-mail</th>
              <th className="py-3 px-3">Histórico de Agendamentos</th>
              <th className="py-3 px-3">Observações Administrativas</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-offwhite-border">
            {clients.map((c) => {
              const waDigits = (c.whatsapp_phone || "").replace(/\D/g, "");
              return (
                <tr key={c.id} className="hover:bg-offwhite/50">
                  <td className="py-3.5 px-3 font-semibold text-navy">
                    {c.full_name}
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-mono text-xs text-navy">
                      {c.whatsapp_phone}
                    </p>
                    {c.email && (
                      <p className="text-[11px] text-slate">{c.email}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-navy/5 text-navy font-semibold">
                        Total: {c.total_appointments || 0}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        Comparecimentos/Ativos: {c.completed_count || 0}
                      </span>
                      {(c.cancelled_count || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-semibold">
                          Cancelados: {c.cancelled_count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate max-w-xs leading-relaxed">
                    {c.notes || "—"}
                  </td>
                  <td className="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
                    {waDigits && (
                      <a
                        href={`https://wa.me/${waDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-offwhite hover:bg-navy hover:text-white text-navy text-xs font-semibold transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal de Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-gold/40 shadow-luxury space-y-4">
            <div className="flex items-center justify-between border-b border-offwhite-border pb-3">
              <h3 className="font-serif text-2xl font-semibold text-navy">
                {editingClient ? "Editar Cliente" : "Novo Cliente"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-offwhite text-slate"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  WhatsApp com DDD *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Observações Administrativas (Não inserir prontuário clínico)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div className="p-3 rounded-xl bg-offwhite text-[11px] text-slate flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gold-dark shrink-0" />
                <span>
                  Este módulo armazena apenas informações de relacionamento e
                  agendamento, em conformidade com a LGPD.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-offwhite text-navy text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-terracotta text-white text-xs font-semibold"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

