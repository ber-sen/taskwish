import {
  demoSession,
  demoSessionCookie,
} from "../../../../../src/console-demo-store";

export function GET(request: Request) {
  const session = demoSession(request);
  return Response.json(
    [
      {
        actor: "Todos",
        state: { items: session.todos },
      },
    ],
    { headers: { "Set-Cookie": demoSessionCookie(session.id) } },
  );
}
