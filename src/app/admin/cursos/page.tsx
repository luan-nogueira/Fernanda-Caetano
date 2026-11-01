"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Course, CourseLesson, CourseStudent } from "@/types/domain";
import {
  GraduationCap,
  Video,
  Users,
  FolderOpen,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Send,
  Copy,
  Upload,
  ExternalLink,
  KeyRound,
  PlayCircle,
  FileText,
  Sparkles,
} from "lucide-react";

interface LocalVideoFile {
  name: string;
  sizeMB: string;
  updatedAt: string;
}

export default function AdminCursosPage() {
  const [activeTab, setActiveTab] = useState<"courses" | "students" | "folder">(
    "courses"
  );
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [localVideos, setLocalVideos] = useState<LocalVideoFile[]>([]);
  const [videosFolderPath, setVideosFolderPath] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form Curso
  const [courseForm, setCourseForm] = useState({
    id: "",
    title: "",
    subtitle: "",
    description: "",
    workload_hours: "20 horas • Certificado Incluso",
    price_display: "R$ 497,00",
    whatsapp_interest_message: "",
    is_active: true,
  });
  const [showCourseModal, setShowCourseModal] = useState(false);

  // Form Aula
  const [lessonForm, setLessonForm] = useState({
    id: "",
    course_id: "",
    module_title: "Módulo 1 — Fundamentos",
    title: "",
    description: "",
    video_source_type: "local_file" as "local_file" | "external_url",
    video_url: "",
    duration_label: "20 min",
    attachment_label: "",
    attachment_url: "",
    is_free_preview: false,
    display_order: 1,
  });
  const [showLessonModal, setShowLessonModal] = useState(false);

  // Form Aluno
  const [studentForm, setStudentForm] = useState({
    id: "",
    full_name: "",
    email: "",
    phone: "",
    password: "",
    expires_at: "",
    notes: "",
    is_active: true,
    enrolled_course_ids: [] as string[],
  });
  const [showStudentModal, setShowStudentModal] = useState(false);

  function showNotification(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cursos");
      const data = await res.json();
      if (data.courses) {
        setCourses(data.courses);
        if (!selectedCourseId && data.courses.length > 0) {
          setSelectedCourseId(data.courses[0].id);
        }
      }
      if (data.lessons) setLessons(data.lessons);
      if (data.students) setStudents(data.students);
      if (data.localVideoFiles) setLocalVideos(data.localVideoFiles);
      if (data.videosFolderPath) setVideosFolderPath(data.videosFolderPath);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_course",
        ...courseForm,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setShowCourseModal(false);
      if (data.id) setSelectedCourseId(data.id);
      showNotification("Curso salvo e sincronizado com sucesso!");
      loadData();
    }
  }

  async function handleDeleteCourse(id: string) {
    if (
      !window.confirm(
        "Deseja excluir este curso e todas as aulas vinculadas a ele?"
      )
    )
      return;
    await fetch("/api/admin/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_course", id }),
    });
    showNotification("Curso removido.");
    loadData();
  }

  async function handleSaveLesson(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_lesson",
        ...lessonForm,
      }),
    });
    if (res.ok) {
      setShowLessonModal(false);
      showNotification("Vídeo-aula salva com sucesso!");
      loadData();
    }
  }

  async function handleDeleteLesson(id: string) {
    if (!window.confirm("Deseja remover esta vídeo-aula?")) return;
    await fetch("/api/admin/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_lesson", id }),
    });
    showNotification("Aula removida.");
    loadData();
  }

  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_student",
        ...studentForm,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setShowStudentModal(false);
      showNotification(
        "Acesso do aluno liberado e salvo! Agora você pode enviar o login pelo WhatsApp."
      );
      loadData();
    } else {
      alert(data.error || "Erro ao salvar aluno.");
    }
  }

  async function handleToggleStudentActive(st: CourseStudent) {
    await fetch("/api/admin/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_student_active",
        id: st.id,
        is_active: !st.is_active,
      }),
    });
    showNotification(
      st.is_active ? "Acesso do aluno bloqueado." : "Acesso do aluno reativado!"
    );
    loadData();
  }

  async function handleDeleteStudent(id: string) {
    if (!window.confirm("Deseja excluir o cadastro deste aluno?")) return;
    await fetch("/api/admin/cursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_student", id }),
    });
    showNotification("Aluno removido.");
    loadData();
  }

  async function handleUploadVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/cursos/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.fileName) {
        showNotification(
          `Vídeo "${data.fileName}" (${data.sizeMB} MB) salvo na pasta cursos-videos!`
        );
        setLessonForm((prev) => ({
          ...prev,
          video_source_type: "local_file",
          video_url: data.fileName,
        }));
        loadData();
      } else {
        alert(data.error || "Falha ao enviar vídeo.");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function buildStudentAccessMessage(st: CourseStudent) {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://fernanda-caetano.vercel.app";
    const enrolledNames = courses
      .filter((c) => st.enrolled_course_ids?.includes(c.id))
      .map((c) => `• ${c.title}`)
      .join("\n");

    return `Olá *${st.full_name}*! ✨\n\nO seu acesso à *Área de Alunos — Dra. Fernanda Caetano* já está liberado!\n\n📚 *Cursos Liberados:*\n${
      enrolledNames || "• Acesso Geral"
    }\n\n🔐 *Seus Dados de Acesso Exclusivo:*\n• *Link de Acesso:* ${origin}/cursos/login\n• *E-mail:* ${
      st.email
    }\n• *Senha:* ${st.password_plain_hint || "Curso@2026"}\n\nBons estudos! Qualquer dúvida estou à disposição.`;
  }

  function handleSendCredentialsWhatsApp(st: CourseStudent) {
    const text = buildStudentAccessMessage(st);
    const cleanPhone = (st.phone || "").replace(/\D/g, "");
    const phoneWithCountry =
      cleanPhone && !cleanPhone.startsWith("55") && cleanPhone.length <= 11
        ? `55${cleanPhone}`
        : cleanPhone;
    const url = phoneWithCountry
      ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  function handleCopyCredentials(st: CourseStudent) {
    const text = buildStudentAccessMessage(st);
    navigator.clipboard.writeText(text);
    showNotification(
      "Dados de acesso copiados! Basta colar no WhatsApp ou e-mail do aluno."
    );
  }

  const currentCourse = courses.find((c) => c.id === selectedCourseId);
  const currentCourseLessons = lessons.filter(
    (l) => l.course_id === selectedCourseId
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-offwhite-border shadow-card">
        <div>
          <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-terracotta mb-1">
            Academy & Área de Membros Exclusiva
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy tracking-tight">
            Gestão de Cursos, Vídeos & Acesso de Alunos
          </h1>
          <p className="text-sm font-medium text-slate mt-1">
            Cadastre cursos, adicione vídeo-aulas da pasta do servidor ou links,
            crie login/senha para quem pagou e envie o acesso pelo WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/cursos"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-navy hover:bg-navy-800 text-white text-xs sm:text-sm font-bold shadow-sm"
          >
            <GraduationCap className="w-4 h-4 text-gold" />
            <span>Ver Portal de Cursos</span>
            <ExternalLink className="w-3.5 h-3.5 text-gold" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setStudentForm({
                id: "",
                full_name: "",
                email: "",
                phone: "",
                password: `DraFernanda@${Math.floor(1000 + Math.random() * 9000)}`,
                expires_at: "",
                notes: "",
                is_active: true,
                enrolled_course_ids: courses.map((c) => c.id),
              });
              setShowStudentModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-bold shadow-sm"
          >
            <KeyRound className="w-4 h-4" />
            <span>Liberar Novo Aluno (E-mail e Senha)</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-sm font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Abas */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-offwhite-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("courses")}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "courses"
              ? "bg-navy text-white shadow-sm"
              : "bg-white text-navy hover:bg-offwhite-warm border border-offwhite-border"
          }`}
        >
          <Video className="w-4 h-4 text-gold" />
          <span>1. Cursos & Vídeo-Aulas ({courses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "students"
              ? "bg-navy text-white shadow-sm"
              : "bg-white text-navy hover:bg-offwhite-warm border border-offwhite-border"
          }`}
        >
          <Users className="w-4 h-4 text-terracotta" />
          <span>2. Alunos & Liberação de Acesso ({students.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("folder")}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "folder"
              ? "bg-navy text-white shadow-sm"
              : "bg-white text-navy hover:bg-offwhite-warm border border-offwhite-border"
          }`}
        >
          <FolderOpen className="w-4 h-4 text-gold" />
          <span>3. Pasta de Vídeos no Servidor ({localVideos.length})</span>
        </button>
      </div>

      {/* ABA 1: CURSOS E AULAS */}
      {activeTab === "courses" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de Cursos */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-navy">
                Cursos Cadastrados
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCourseForm({
                    id: "",
                    title: "",
                    subtitle: "",
                    description: "",
                    workload_hours: "20 horas • Certificado Incluso",
                    price_display: "R$ 497,00",
                    whatsapp_interest_message: "",
                    is_active: true,
                  });
                  setShowCourseModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Curso</span>
              </button>
            </div>

            {loading ? (
              <p className="text-sm font-semibold text-navy">
                Carregando cursos...
              </p>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => {
                  const isSelected = course.id === selectedCourseId;
                  const count = lessons.filter(
                    (l) => l.course_id === course.id
                  ).length;

                  return (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`cursor-pointer rounded-2xl p-5 border-2 transition-all ${
                        isSelected
                          ? "bg-navy text-white border-gold shadow-luxury"
                          : "bg-white text-navy border-offwhite-border hover:border-navy/40 shadow-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-2 ${
                              course.is_active
                                ? isSelected
                                  ? "bg-emerald-500/25 text-emerald-200"
                                  : "bg-emerald-100 text-emerald-900"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {course.is_active ? "Curso Ativo" : "Oculto"} •{" "}
                            {count} aulas
                          </span>
                          <h3 className="font-serif text-xl font-bold leading-snug">
                            {course.title}
                          </h3>
                          <p
                            className={`text-xs font-medium mt-1 ${
                              isSelected ? "text-white/85" : "text-slate"
                            }`}
                          >
                            {course.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-current/10 text-xs font-bold">
                        <span>
                          {course.workload_hours} • {course.price_display}
                        </span>
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setCourseForm({
                                id: course.id,
                                title: course.title,
                                subtitle: course.subtitle,
                                description: course.description,
                                workload_hours: course.workload_hours,
                                price_display: course.price_display,
                                whatsapp_interest_message:
                                  course.whatsapp_interest_message,
                                is_active: Boolean(course.is_active),
                              });
                              setShowCourseModal(true);
                            }}
                            className={`p-1.5 rounded-lg ${
                              isSelected
                                ? "bg-white/15 hover:bg-white/25 text-white"
                                : "bg-offwhite hover:bg-navy hover:text-white text-navy"
                            }`}
                            title="Editar Curso"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(course.id)}
                            className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-600 text-red-500 hover:text-white"
                            title="Excluir Curso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aulas do Curso Selecionado */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-5">
            {currentCourse ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-offwhite-border pb-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-terracotta">
                      Grade de Aulas & Vídeos
                    </span>
                    <h2 className="font-serif text-2xl font-bold text-navy">
                      {currentCourse.title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/cursos/${currentCourse.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-offwhite hover:bg-offwhite-warm text-navy border border-offwhite-border text-xs font-bold"
                    >
                      <PlayCircle className="w-4 h-4 text-terracotta" />
                      <span>Ver Sala de Aula</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setLessonForm({
                          id: "",
                          course_id: currentCourse.id,
                          module_title:
                            "Módulo 1 — Avaliação Clínica e Prática",
                          title: "",
                          description: "",
                          video_source_type: "local_file",
                          video_url: localVideos[0]?.name || "",
                          duration_label: "20 min",
                          attachment_label: "",
                          attachment_url: "",
                          is_free_preview: false,
                          display_order: currentCourseLessons.length + 1,
                        });
                        setShowLessonModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-bold shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Vídeo-Aula</span>
                    </button>
                  </div>
                </div>

                {currentCourseLessons.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-offwhite text-center space-y-2">
                    <p className="text-base font-bold text-navy">
                      Nenhuma aula cadastrada neste curso ainda.
                    </p>
                    <p className="text-xs font-medium text-slate">
                      Clique em &ldquo;Adicionar Vídeo-Aula&rdquo; para vincular
                      um vídeo da pasta do servidor ou do YouTube/Vimeo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentCourseLessons.map((lesson, idx) => (
                      <div
                        key={lesson.id}
                        className="rounded-2xl p-4 bg-offwhite/60 border border-offwhite-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-navy/30 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-navy text-white">
                              Aula {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-terracotta">
                              {lesson.module_title}
                            </span>
                            {Boolean(lesson.is_free_preview) && (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                Aula Gratuita (Degustação)
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-navy text-base">
                            {lesson.title}
                          </h4>
                          <p className="text-xs font-medium text-slate">
                            {lesson.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-bold text-navy">
                            <span className="inline-flex items-center gap-1">
                              <Video className="w-3.5 h-3.5 text-terracotta" />
                              {lesson.video_source_type === "local_file"
                                ? `Arquivo Servidor: ${
                                    lesson.video_url || "(nenhum)"
                                  }`
                                : `Link Externo: ${lesson.video_url}`}
                            </span>
                            <span>• ⏱ {lesson.duration_label}</span>
                            {lesson.attachment_label && (
                              <span className="inline-flex items-center gap-1 text-emerald-800">
                                <FileText className="w-3.5 h-3.5" />
                                {lesson.attachment_label}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setLessonForm({
                                id: lesson.id,
                                course_id: lesson.course_id,
                                module_title: lesson.module_title,
                                title: lesson.title,
                                description: lesson.description,
                                video_source_type: lesson.video_source_type,
                                video_url: lesson.video_url,
                                duration_label: lesson.duration_label,
                                attachment_label: lesson.attachment_label,
                                attachment_url: lesson.attachment_url,
                                is_free_preview: Boolean(
                                  lesson.is_free_preview
                                ),
                                display_order: lesson.display_order,
                              });
                              setShowLessonModal(true);
                            }}
                            className="px-3 py-2 rounded-xl bg-white hover:bg-navy hover:text-white text-navy border border-offwhite-border text-xs font-bold transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm font-semibold text-navy">
                Selecione um curso ao lado para gerenciar suas aulas.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: ALUNOS & LIBERAÇÃO DE ACESSO */}
      {activeTab === "students" && (
        <div className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-offwhite-border pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-navy">
                Alunos Cadastrados & Liberação de Senhas
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate">
                Crie o login (e-mail e senha) para quem realizou o pagamento e
                clique em &ldquo;Enviar no WhatsApp&rdquo; para mandar os dados
                de acesso na hora.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStudentForm({
                  id: "",
                  full_name: "",
                  email: "",
                  phone: "",
                  password: `DraFernanda@${Math.floor(
                    1000 + Math.random() * 9000
                  )}`,
                  expires_at: "",
                  notes: "",
                  is_active: true,
                  enrolled_course_ids: courses.map((c) => c.id),
                });
                setShowStudentModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Aluno</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-offwhite-border text-xs font-bold uppercase tracking-wider text-navy bg-offwhite/70">
                  <th className="py-3.5 px-4 rounded-tl-xl">Aluno(a)</th>
                  <th className="py-3.5 px-4">Login (E-mail & Senha)</th>
                  <th className="py-3.5 px-4">Cursos Liberados</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right rounded-tr-xl">
                    Enviar Acesso / Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-offwhite-border">
                {students.map((st) => {
                  const unlockedCourses = courses.filter((c) =>
                    st.enrolled_course_ids?.includes(c.id)
                  );
                  return (
                    <tr key={st.id} className="hover:bg-offwhite/50">
                      <td className="py-4 px-4">
                        <p className="font-bold text-navy text-sm">
                          {st.full_name}
                        </p>
                        <p className="text-xs font-semibold text-slate">
                          WhatsApp: {st.phone || "Não informado"}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-navy">
                          E-mail:{" "}
                          <span className="font-mono text-terracotta">
                            {st.email}
                          </span>
                        </p>
                        <p className="text-xs font-bold text-slate mt-0.5">
                          Senha:{" "}
                          <span className="font-mono bg-offwhite px-2 py-0.5 rounded border border-offwhite-border text-navy">
                            {st.password_plain_hint || "Curso@2026"}
                          </span>
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {unlockedCourses.length === 0 ? (
                            <span className="text-xs font-semibold text-red-700">
                              Nenhum curso marcado
                            </span>
                          ) : (
                            unlockedCourses.map((c) => (
                              <span
                                key={c.id}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-navy/10 text-navy"
                              >
                                {c.title}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {st.is_active ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Liberado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-900 border border-red-300 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5 text-red-700" />
                            Bloqueado
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSendCredentialsWhatsApp(st)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                          title="Enviar E-mail e Senha no WhatsApp do Aluno"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar no WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(st)}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-offwhite hover:bg-navy hover:text-white text-navy border border-offwhite-border text-xs font-bold"
                          title="Copiar Texto com Login e Senha"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentForm({
                              id: st.id,
                              full_name: st.full_name,
                              email: st.email,
                              phone: st.phone,
                              password: st.password_plain_hint || "",
                              expires_at: st.expires_at || "",
                              notes: st.notes || "",
                              is_active: Boolean(st.is_active),
                              enrolled_course_ids:
                                st.enrolled_course_ids || [],
                            });
                            setShowStudentModal(true);
                          }}
                          className="px-2.5 py-2 rounded-xl bg-offwhite hover:bg-navy hover:text-white text-navy border border-offwhite-border text-xs font-bold"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStudentActive(st)}
                          className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold"
                        >
                          {st.is_active ? "Bloquear" : "Ativar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(st.id)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: PASTA DE VÍDEOS NO SERVIDOR */}
      {activeTab === "folder" && (
        <div className="bg-white rounded-3xl p-6 border border-offwhite-border shadow-card space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-offwhite-border pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-navy">
                Pasta de Vídeos no Servidor (`cursos-videos`)
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate mt-0.5">
                Você pode colocar os arquivos `.mp4` diretamente na pasta do
                computador/servidor ou enviar pelo botão ao lado.
              </p>
              <p className="text-xs font-mono font-bold text-navy bg-offwhite px-3 py-1.5 rounded-lg border border-offwhite-border mt-2 inline-block">
                📁 Caminho no Servidor:{" "}
                {videosFolderPath || "cursos-videos/"}
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs sm:text-sm font-bold shadow-sm">
              <Upload className="w-4 h-4" />
              <span>
                {uploading
                  ? "Enviando vídeo..."
                  : "Enviar Vídeo (.mp4) pelo Navegador"}
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleUploadVideoFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {localVideos.length === 0 ? (
            <div className="p-8 rounded-2xl bg-offwhite border border-offwhite-border text-center space-y-2">
              <FolderOpen className="w-10 h-10 text-terracotta mx-auto" />
              <p className="text-base font-bold text-navy">
                Nenhum arquivo `.mp4` na pasta `cursos-videos` ainda.
              </p>
              <p className="text-xs sm:text-sm font-medium text-slate max-w-xl mx-auto">
                Copie seus vídeos `.mp4` para dentro da pasta{" "}
                <strong>cursos-videos</strong> do projeto ou clique no botão{" "}
                <strong>&ldquo;Enviar Vídeo (.mp4) pelo Navegador&rdquo;</strong>{" "}
                acima!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localVideos.map((v) => (
                <div
                  key={v.name}
                  className="p-4 rounded-2xl bg-offwhite/70 border border-offwhite-border flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-navy text-gold flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-navy text-sm truncate">
                        {v.name}
                      </p>
                      <p className="text-xs font-semibold text-slate">
                        Tamanho: {v.sizeMB} MB
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL CRIAR/EDITAR CURSO */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCourse}
            className="bg-white rounded-3xl max-w-xl w-full p-6 border border-offwhite-border shadow-luxury space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-serif text-2xl font-bold text-navy">
              {courseForm.id ? "Editar Curso" : "Novo Curso da Dra. Fernanda"}
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase text-navy mb-1">
                Título do Curso *
              </label>
              <input
                type="text"
                required
                value={courseForm.title}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, title: e.target.value })
                }
                placeholder="Ex.: Manejo Avançado de Feridas & Laserterapia"
                className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-navy mb-1">
                Subtítulo Resumido
              </label>
              <input
                type="text"
                value={courseForm.subtitle}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, subtitle: e.target.value })
                }
                placeholder="Ex.: Formação prática e teórica com certificado"
                className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-medium text-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-navy mb-1">
                Descrição Completa do Curso
              </label>
              <textarea
                rows={3}
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, description: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-medium text-navy"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-navy mb-1">
                  Carga Horária / Selo
                </label>
                <input
                  type="text"
                  value={courseForm.workload_hours}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      workload_hours: e.target.value,
                    })
                  }
                  placeholder="Ex.: 20 horas • Certificado Incluso"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-navy mb-1">
                  Valor de Exibição
                </label>
                <input
                  type="text"
                  value={courseForm.price_display}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      price_display: e.target.value,
                    })
                  }
                  placeholder="Ex.: R$ 497,00 ou Sob consulta"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-navy pt-1">
              <input
                type="checkbox"
                checked={courseForm.is_active}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, is_active: e.target.checked })
                }
                className="w-4 h-4 accent-terracotta"
              />
              <span>Exibir este curso na página pública de Cursos</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-offwhite-border">
              <button
                type="button"
                onClick={() => setShowCourseModal(false)}
                className="px-4 py-2.5 rounded-xl bg-offwhite text-navy text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-bold"
              >
                Salvar Curso
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CRIAR/EDITAR VÍDEO-AULA */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLesson}
            className="bg-white rounded-3xl max-w-xl w-full p-6 border border-offwhite-border shadow-luxury space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-serif text-2xl font-bold text-navy">
              {lessonForm.id ? "Editar Vídeo-Aula" : "Nova Vídeo-Aula"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase text-navy mb-1">
                  Nome do Módulo *
                </label>
                <input
                  type="text"
                  required
                  value={lessonForm.module_title}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      module_title: e.target.value,
                    })
                  }
                  placeholder="Ex.: Módulo 1 — Fundamentos"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-navy mb-1">
                  Duração
                </label>
                <input
                  type="text"
                  value={lessonForm.duration_label}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      duration_label: e.target.value,
                    })
                  }
                  placeholder="Ex.: 25 min"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-navy mb-1">
                Título da Aula *
              </label>
              <input
                type="text"
                required
                value={lessonForm.title}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, title: e.target.value })
                }
                placeholder="Ex.: Aula 01: Avaliação Clínica de Feridas"
                className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-navy mb-1">
                Resumo / Anotações da Aula
              </label>
              <textarea
                rows={2}
                value={lessonForm.description}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, description: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-medium text-navy"
              />
            </div>

            {/* Escolha da origem do vídeo */}
            <div className="p-4 rounded-2xl bg-offwhite border border-offwhite-border space-y-3">
              <label className="block text-xs font-extrabold uppercase text-navy">
                Onde está o vídeo desta aula?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setLessonForm({
                      ...lessonForm,
                      video_source_type: "local_file",
                    })
                  }
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border ${
                    lessonForm.video_source_type === "local_file"
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-navy border-offwhite-border"
                  }`}
                >
                  📁 Pasta do Servidor (`cursos-videos`)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLessonForm({
                      ...lessonForm,
                      video_source_type: "external_url",
                    })
                  }
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border ${
                    lessonForm.video_source_type === "external_url"
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-navy border-offwhite-border"
                  }`}
                >
                  🌐 Link Externo (YouTube / Vimeo / MP4)
                </button>
              </div>

              {lessonForm.video_source_type === "local_file" ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-navy">
                    Selecione o arquivo da pasta `cursos-videos` ou digite o nome:
                  </label>
                  {localVideos.length > 0 && (
                    <select
                      value={lessonForm.video_url}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          video_url: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy bg-white"
                    >
                      <option value="">-- Escolha um vídeo da pasta --</option>
                      {localVideos.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.sizeMB} MB)
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={lessonForm.video_url}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          video_url: e.target.value,
                        })
                      }
                      placeholder="Ex.: aula-01-laserterapia.mp4"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-offwhite-border text-sm font-semibold text-navy bg-white"
                    />
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-terracotta text-white text-xs font-bold shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploading ? "Enviando..." : "Subir .MP4"}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleUploadVideoFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">
                    URL do Vídeo (YouTube Não Listado, Vimeo ou Link Direto .mp4)
                  </label>
                  <input
                    type="text"
                    value={lessonForm.video_url}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        video_url: e.target.value,
                      })
                    }
                    placeholder="Ex.: https://www.youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy bg-white"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-navy mb-1">
                  Nome da Apostila / Material (Opcional)
                </label>
                <input
                  type="text"
                  value={lessonForm.attachment_label}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      attachment_label: e.target.value,
                    })
                  }
                  placeholder="Ex.: Apostila PDF - Aula 01"
                  className="w-full px-3.5 py-2 rounded-xl border border-offwhite-border text-sm font-medium text-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-navy mb-1">
                  Link do Material / PDF (Opcional)
                </label>
                <input
                  type="text"
                  value={lessonForm.attachment_url}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      attachment_url: e.target.value,
                    })
                  }
                  placeholder="Ex.: https://drive.google.com/..."
                  className="w-full px-3.5 py-2 rounded-xl border border-offwhite-border text-sm font-medium text-navy"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-navy">
              <input
                type="checkbox"
                checked={lessonForm.is_free_preview}
                onChange={(e) =>
                  setLessonForm({
                    ...lessonForm,
                    is_free_preview: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-terracotta"
              />
              <span>
                Liberar esta aula como degustação gratuita para visitantes
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-offwhite-border">
              <button
                type="button"
                onClick={() => setShowLessonModal(false)}
                className="px-4 py-2.5 rounded-xl bg-offwhite text-navy text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-bold"
              >
                Salvar Vídeo-Aula
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CADASTRAR/EDITAR ALUNO */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStudent}
            className="bg-white rounded-3xl max-w-xl w-full p-6 border border-offwhite-border shadow-luxury space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-terracotta/15 text-terracotta flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-navy">
                  {studentForm.id
                    ? "Editar Acesso do Aluno"
                    : "Liberar Acesso para Novo Aluno"}
                </h3>
                <p className="text-xs font-medium text-slate">
                  Crie o e-mail e a senha que você enviará para o cliente assistir
                  às aulas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-navy mb-1">
                  Nome Completo do Aluno *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.full_name}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      full_name: e.target.value,
                    })
                  }
                  placeholder="Ex.: Juliana Ribeiro"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-navy mb-1">
                  WhatsApp (com DDD) *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.phone}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, phone: e.target.value })
                  }
                  placeholder="Ex.: 22999998888"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-semibold text-navy"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-offwhite border border-offwhite-border">
              <div>
                <label className="block text-xs font-extrabold uppercase text-navy mb-1">
                  E-mail de Login *
                </label>
                <input
                  type="email"
                  required
                  value={studentForm.email}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, email: e.target.value })
                  }
                  placeholder="emaildoaluno@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-bold text-navy bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-navy mb-1">
                  Senha de Acesso *
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={studentForm.password}
                    onChange={(e) =>
                      setStudentForm({
                        ...studentForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="Ex.: Curso@2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-offwhite-border text-sm font-mono font-bold text-terracotta bg-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setStudentForm({
                        ...studentForm,
                        password: `DraFernanda@${Math.floor(
                          1000 + Math.random() * 9000
                        )}`,
                      })
                    }
                    className="px-3 py-2 rounded-xl bg-navy text-white text-xs font-bold shrink-0"
                    title="Gerar nova senha"
                  >
                    Gerar
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-navy mb-2">
                Quais cursos este aluno pagou e terá acesso?
              </label>
              <div className="space-y-2">
                {courses.map((course) => {
                  const checked = studentForm.enrolled_course_ids.includes(
                    course.id
                  );
                  return (
                    <label
                      key={course.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        checked
                          ? "bg-emerald-50 border-emerald-400 text-navy"
                          : "bg-white border-offwhite-border text-slate"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...studentForm.enrolled_course_ids, course.id]
                            : studentForm.enrolled_course_ids.filter(
                                (id) => id !== course.id
                              );
                          setStudentForm({
                            ...studentForm,
                            enrolled_course_ids: next,
                          });
                        }}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span className="text-xs sm:text-sm font-bold">
                        {course.title} ({course.price_display})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-offwhite-border">
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="px-4 py-2.5 rounded-xl bg-offwhite text-navy text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-bold shadow-sm"
              >
                Salvar e Liberar Acesso
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
