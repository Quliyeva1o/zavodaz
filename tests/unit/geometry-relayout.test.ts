import assert from "node:assert/strict";
import { test } from "node:test";
import { relayout } from "../visual/geometry-lib.mjs";

type Box = { x: number; y: number; width: number; height: number };
type N = { id: string; type?: string; visible?: boolean; absoluteBoundingBox: Box; children?: N[]; [k: string]: unknown };
const box = (x: number, y: number, width: number, height: number): Box => ({ x, y, width, height });
const find = (n: N, id: string): N | undefined => (n.id === id ? n : n.children?.map((c) => find(c, id)).find(Boolean));

// Figma Dropdown instance (281:7018): VERTICAL HUG, hidden label, box stored 27px too low.
const dropdown = (): N => ({
  id: "dd",
  layoutMode: "VERTICAL",
  itemSpacing: 6,
  layoutSizingVertical: "HUG",
  layoutSizingHorizontal: "FIXED",
  absoluteBoundingBox: box(60, 735, 303, 40),
  children: [
    { id: "label", visible: false, absoluteBoundingBox: box(60, 735, 303, 21) },
    {
      id: "field",
      layoutMode: "HORIZONTAL",
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 10,
      paddingBottom: 10,
      counterAxisAlignItems: "CENTER",
      absoluteBoundingBox: box(60, 762, 303, 40),
      children: [{ id: "text", type: "TEXT", absoluteBoundingBox: box(72, 772, 255, 20) }],
    },
  ],
});

test("relayout: köhnəlmiş uşaq yerləşməsi auto-layout xassələrindən yenidən hesablanır (alt ağac da sürüşür)", () => {
  const out = relayout(dropdown()) as N;
  assert.deepEqual(find(out, "field")!.absoluteBoundingBox, box(60, 735, 303, 40));
  assert.deepEqual(find(out, "text")!.absoluteBoundingBox, box(72, 745, 255, 20));
});

test("relayout: ardıcıl ağacda heç nə dəyişmir, orijinal toxunulmaz qalır", () => {
  const fixed = relayout(dropdown()) as N;
  assert.deepEqual(relayout(fixed), fixed);
  const original = dropdown();
  relayout(original);
  assert.deepEqual(original, dropdown());
});

test("relayout: HUG çərçivənin ölçüsü görünən uşaqlardan, sonra CENTER ilə ortalanır (Əlaqə 'Müraciət et')", () => {
  const button: N = {
    id: "button",
    layoutMode: "VERTICAL",
    primaryAxisAlignItems: "CENTER",
    counterAxisAlignItems: "CENTER",
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 8,
    paddingBottom: 8,
    absoluteBoundingBox: box(16, 748, 288, 48),
    children: [
      {
        id: "row",
        layoutMode: "HORIZONTAL",
        itemSpacing: 6,
        layoutSizingHorizontal: "HUG",
        layoutSizingVertical: "HUG",
        absoluteBoundingBox: box(26, 760, 102, 24),
        children: [
          { id: "icon", visible: false, absoluteBoundingBox: box(26, 762, 20, 20) },
          { id: "label", type: "TEXT", absoluteBoundingBox: box(26, 760, 85, 24) },
        ],
      },
    ],
  };
  const out = relayout(button) as N;
  assert.deepEqual(find(out, "row")!.absoluteBoundingBox, box(117.5, 760, 85, 24));
  assert.deepEqual(find(out, "label")!.absoluteBoundingBox, box(117.5, 760, 85, 24));
});

test("relayout: ABSOLUTE uşaq yerində qalır, SPACE_BETWEEN aralığı bərabər bölür", () => {
  const row: N = {
    id: "row",
    layoutMode: "HORIZONTAL",
    primaryAxisAlignItems: "SPACE_BETWEEN",
    absoluteBoundingBox: box(0, 0, 100, 10),
    children: [
      { id: "a", absoluteBoundingBox: box(5, 0, 10, 10) },
      { id: "abs", layoutPositioning: "ABSOLUTE", absoluteBoundingBox: box(40, 3, 5, 5) },
      { id: "b", absoluteBoundingBox: box(50, 0, 10, 10) },
    ],
  };
  const out = relayout(row) as N;
  assert.equal(find(out, "a")!.absoluteBoundingBox.x, 0);
  assert.equal(find(out, "b")!.absoluteBoundingBox.x, 90);
  assert.deepEqual(find(out, "abs")!.absoluteBoundingBox, box(40, 3, 5, 5));
});
