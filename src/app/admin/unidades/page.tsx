"use client";

import React, { useEffect, useState } from "react";
import { Unit } from "@/types/domain";
import { Building2, Check, MapPin, MessageCircle, Save } from "lucide-react";

export default function AdminUnidadesPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  async function loadUnits() {
    const res = await fetch("/api/admin/schedule");
    const data = await res.json();
    if (data.units) setUnits(data.units);
  }

  useEffect(() => {
    loadUnits();
  }, []);

  async function handleSaveUnit(unit: Unit) {
    await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_unit",
        ...unit,
      }),
    });
    setToast(`Dados da unidade "${unit.name}" salvos com sucesso!`);
    setTimeout(() => setToast(null), 3500);
    loadUnits();
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
          Consultórios & Home Care
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
          Unidades de Atendimento
        </h1>
        <p className="text-xs sm:text-sm text-slate mt-0.5">
          Configure o endereço oficial, link do Google Maps e WhatsApp de cada
          unidade.
        </p>
      </div>

      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      <div className="space-y-5">
        {units.map((unit, idx) => (
          <div
            key={unit.id}
            className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-offwhite-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-navy text-gold flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-navy">
                    {unit.name}
                  </h2>
                  <span className="text-xs text-slate">
                    Identificador: {unit.slug}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-navy cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(unit.is_active)}
                    onChange={(e) => {
                      const copy = [...units];
                      copy[idx] = {
                        ...unit,
                        is_active: e.target.checked ? 1 : 0,
                      };
                      setUnits(copy);
                    }}
                    className="w-4 h-4 accent-terracotta"
                  />
                  <span>Unidade Ativa</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleSaveUnit(unit)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Unidade</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-navy mb-1">
                  Nome de Exibição da Unidade
                </label>
                <input
                  type="text"
                  value={unit.name}
                  onChange={(e) => {
                    const copy = [...units];
                    copy[idx] = { ...unit, name: e.target.value };
                    setUnits(copy);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Nome Curto (Selo na Agenda)
                </label>
                <input
                  type="text"
                  value={unit.short_name}
                  onChange={(e) => {
                    const copy = [...units];
                    copy[idx] = { ...unit, short_name: e.target.value };
                    setUnits(copy);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Endereço / Sala / Referência
                </label>
                <input
                  type="text"
                  value={unit.address_line}
                  onChange={(e) => {
                    const copy = [...units];
                    copy[idx] = { ...unit, address_line: e.target.value };
                    setUnits(copy);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Bairro e Cidade
                </label>
                <input
                  type="text"
                  value={unit.neighborhood_city}
                  onChange={(e) => {
                    const copy = [...units];
                    copy[idx] = { ...unit, neighborhood_city: e.target.value };
                    setUnits(copy);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-terracotta" />
                  <span>WhatsApp da Unidade (DDI 55 + DDD + Número)</span>
                </label>
                <input
                  type="text"
                  value={unit.whatsapp_phone}
                  onChange={(e) => {
                    const copy = [...units];
                    copy[idx] = { ...unit, whatsapp_phone: e.target.value };
                    setUnits(copy);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-terracotta" />
                  <span>Link do Google Maps</span>
                </label>
                <input
                  type="text"
                  value={unit.maps_url || ""}
                  onChange={(e) => {
                    const copy = [...units];
                    copy[idx] = { ...unit, maps_url: e.target.value };
                    setUnits(copy);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Descrição da Unidade
              </label>
              <textarea
                rows={2}
                value={unit.description || ""}
                onChange={(e) => {
                  const copy = [...units];
                  copy[idx] = { ...unit, description: e.target.value };
                  setUnits(copy);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

