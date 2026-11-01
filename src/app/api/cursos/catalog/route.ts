import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStudentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pullAllTablesFromTurso } from "@/lib/turso-sync";
import { Course, CourseLesson } from "@/types/domain";

export async function GET(req: NextRequest) {
  try {
    await pullAllTablesFromTurso();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    const studentSession = await getStudentSession();
    const adminSession = await getAdminSession();

    let enrolledCourseIds: string[] = [];
    let completedLessonIds: string[] = [];

    if (studentSession) {
      const rows = db
        .prepare(
          "SELECT course_id FROM course_enrollments WHERE student_id = ?"
        )
        .all(studentSession.studentId) as Array<{ course_id: string }>;
      enrolledCourseIds = rows.map((r) => r.course_id);

      const prog = db
        .prepare(
          "SELECT lesson_id FROM course_lesson_progress WHERE student_id = ?"
        )
        .all(studentSession.studentId) as Array<{ lesson_id: string }>;
      completedLessonIds = prog.map((p) => p.lesson_id);
    } else if (adminSession) {
      const allCourses = db.prepare("SELECT id FROM courses").all() as Array<{
        id: string;
      }>;
      enrolledCourseIds = allCourses.map((c) => c.id);
    }

    if (slug) {
      const course = db
        .prepare("SELECT * FROM courses WHERE slug = ? OR id = ?")
        .get(slug, slug) as Course | undefined;

      if (!course) {
        return NextResponse.json(
          { error: "Curso não encontrado." },
          { status: 404 }
        );
      }

      const lessons = db
        .prepare(
          "SELECT * FROM course_lessons WHERE course_id = ? ORDER BY display_order ASC, created_at ASC"
        )
        .all(course.id) as CourseLesson[];

      const hasFullAccess =
        Boolean(adminSession) || enrolledCourseIds.includes(course.id);

      // Protege video_url das aulas não gratuitas caso o visitante não tenha acesso
      const sanitizedLessons = lessons.map((l) => ({
        ...l,
        video_url:
          hasFullAccess || Boolean(l.is_free_preview) ? l.video_url : "",
        attachment_url:
          hasFullAccess || Boolean(l.is_free_preview) ? l.attachment_url : "",
      }));

      return NextResponse.json({
        course,
        lessons: sanitizedLessons,
        hasFullAccess,
        isAdminPreview: Boolean(adminSession && !studentSession),
        student: studentSession
          ? {
              id: studentSession.studentId,
              fullName: studentSession.fullName,
              email: studentSession.email,
            }
          : null,
        completedLessonIds,
      });
    }

    const courses = db
      .prepare(
        "SELECT * FROM courses WHERE is_active = 1 ORDER BY display_order ASC, created_at DESC"
      )
      .all() as Course[];

    const coursesWithCounts = courses.map((c) => {
      const cnt = db
        .prepare(
          "SELECT COUNT(*) as total FROM course_lessons WHERE course_id = ?"
        )
        .get(c.id) as { total: number };
      return {
        ...c,
        lessons_count: cnt?.total || 0,
      };
    });

    const headerRow = db
      .prepare("SELECT * FROM site_sections WHERE id = 'courses_page_header'")
      .get() as
      | { id: string; title: string; subtitle: string }
      | undefined;

    const pageHeader = {
      title: headerRow?.title || "Cursos, Capacitações & Área de Alunos",
      subtitle:
        headerRow?.subtitle ||
        "Formações técnicas e práticas em Enfermagem Dermatológica, Manejo Avançado de Feridas, Laserterapia e Estética Avançada.",
    };

    return NextResponse.json({
      courses: coursesWithCounts,
      pageHeader,
      enrolledCourseIds,
      completedLessonIds,
      isAdminPreview: Boolean(adminSession && !studentSession),
      student: studentSession
        ? {
            id: studentSession.studentId,
            fullName: studentSession.fullName,
            email: studentSession.email,
          }
        : null,
    });
  } catch (err) {
    console.error("Erro ao consultar catálogo de cursos:", err);
    return NextResponse.json(
      { error: "Erro ao consultar catálogo de cursos." },
      { status: 500 }
    );
  }
}

