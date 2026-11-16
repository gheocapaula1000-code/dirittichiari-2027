import { createFileRoute } from "@tanstack/react-router";
import { html, redirect } from "../lib/html-headers";
import home from "../../public/pwa/bn/home.html?raw";

/** Home bn: /bn 200, /bn/ → 301 /bn. */
export const Route = createFileRoute("/bn")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname === "/bn/") return redirect("/bn" + url.search);
        return html(home, 200);
      },
    },
  },
  component: () => null,
});
