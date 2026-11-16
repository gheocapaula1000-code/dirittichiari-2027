import { createFileRoute } from "@tanstack/react-router";
import shell from "../../public/pwa/home.html?raw";
import { html } from "../lib/html-headers";

/** GET / restituisce l'HTML statico della home, 200, senza /index.html. */
export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async () => html(shell, 200),
    },
  },
  component: () => null,
});
