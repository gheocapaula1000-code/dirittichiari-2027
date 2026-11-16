import { createFileRoute } from "@tanstack/react-router";
import { html, redirect } from "../lib/html-headers";
import stima from "../../public/pwa/bn/stima.html?raw";
import risultati from "../../public/pwa/bn/risultati.html?raw";
import ottimizzazione from "../../public/pwa/bn/ottimizzazione.html?raw";
import checklist from "../../public/pwa/bn/checklist-dsu.html?raw";
import diritti from "../../public/pwa/bn/diritti-pa.html?raw";
import fonti from "../../public/pwa/bn/fonti.html?raw";
import metodo from "../../public/pwa/bn/metodo.html?raw";
import contatti from "../../public/pwa/bn/contatti.html?raw";
import privacy from "../../public/pwa/bn/privacy.html?raw";
import notFound from "../../public/pwa/bn/404.html?raw";

const PAGES: Record<string, string> = {
  stima,
  risultati,
  ottimizzazione,
  "checklist-dsu": checklist,
  "diritti-pa": diritti,
  fonti,
  metodo,
  contatti,
  privacy,
};

export const Route = createFileRoute("/bn/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
          return redirect(url.pathname.replace(/\/+$/, "") + url.search);
        }
        const body = PAGES[params.slug];
        if (!body) return html(notFound, 404);
        return html(body, 200);
      },
    },
  },
  component: () => null,
});
