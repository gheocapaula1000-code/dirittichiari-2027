import { createFileRoute } from "@tanstack/react-router";
import { html, redirect } from "../lib/html-headers";
import home from "../../public/pwa/en/home.html?raw";

/** Home en: /en 200, /en/ → 301 /en. */
export const Route = createFileRoute("/en")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname === "/en/") return redirect("/en" + url.search);
        return html(home, 200);
      },
    },
  },
  component: () => null,
});
