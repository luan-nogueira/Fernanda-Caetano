"use client";

import React, { useEffect, useState } from "react";
import { Procedure, ProcedureCategory, Unit } from "@/types/domain";
import {
  Check,
  Clock,
  Edit3,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

export default function AdminProcedimentosPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [categories, setCategories] = useState<ProcedureCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingProc, setEditingProc] = useState<Procedure | null>(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("cat-feridas");
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");
  const [duration, setDuration] = useState(60);
  const [bufferAfter, setBufferAfter] = useState(15);
  const [priceBRL, setPriceBRL] = useState("");
  const [showPrice, setShowPrice] = useState(false);
  const [modality, setModality] = useState<"presencial" | "domiciliar">(
    "presencial"
  );
  const [prepInstructions, setPrepInstructions] = useState("");
  const [onlineBooking, setOnlineBooking] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isVisiblePublic, setIsVisiblePublic] = useState(true);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([
    "unit-farol",
    "unit-platinum",
  ]);

  // Nova Categoria
  const [newCatName, setNewCatName] = useState("");

  async function loadAll() {
    const [procRes, schedRes] = await Promise.all([
      fetch("/api/admin/procedures"),
      fetch("/api/admin/schedule"),
    ]);
    const procData = await procRes.json();
    const schedData = await schedRes.json();

    if (procData.procedures) setProcedures(procData.procedures);
    if (procData.categories) setCategories(procData.categories);
    if (schedData.units) setUnits(schedData.units);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function notify(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  }

  function openNewModal() {
    setEditingProc(null);
    setName("");
    setCategoryId(categories[0]?.id || "cat-feridas");
    setShortDesc("");
    setFullDesc("");
    setDuration(60);
    setBufferAfter(15);
    setPriceBRL("");
    setShowPrice(false);
    setModality("presencial");
    setPrepInstructions("");
    setOnlineBooking(true);
    setRequiresApproval(false);
    setIsVisiblePublic(true);
    setSelectedUnits(["unit-farol", "unit-platinum"]);
    setShowModal(true);
  }

  function openEditModal(p: Procedure) {
    setEditingProc(p);
    setName(p.name);
    setCategoryId(p.category_id);
    setShortDesc(p.short_description);
    setFullDesc(p.full_description);
    setDuration(p.duration_minutes);
    setBufferAfter(p.buffer_after_minutes);
    setPriceBRL(p.price_cents ? (p.price_cents / 100).toFixed(2) : "");
    setShowPrice(Boolean(p.show_price));
    setModality(p.modality);
    setPrepInstructions(p.preparation_instructions || "");
    setOnlineBooking(Boolean(p.online_booking_enabled));
    setRequiresApproval(Boolean(p.requires_approval));
    setIsVisiblePublic(Boolean(p.is_visible_public));
    setSelectedUnits(p.unit_ids || ["unit-farol", "unit-platinum"]);
    setShowModal(true);
  }

  async function handleSaveProcedure(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = priceBRL
      ? Math.round(parseFloat(priceBRL.replace(",", ".")) * 100)
      : null;

    const payload = {
      id: editingProc?.id,
      name,
      category_id: categoryId,
      short_description: shortDesc,
      full_description: fullDesc,
      duration_minutes: duration,
      buffer_after_minutes: bufferAfter,
      price_cents: priceCents,
      show_price: showPrice,
      modality,
      preparation_instructions: prepInstructions,
      online_booking_enabled: onlineBooking,
      requires_approval: requiresApproval,
      is_visible_public: isVisiblePublic,
      is_active: true,
      unit_ids: selectedUnits,
    };

    await fetch("/api/admin/procedures", {
      method: editingProc ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setShowModal(false);
    await loadAll();
    notify(
      editingProc
        ? "Procedimento atualizado!"
        : "Novo procedimento adicionado e publicado no catálogo!"
    );
  }

  async function handleDeleteProcedure(p: Procedure) {
    if (!window.confirm(`Deseja remover/arquivar "${p.name}"?`)) return;
    const res = await fetch(
      `/api/admin/procedures?id=${encodeURIComponent(p.id)}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    await loadAll();
    notify(data.message || "Procedimento removido.");
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await fetch("/api/admin/procedures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "category", name: newCatName }),
    });
    setNewCatName("");
    await loadAll();
    notify("Nova categoria criada!");
  }

  function toggleUnitSelection(unitId: string) {
    if (selectedUnits.includes(unitId)) {
      setSelectedUnits(selectedUnits.filter((id) => id !== unitId));
    } else {
      setSelectedUnits([...selectedUnits, unitId]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-terracotta">
            Catálogo de Serviços
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-navy">
            Gerenciamento de Procedimentos
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            Cadastre, edite durações, intervalos de segurança, unidades e
            orientações de preparo.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Procedimento</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Categorias Rápidas */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-offwhite-border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate mr-1">
            Categorias:
          </span>
          {categories.map((c) => (
            <span
              key={c.id}
              className="px-3 py-1 rounded-full bg-offwhite text-navy text-xs font-semibold border border-offwhite-border"
            >
              {c.name}
            </span>
          ))}
        </div>

        <form onSubmit={handleCreateCategory} className="flex items-center gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nova categoria..."
            className="px-3 py-1.5 rounded-xl border border-offwhite-border text-xs text-navy"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-navy text-white text-xs font-semibold"
          >
            + Categoria
          </button>
        </form>
      </div>

      {/* Lista de Procedimentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {procedures.map((proc) => (
          <div
            key={proc.id}
            className="bg-white rounded-2xl p-5 border border-offwhite-border shadow-card flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-navy/5 text-navy">
                  {proc.category_name || "Geral"}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate">
                  <Clock className="w-3.5 h-3.5 text-terracotta" />
                  {proc.duration_minutes} min (+{proc.buffer_after_minutes} min
                  intervalo)
                </span>
              </div>

              <h3 className="font-serif text-xl font-semibold text-navy">
                {proc.name}
              </h3>
              <p className="text-xs text-slate mt-1 leading-relaxed">
                {proc.short_description}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {proc.unit_ids?.map((uid) => {
                  const u = units.find((unit) => unit.id === uid);
                  return (
                    <span
                      key={uid}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-offwhite text-navy border border-offwhite-border"
                    >
                      {u?.short_name || uid}
                    </span>
                  );
                })}
                {Boolean(proc.requires_approval) && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    Requer Aprovação
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-offwhite-border flex items-center justify-between">
              <span className="text-xs text-slate">
                {Boolean(proc.is_visible_public)
                  ? "Visível no site"
                  : "Oculto no site"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(proc)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-offwhite hover:bg-navy hover:text-white text-navy text-xs font-semibold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProcedure(proc)}
                  className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600"
                  title="Remover ou Arquivar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Cadastro / Edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 border border-gold/40 shadow-luxury space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-offwhite-border pb-3">
              <h3 className="font-serif text-2xl font-semibold text-navy">
                {editingProc ? "Editar Procedimento" : "Novo Procedimento"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-offwhite text-slate hover:text-navy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProcedure} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Nome do Procedimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Laserterapia"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Categoria *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Descrição Resumida (Catálogo) *
                </label>
                <input
                  type="text"
                  required
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Descrição Completa
                </label>
                <textarea
                  rows={3}
                  value={fullDesc}
                  onChange={(e) => setFullDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Intervalo após (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={bufferAfter}
                    onChange={(e) => setBufferAfter(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Modalidade
                  </label>
                  <select
                    value={modality}
                    onChange={(e) =>
                      setModality(e.target.value as "presencial" | "domiciliar")
                    }
                    className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="domiciliar">Domiciliar (Home Care)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Valor R$ (Opcional)
                  </label>
                  <input
                    type="text"
                    value={priceBRL}
                    onChange={(e) => setPriceBRL(e.target.value)}
                    placeholder="Ex.: 250,00"
                    className="w-full px-3 py-2 rounded-xl border border-offwhite-border text-sm text-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Orientações de Preparo ao Paciente
                </label>
                <input
                  type="text"
                  value={prepInstructions}
                  onChange={(e) => setPrepInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm text-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Unidades onde o procedimento é realizado:
                </label>
                <div className="flex flex-wrap gap-2">
                  {units.map((u) => {
                    const checked = selectedUnits.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUnitSelection(u.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          checked
                            ? "bg-navy text-gold border-navy"
                            : "bg-offwhite text-slate border-offwhite-border"
                        }`}
                      >
                        {checked ? "✓ " : ""}
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-navy">
                  <input
                    type="checkbox"
                    checked={onlineBooking}
                    onChange={(e) => setOnlineBooking(e.target.checked)}
                    className="w-4 h-4 accent-terracotta"
                  />
                  <span>Habilitar agendamento online</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-navy">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="w-4 h-4 accent-terracotta"
                  />
                  <span>Exigir aprovação manual</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-navy">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="w-4 h-4 accent-terracotta"
                  />
                  <span>Exibir valor no site</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-offwhite-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-offwhite text-navy text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold"
                >
                  Salvar Procedimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

