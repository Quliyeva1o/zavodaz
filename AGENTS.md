# Zavod.az — agent qaydaları

- Bütün istifadəçi mətnləri, sənədlər, commit təsvirləri Azərbaycan dilində.
- UI Figma ilə 1:1 pikselə-piksel (docs/02-spec.md, bölmə 1.1). Ölçüləri `npm run figma:inspect -- <node-id>` ilə götür, gözlə ölçmə.
- Yoxlama iki pillədir: `npm run visual:check` (prod server 3100-də) — həndəsə: ölçü eyni, hər Figma mətninin x/y/hündürlüyü ±1px (`visual:geometry`); vizual: pixelmatch fərqi ≤ 2.5% (`visual:compare`).
- Rəng və text style yalnız `src/styles/tokens.css`-dən (generasiya: `npm run figma:tokens`).
- Next.js 16: API-lər dəyişib, şübhə olanda `node_modules/next/dist/docs/`-a bax.
