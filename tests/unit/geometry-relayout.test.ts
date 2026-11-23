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

test("relayout: FILL / STRETCH uşaq çarpaz oxda daxili ölçünü alır (Əlaqə textarea: saxlanmış 303 → 605, sayğac sağa)", () => {
  const field: N = {
    id: "field",
    layoutMode: "VERTICAL",
    layoutSizingHorizontal: "FIXED",
    absoluteBoundingBox: box(775, 384, 605, 120),
    children: [
      {
        id: "row",
        layoutMode: "HORIZONTAL",
        primaryAxisAlignItems: "MAX",
        layoutSizingHorizontal: "FILL",
        paddingLeft: 12,
        paddingRight: 12,
        absoluteBoundingBox: box(775, 384, 303, 16),
        children: [{ id: "counter", type: "TEXT", absoluteBoundingBox: box(1031, 384, 35, 16) }],
      },
      { id: "old", layoutAlign: "STRETCH", absoluteBoundingBox: box(775, 400, 303, 20) },
    ],
  };
  const out = relayout(field) as N;
  assert.equal(find(out, "row")!.absoluteBoundingBox.width, 605);
  assert.equal(find(out, "old")!.absoluteBoundingBox.width, 605);
  // MAX: 775 + 605 − 12 − 35
  assert.equal(find(out, "counter")!.absoluteBoundingBox.x, 1333);
});

test("relayout: layoutGrow / FILL əsas oxda boş yeri bərabər bölür; counter-axis MAX", () => {
  const row: N = {
    id: "row",
    layoutMode: "HORIZONTAL",
    itemSpacing: 10,
    counterAxisAlignItems: "MAX",
    absoluteBoundingBox: box(0, 0, 300, 40),
    children: [
      { id: "fixed", absoluteBoundingBox: box(0, 0, 80, 20) },
      { id: "grow1", layoutGrow: 1, absoluteBoundingBox: box(90, 0, 50, 40) },
      { id: "grow2", layoutSizingHorizontal: "FILL", absoluteBoundingBox: box(150, 0, 50, 10) },
    ],
  };
  const out = relayout(row) as N;
  // boş yer: 300 − 80 − 2×10 = 200 → hər biri 100
  assert.deepEqual(find(out, "fixed")!.absoluteBoundingBox, box(0, 20, 80, 20));
  assert.deepEqual(find(out, "grow1")!.absoluteBoundingBox, box(90, 0, 100, 40));
  assert.deepEqual(find(out, "grow2")!.absoluteBoundingBox, box(200, 30, 100, 10));
});

test("relayout: HUG ölçü minWidth/maxWidth ilə, FILL çarpaz ölçü uşağın min/max-ı ilə məhdudlaşır", () => {
  const hug = (extra: Record<string, unknown>): N => ({
    id: "hug",
    layoutMode: "HORIZONTAL",
    layoutSizingHorizontal: "HUG",
    absoluteBoundingBox: box(0, 0, 999, 20),
    children: [{ id: "a", absoluteBoundingBox: box(0, 0, 50, 20) }],
    ...extra,
  });
  assert.equal((relayout(hug({ minWidth: 80 })) as N).absoluteBoundingBox.width, 80);
  assert.equal((relayout(hug({ maxWidth: 30 })) as N).absoluteBoundingBox.width, 30);
  assert.equal((relayout(hug({})) as N).absoluteBoundingBox.width, 50);
  const col: N = {
    id: "col",
    layoutMode: "VERTICAL",
    absoluteBoundingBox: box(0, 0, 300, 100),
    children: [{ id: "s", layoutAlign: "STRETCH", maxWidth: 120, absoluteBoundingBox: box(0, 0, 50, 20) }],
  };
  assert.equal(find(relayout(col) as N, "s")!.absoluteBoundingBox.width, 120);
});

test("relayout: modelləşdirmədiyi hallarda hesablamır, xəta verir", () => {
  const frame = (extra: Record<string, unknown>, kids: N[] = [{ id: "k", absoluteBoundingBox: box(0, 0, 10, 10) }]): N => ({
    id: "f",
    layoutMode: "HORIZONTAL",
    absoluteBoundingBox: box(0, 0, 100, 20),
    children: kids,
    ...extra,
  });
  const cases: [N, RegExp][] = [
    [frame({ layoutWrap: "WRAP" }), /WRAP/],
    [frame({ layoutMode: "GRID" }), /GRID/],
    [frame({ counterAxisAlignItems: "BASELINE" }), /BASELINE/],
    [frame({ strokesIncludedInLayout: true }), /strokesIncludedInLayout/],
    [frame({}, [{ id: "k", layoutAlign: "CENTER", absoluteBoundingBox: box(0, 0, 10, 10) }]), /layoutAlign CENTER/],
    [frame({ layoutSizingHorizontal: "HUG" }, [{ id: "k", layoutGrow: 1, absoluteBoundingBox: box(0, 0, 10, 10) }]), /HUG main axis with a FILL child/],
    [frame({ primaryAxisAlignItems: "SPACE_BETWEEN" }, [{ id: "k", layoutGrow: 1, absoluteBoundingBox: box(0, 0, 10, 10) }]), /SPACE_BETWEEN/],
    [frame({}, [{ id: "k", layoutGrow: 1, minWidth: 5, absoluteBoundingBox: box(0, 0, 10, 10) }]), /min\/max size on a FILL main axis/],
    [frame({}, [{ id: "a", absoluteBoundingBox: box(0, 0, 150, 10) }, { id: "k", layoutGrow: 1, absoluteBoundingBox: box(0, 0, 10, 10) }]), /no free space/],
  ];
  for (const [n, re] of cases) assert.throws(() => relayout(n), re, String(re));
});
