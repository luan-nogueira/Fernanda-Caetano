import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  authenticateStudentCredentials,
  createStudentSessionToken,
  getAdminSession,
  getStudentSession,
  STUDENT_COOKIE_CONFIG,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pullAllTablesFromTurso, pushAllTablesToTurso } from "@/lib/turso-sync";

export async function GET() {
  await pullAllTablesFromTurso();
  const studentSession = await getStudentSession();
  const adminSession = await getAdminSession();

  if (!studentSession && !adminSession) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const db = getDb();
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

  return NextResponse.json({
    authenticated: true,
    isAdminPreview: Boolean(adminSession && !studentSession),
    student: studentSession
      ? {
          id: studentSession.studentId,
          fullName: studentSession.fullName,
          email: studentSession.email,
        }
      : {
          id: "admin-preview",
          fullName: "Dra. Fernanda Caetano (Modo Admin)",
          email: adminSession?.email || "",
        },
    enrolledCourseIds,
    completedLessonIds,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, lessonId } = body;

    if (action === "logout") {
      const cookieStore = await cookies();
      cookieStore.delete(STUDENT_COOKIE_CONFIG.name);
      return NextResponse.json({ success: true });
    }

    if (action === "toggle_progress" && lessonId) {
      await pullAllTablesFromTurso();
      const studentSession = await getStudentSession();
      if (!studentSession) {
        return NextResponse.json(
          { error: "Faça login como aluno para registrar progresso." },
          { status: 401 }
        );
      }

      const db = getDb();
      const existing = db
        .prepare(
          "SELECT completed_at FROM course_lesson_progress WHERE student_id = ? AND lesson_id = ?"
        )
        .get(studentSession.studentId, lessonId);

      if (existing) {
        db.prepare(
          "DELETE FROM course_lesson_progress WHERE student_id = ? AND lesson_id = ?"
        ).run(studentSession.studentId, lessonId);
      } else {
        db.prepare(
          "INSERT INTO course_lesson_progress (student_id, lesson_id, completed_at) VALUES (?, ?, ?)"
        ).run(studentSession.studentId, lessonId, new Date().toISOString());
      }

      await pushAllTablesToTurso();
      const prog = db
        .prepare(
          "SELECT lesson_id FROM course_lesson_progress WHERE student_id = ?"
        )
        .all(studentSession.studentId) as Array<{ lesson_id: string }>;

      return NextResponse.json({
        success: true,
        completedLessonIds: prog.map((p) => p.lesson_id),
      });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Informe o seu e-mail e a senha enviada pela Dra. Fernanda." },
        { status: 400 }
      );
    }

    await pullAllTablesFromTurso(true);
    const result = authenticateStudentCredentials(email, password);

    if (!result.session) {
      return NextResponse.json(
        { error: result.error || "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const token = createStudentSessionToken(result.session);
    const cookieStore = await cookies();
    cookieStore.set(STUDENT_COOKIE_CONFIG.name, token, {
      httpOnly: STUDENT_COOKIE_CONFIG.httpOnly,
      path: STUDENT_COOKIE_CONFIG.path,
      sameSite: STUDENT_COOKIE_CONFIG.sameSite,
      maxAge: STUDENT_COOKIE_CONFIG.maxAge,
    });

    return NextResponse.json({
      success: true,
      student: {
        id: result.session.studentId,
        fullName: result.session.fullName,
        email: result.session.email,
      },
    });
  } catch (err) {
    console.error("Erro no login do aluno:", err);
    return NextResponse.json(
      { error: "Erro interno ao autenticar aluno." },
      { status: 500 }
    );
  }
}

