"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Course } from "@/types/domain";
import {
  GraduationCap,
  PlayCircle,
  Lock,
  CheckCircle2,
  Clock,
  ArrowLeft,
  LogOut,
  MessageCircle,
  KeyRound,
  Video,
  Edit3,
} from "lucide-react";

export default function CursosCatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [pageHeader, setPageHeader] = useState({
    title: "Cursos, Capacitações & Área de Alunos",
    subtitle:
      "Formações técnicas e práticas em Enfermagem Dermatológica, Manejo Avançado de Feridas, Laserterapia e Estética Avançada.",
  });
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [student, setStudent] = useState<{
    id: string;
    fullName: string;
    email: string;
  } | null>(null);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("/images/fernanda-portrait.svg");

  async function loadCatalog() {
    setLoading(true);
    try {
      const res = await fetch("/api/cursos/catalog");
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
      if (data.pageHeader) setPageHeader(data.pageHeader);
      if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
      if (data.enrolledCourseIds) setEnrolledIds(data.enrolledCourseIds);
      if (data.student) setStudent(data.student);
      if (data.isAdminPreview) setIsAdminPreview(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  async function handleStudentLogout() {
    await fetch("/api/cursos/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setStudent(null);
    setEnrolledIds([]);
    loadCatalog();
  }

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      {/* Cabeçalho */}
      <header className="bg-navy text-white border-b border-gold/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gold hover:text-gold-light"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para a Página Principal</span>
            </Link>

            {student || isAdminPreview ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-gold/40 text-xs font-medium text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {student
                      ? `Aluno(a): ${student.fullName}`
                      : "Visualização da Dra. Fernanda (Admin)"}
                  </span>
                </span>
                {isAdminPreview && (
                  <Link
                    href="/admin/cursos"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-medium shadow-sm transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Valores e Cursos no Painel</span>
                  </Link>
                )}
                {student && (
                  <button
                    type="button"
                    onClick={handleStudentLogout}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                )}
              </div>
            ) : (
              <Link
                href="/cursos/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-medium shadow-sm transition-all"
              >
                <KeyRound className="w-4 h-4" />
                <span>Já sou Aluno — Entrar com E-mail e Senha</span>
              </Link>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <img
            src={avatarUrl}
            alt="Dra. Fernanda Caetano"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-gold object-cover shadow-luxury shrink-0"
          />
          <div className="max-w-3xl space-y-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/20 border border-gold/40 text-gold-light text-[11px] font-medium uppercase tracking-[0.2em]">
              <GraduationCap className="w-4 h-4" />
              <span>Academy • Dra. Fernanda Caetano</span>
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-white tracking-tight">
              {pageHeader.title}
            </h1>
            <p className="text-sm sm:text-base font-normal text-white/85">
              {pageHeader.subtitle}
            </p>
          </div>
          </div>
        </div>
      </header>

      {/* Lista de Cursos */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="py-16 text-center text-navy font-bold">
            Carregando cursos...
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-offwhite-border shadow-card">
            <p className="text-lg font-bold text-navy">
              Novas turmas e cursos em breve!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => {
              const isUnlocked =
                isAdminPreview || enrolledIds.includes(course.id);
              const waUrl = `https://wa.me/5522999990001?text=${encodeURIComponent(
                course.whatsapp_interest_message ||
                  `Olá Dra. Fernanda! Quero adquirir acesso ao curso: ${course.title}`
              )}`;

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-offwhite-border shadow-card flex flex-col justify-between space-y-6 hover:border-navy/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-navy text-gold-light">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{course.workload_hours}</span>
                      </span>

                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Acesso Liberado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold">
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Exclusivo para Alunos</span>
                        </span>
                      )}
                    </div>

                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy leading-snug">
                      {course.title}
                    </h2>
                    <p className="text-sm font-bold text-terracotta">
                      {course.subtitle}
                    </p>
                    <p className="text-sm font-medium text-slate leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-offwhite-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase text-slate block">
                          Investimento
                        </span>
                        <span className="font-sans text-2xl font-extrabold text-navy">
                          {course.price_display}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-navy bg-offwhite px-3 py-1.5 rounded-xl border border-offwhite-border">
                        <Video className="w-4 h-4 text-terracotta" />
                        <span>{course.lessons_count || 0} vídeo-aulas</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Link
                        href={`/cursos/${course.slug}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-navy hover:bg-navy-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
                      >
                        <PlayCircle className="w-4 h-4 text-gold" />
                        <span>
                          {isUnlocked
                            ? "Assistir Aulas Agora"
                            : "Ver Grade & Aula Grátis"}
                        </span>
                      </Link>

                      {!isUnlocked ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-medium shadow-sm transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Adquirir Acesso</span>
                        </a>
                      ) : (
                        isAdminPreview && (
                          <Link
                            href="/admin/cursos"
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-offwhite hover:bg-terracotta hover:text-white text-navy border border-offwhite-border text-xs sm:text-sm font-medium transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Editar Valor / Textos</span>
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

