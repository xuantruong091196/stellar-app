import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { destroySession, getSession } from "~/lib/session.server";

// Accept both GET and POST so "Logout" can be either a link or a form.
export async function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return logout(request);
}

async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}
