"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Course, CourseLesson } from "@/types/domain";
import {
  ArrowLeft,
  PlayCircle,
  Lock,
  CheckCircle2,
  FileText,
  KeyRound,
  MessageCircle,
  Video,
  GraduationCap,
} from "lucide-react";

function getEmbedUrl(url: string): { isIframe: boolean; src: string } {
  if (!url) return { isIframe: false, src: "" };
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      isIframe: true,
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
    };
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      isIframe: true,
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }
  return { isIframe: false, src: url };
}

export default function CourseClassroomPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [mediaServerUrl, setMediaServerUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [videoMissingError, setVideoMissingError] = useState(false);

  async function loadCourseRoom() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/cursos/catalog?slug=${encodeURIComponent(slug)}`
      );
      const data = await res.json();
      if (data.course) setCourse(data.course);
      if (data.lessons) {
        setLessons(data.lessons);
        if (data.lessons.length > 0) {
          setActiveLesson(data.lessons[0]);
        }
      }
      if (data.mediaServerUrl) setMediaServerUrl(data.mediaServerUrl);
      setHasFullAccess(Boolean(data.hasFullAccess));
      if (data.completedLessonIds) setCompletedIds(data.completedLessonIds);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (slug) loadCourseRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleToggleComplete(lessonId: string) {
    const res = await fetch("/api/cursos/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_progress", lessonId }),
    });
    const data = await res.json();
    if (res.ok && data.completedLessonIds) {
      setCompletedIds(data.completedLessonIds);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center text-navy font-bold">
        Carregando sala de aula...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-offwhite flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="font-serif text-3xl font-bold text-navy">
          Curso não encontrado.
        </p>
        <Link
          href="/cursos"
          className="px-5 py-2.5 rounded-xl bg-navy text-white text-xs font-bold"
        >
          Voltar aos Cursos
        </Link>
      </div>
    );
  }

  const canWatchCurrentLesson =
    hasFullAccess || Boolean(activeLesson?.is_free_preview);

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const videoSource =
    activeLesson?.video_source_type === "local_file"
      ? {
          isIframe: false,
          src: activeLesson.video_url
            ? !isLocalhost && mediaServerUrl
              ? `${mediaServerUrl}/videos/stream/${encodeURIComponent(
                  activeLesson.video_url
                )}`
              : `/api/cursos/video/${encodeURIComponent(
                  activeLesson.video_url
                )}?preview=${activeLesson.is_free_preview ? "1" : "0"}`
            : "",
        }
      : getEmbedUrl(activeLesson?.video_url || "");

  return (
    <div className="min-h-screen bg-offwhite flex flex-col">
      {/* Topbar da Sala de Aula */}
      <header className="bg-navy text-white border-b border-gold/30 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/cursos"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gold"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold block">
                Sala de Aula • Dra. Fernanda Caetano
              </span>
              <h1 className="font-serif text-lg sm:text-2xl font-bold text-white leading-tight">
                {course.title}
              </h1>
            </div>
          </div>

          {!hasFullAccess && (
            <Link
              href="/cursos/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-bold"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Entrar com Senha de Aluno</span>
            </Link>
          )}
        </div>
      </header>

      {/* Corpo: Player + Lista de Aulas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Player de Vídeo */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-navy rounded-3xl overflow-hidden border-2 border-gold/30 shadow-luxury aspect-video relative flex items-center justify-center">
            {!activeLesson ? (
              <p className="text-white font-bold text-sm">
                Selecione uma aula ao lado para iniciar.
              </p>
            ) : !canWatchCurrentLesson ? (
              <div className="p-8 text-center max-w-md space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 text-gold flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white">
                  Aula Exclusiva para Alunos Matriculados
                </h3>
                <p className="text-xs sm:text-sm font-medium text-white/85">
                  Se você já adquiriu este curso com a Dra. Fernanda Caetano,
                  entre com seu e-mail e senha para liberar todas as aulas.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link
                    href="/cursos/login"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-bold shadow-sm"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Entrar com E-mail e Senha</span>
                  </Link>
                  <a
                    href={`https://wa.me/5522999990001?text=${encodeURIComponent(
                      course.whatsapp_interest_message ||
                        `Olá Dra. Fernanda! Quero adquirir acesso ao curso ${course.title}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-gold/40 text-xs font-bold"
                  >
                    <MessageCircle className="w-4 h-4 text-gold" />
                    <span>Adquirir Acesso no WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : videoSource.isIframe ? (
              <iframe
                src={videoSource.src}
                title={activeLesson.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : videoSource.src && !videoMissingError ? (
              <video
                key={videoSource.src}
                src={videoSource.src}
                controls
                controlsList="nodownload"
                onError={() => setVideoMissingError(true)}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="p-8 text-center max-w-lg space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/10 text-gold flex items-center justify-center mx-auto">
                  <Video className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white">
                  {activeLesson.title}
                </h3>
                <p className="text-xs sm:text-sm font-medium text-white/85">
                  Player pronto! Para reproduzir o arquivo local{" "}
                  <strong className="text-gold">
                    {activeLesson.video_url || "desta aula"}
                  </strong>
                  , basta colocá-lo na pasta{" "}
                  <code className="bg-white/10 px-2 py-0.5 rounded text-gold-light">
                    cursos-videos/
                  </code>{" "}
                  do servidor ou enviar pelo painel em{" "}
                  <code className="bg-white/10 px-2 py-0.5 rounded text-gold-light">
                    /admin/cursos
                  </code>
                  .
                </p>
              </div>
            )}
          </div>

          {/* Detalhes da Aula Atual */}
          {activeLesson && (
            <div className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-terracotta">
                    {activeLesson.module_title} • ⏱{" "}
                    {activeLesson.duration_label}
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-navy mt-0.5">
                    {activeLesson.title}
                  </h2>
                </div>

                {hasFullAccess && (
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(activeLesson.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      completedIds.includes(activeLesson.id)
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-offwhite hover:bg-navy hover:text-white text-navy border border-offwhite-border"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {completedIds.includes(activeLesson.id)
                        ? "Aula Concluída ✓"
                        : "Marcar como Concluída"}
                    </span>
                  </button>
                )}
              </div>

              <p className="text-sm font-medium text-slate leading-relaxed">
                {activeLesson.description}
              </p>

              {canWatchCurrentLesson &&
                activeLesson.attachment_label &&
                activeLesson.attachment_url && (
                  <div className="pt-3 border-t border-offwhite-border">
                    <a
                      href={activeLesson.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy/5 hover:bg-navy hover:text-white text-navy border border-navy/20 text-xs font-bold transition-all"
                    >
                      <FileText className="w-4 h-4 text-terracotta" />
                      <span>Baixar {activeLesson.attachment_label}</span>
                    </a>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Lista Lateral de Módulos e Aulas */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-offwhite-border shadow-card flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between pb-4 border-b border-offwhite-border mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-terracotta" />
              <h3 className="font-serif text-xl font-bold text-navy">
                Conteúdo do Curso
              </h3>
            </div>
            <span className="text-xs font-bold text-slate">
              {lessons.length} aulas
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto pr-1">
            {lessons.map((lesson, index) => {
              const isCurrent = activeLesson?.id === lesson.id;
              const unlocked = hasFullAccess || Boolean(lesson.is_free_preview);
              const isDone = completedIds.includes(lesson.id);

              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    setVideoMissingError(false);
                    setActiveLesson(lesson);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    isCurrent
                      ? "bg-navy text-white border-gold shadow-sm"
                      : "bg-offwhite/60 hover:bg-offwhite text-navy border-offwhite-border"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : unlocked ? (
                      <PlayCircle
                        className={`w-4 h-4 ${
                          isCurrent ? "text-gold" : "text-terracotta"
                        }`}
                      />
                    ) : (
                      <Lock className="w-4 h-4 text-slate" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-[10px] font-extrabold uppercase block ${
                        isCurrent ? "text-gold-light" : "text-terracotta"
                      }`}
                    >
                      Aula {index + 1} • {lesson.duration_label}
                    </span>
                    <p className="text-xs sm:text-sm font-bold leading-snug mt-0.5">
                      {lesson.title}
                    </p>
                    {Boolean(lesson.is_free_preview) && !hasFullAccess && (
                      <span className="inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700">
                        Degustação Gratuita
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

