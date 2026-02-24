import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return Response.json({ profile: null });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return Response.json({ profile: null });

  const user = await prisma.user.findUnique({ where: { id: data.user.id } });
  if (!user) {
    return Response.json({
      profile: {
        firstName: data.user.user_metadata.first_name as string | undefined,
        lastName: data.user.user_metadata.last_name as string | undefined,
        email: data.user.email,
        phone: data.user.phone,
      },
    });
  }

  return Response.json({
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    },
  });
}
