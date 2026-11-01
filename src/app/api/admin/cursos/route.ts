import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireAdminSession } from "@/lib/auth";
import { getDb, hashPassword } from "@/lib/db";
import { pullAllTablesFromTurso, pushAllTablesToTurso } from "@/lib/turso-sync";
import { Course, CourseLesson, CourseStudent } from "@/types/domain";

const VIDEOS_DIR = path.join(process.cwd(), "cursos-videos");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function listLocalVideoFiles() {
  try {
    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }
    const files = fs.readdirSync(VIDEOS_DIR);
    return files
      .filter((f) => /\.(mp4|webm|mov|m4v)$/i.test(f))
      .map((f) => {
        const st = fs.statSync(path.join(VIDEOS_DIR, f));
        return {
          name: f,
          sizeMB: (st.size / (1024 * 1024)).toFixed(2),
          updatedAt: st.mtime.toISOString(),
        };
      });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    await requireAdminSession();
    await pullAllTablesFromTurso();
    const db = getDb();

    const courses = db
      .prepare("SELECT * FROM courses ORDER BY display_order ASC, created_at DESC")
      .all() as Course[];

    const lessons = db
      .prepare(
        "SELECT * FROM course_lessons ORDER BY course_id ASC, display_order ASC, created_at ASC"
      )
      .all() as CourseLesson[];

    const students = db
      .prepare("SELECT * FROM course_students ORDER BY created_at DESC")
      .all() as CourseStudent[];

    const enrollments = db
      .prepare("SELECT student_id, course_id FROM course_enrollments")
      .all() as Array<{ student_id: string; course_id: string }>;

    const studentsWithEnrollments = students.map((st) => ({
      ...st,
      enrolled_course_ids: enrollments
        .filter((e) => e.student_id === st.id)
        .map((e) => e.course_id),
    }));

    const headerRow = db
      .prepare("SELECT * FROM site_sections WHERE id = 'courses_page_header'")
      .get() as
      | { id: string; title: string; subtitle: string; is_visible: number }
      | undefined;

    const pageHeader = {
      badge: "Academy • Dra. Fernanda Caetano",
      title:
        headerRow?.title || "Cursos, Capacitações & Área de Alunos",
      subtitle:
        headerRow?.subtitle ||
        "Formações técnicas e práticas em Enfermagem Dermatológica, Manejo Avançado de Feridas, Laserterapia e Estética Avançada.",
    };

    return NextResponse.json({
      courses,
      lessons,
      students: studentsWithEnrollments,
      localVideoFiles: listLocalVideoFiles(),
      videosFolderPath: VIDEOS_DIR,
      pageHeader,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao carregar módulo de cursos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
    await pullAllTablesFromTurso(true);
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    // 0. Salvar Cabeçalho da Página de Cursos
    if (body.action === "save_page_header") {
      db.prepare(
        `INSERT INTO site_sections (id, title, subtitle, is_visible, display_order)
         VALUES ('courses_page_header', ?, ?, 0, 99)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           subtitle = excluded.subtitle`
      ).run(
        body.title || "Cursos, Capacitações & Área de Alunos",
        body.subtitle || ""
      );
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    // 1. Criar ou Atualizar Curso
    if (body.action === "save_course") {
      const id = body.id || `course-${crypto.randomUUID().slice(0, 8)}`;
      const slug =
        body.slug?.trim() ||
        `${slugify(body.title || "curso")}-${id.slice(-4)}`;

      const existing = db
        .prepare("SELECT id FROM courses WHERE id = ?")
        .get(id);

      if (existing) {
        db.prepare(
          `UPDATE courses
           SET title = ?,
               subtitle = ?,
               description = ?,
               workload_hours = ?,
               price_display = ?,
               whatsapp_interest_message = ?,
               is_active = ?,
               updated_at = ?
           WHERE id = ?`
        ).run(
          body.title,
          body.subtitle || "",
          body.description || "",
          body.workload_hours || "16 horas",
          body.price_display || "Sob consulta",
          body.whatsapp_interest_message || "",
          body.is_active === false ? 0 : 1,
          now,
          id
        );
      } else {
        const maxOrder =
          (
            db
              .prepare("SELECT MAX(display_order) as m FROM courses")
              .get() as { m: number | null }
          )?.m || 0;

        db.prepare(
          `INSERT INTO courses (
            id, slug, title, subtitle, description, cover_image_url,
            workload_hours, price_display, whatsapp_interest_message,
            is_active, display_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          slug,
          body.title,
          body.subtitle || "",
          body.description || "",
          body.cover_image_url || "/images/fernanda-portrait.svg",
          body.workload_hours || "16 horas",
          body.price_display || "Sob consulta",
          body.whatsapp_interest_message ||
            `Olá Dra. Fernanda! Tenho interesse no curso ${body.title}.`,
          body.is_active === false ? 0 : 1,
          maxOrder + 1,
          now,
          now
        );
      }

      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, id });
    }

    if (body.action === "delete_course" && body.id) {
      db.prepare("DELETE FROM course_lessons WHERE course_id = ?").run(body.id);
      db.prepare("DELETE FROM course_enrollments WHERE course_id = ?").run(
        body.id
      );
      db.prepare("DELETE FROM courses WHERE id = ?").run(body.id);
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    // 2. Criar ou Atualizar Vídeo-Aula
    if (body.action === "save_lesson") {
      const id = body.id || `lesson-${crypto.randomUUID().slice(0, 8)}`;
      const existing = db
        .prepare("SELECT id FROM course_lessons WHERE id = ?")
        .get(id);

      if (existing) {
        db.prepare(
          `UPDATE course_lessons
           SET course_id = ?,
               module_title = ?,
               title = ?,
               description = ?,
               video_source_type = ?,
               video_url = ?,
               duration_label = ?,
               attachment_url = ?,
               attachment_label = ?,
               is_free_preview = ?,
               display_order = ?
           WHERE id = ?`
        ).run(
          body.course_id,
          body.module_title || "Módulo 1",
          body.title,
          body.description || "",
          body.video_source_type || "local_file",
          body.video_url || "",
          body.duration_label || "20 min",
          body.attachment_url || "",
          body.attachment_label || "",
          body.is_free_preview ? 1 : 0,
          Number(body.display_order) || 1,
          id
        );
      } else {
        const maxOrder =
          (
            db
              .prepare(
                "SELECT MAX(display_order) as m FROM course_lessons WHERE course_id = ?"
              )
              .get(body.course_id) as { m: number | null }
          )?.m || 0;

        db.prepare(
          `INSERT INTO course_lessons (
            id, course_id, module_title, title, description,
            video_source_type, video_url, duration_label,
            attachment_url, attachment_label, is_free_preview, display_order, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          body.course_id,
          body.module_title || "Módulo 1",
          body.title,
          body.description || "",
          body.video_source_type || "local_file",
          body.video_url || "",
          body.duration_label || "20 min",
          body.attachment_url || "",
          body.attachment_label || "",
          body.is_free_preview ? 1 : 0,
          Number(body.display_order) || maxOrder + 1,
          now
        );
      }

      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, id });
    }

    if (body.action === "delete_lesson" && body.id) {
      db.prepare("DELETE FROM course_lessons WHERE id = ?").run(body.id);
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    // 3. Criar ou Atualizar Aluno (com E-mail, Senha e Cursos Liberados)
    if (body.action === "save_student") {
      const id = body.id || `student-${crypto.randomUUID().slice(0, 8)}`;
      const emailClean = (body.email || "").trim().toLowerCase();
      if (!emailClean || !body.full_name) {
        return NextResponse.json(
          { error: "Informe o nome completo e o e-mail do aluno." },
          { status: 400 }
        );
      }

      const existing = db
        .prepare("SELECT * FROM course_students WHERE id = ?")
        .get(id) as CourseStudent | undefined;

      const rawPassword = (body.password || "").trim();
      const passwordHash = rawPassword
        ? hashPassword(rawPassword)
        : existing?.password_hash || hashPassword("Curso@2026");
      const passwordHint = rawPassword
        ? rawPassword
        : existing?.password_plain_hint || "Curso@2026";

      if (existing) {
        db.prepare(
          `UPDATE course_students
           SET full_name = ?,
               email = ?,
               phone = ?,
               password_hash = ?,
               password_plain_hint = ?,
               is_active = ?,
               expires_at = ?,
               notes = ?,
               updated_at = ?
           WHERE id = ?`
        ).run(
          body.full_name.trim(),
          emailClean,
          (body.phone || "").replace(/\D/g, ""),
          passwordHash,
          passwordHint,
          body.is_active === false ? 0 : 1,
          body.expires_at || null,
          body.notes || "",
          now,
          id
        );
      } else {
        db.prepare(
          `INSERT INTO course_students (
            id, full_name, email, phone, password_hash, password_plain_hint,
            is_active, expires_at, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id,
          body.full_name.trim(),
          emailClean,
          (body.phone || "").replace(/\D/g, ""),
          passwordHash,
          passwordHint,
          body.is_active === false ? 0 : 1,
          body.expires_at || null,
          body.notes || "",
          now,
          now
        );
      }

      // Atualiza matrículas (cursos liberados para este aluno)
      if (Array.isArray(body.enrolled_course_ids)) {
        db.prepare("DELETE FROM course_enrollments WHERE student_id = ?").run(
          id
        );
        const insEnroll = db.prepare(
          `INSERT INTO course_enrollments (id, student_id, course_id, granted_at)
           VALUES (?, ?, ?, ?)`
        );
        for (const cId of body.enrolled_course_ids) {
          insEnroll.run(
            `enroll-${crypto.randomUUID().slice(0, 8)}`,
            id,
            cId,
            now
          );
        }
      }

      await pushAllTablesToTurso();
      return NextResponse.json({ success: true, id });
    }

    if (body.action === "toggle_student_active" && body.id) {
      db.prepare(
        `UPDATE course_students SET is_active = ?, updated_at = ? WHERE id = ?`
      ).run(body.is_active ? 1 : 0, now, body.id);
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    if (body.action === "delete_student" && body.id) {
      db.prepare("DELETE FROM course_enrollments WHERE student_id = ?").run(
        body.id
      );
      db.prepare("DELETE FROM course_lesson_progress WHERE student_id = ?").run(
        body.id
      );
      db.prepare("DELETE FROM course_students WHERE id = ?").run(body.id);
      await pushAllTablesToTurso();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Erro ao salvar alterações em Cursos.",
      },
      { status: 500 }
    );
  }
}

