import { createFileRoute } from "@tanstack/react-router";
import { html, redirect } from "../lib/html-headers";
import notFound from "../../public/404.html?raw";

/** Percorsi a più segmenti, slash finale non catturata altrove, 404 italiana. */
export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path.startsWith("/tests") || path.startsWith("/scripts") || path.startsWith("/templates")) {
          return html(notFound, 404);
        }
        if (path.length > 1 && path.endsWith("/")) {
          return redirect(path.replace(/\/+$/, "") + url.search);
        }
        return html(notFound, 404);
      },
    },
  },
  component: () => null,
});
