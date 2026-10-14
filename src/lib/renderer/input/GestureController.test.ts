import {
  DEFAULT_GESTURES,
  GestureController,
  type GestureTarget,
} from "src/lib/renderer/input/GestureController";

function setup(options = DEFAULT_GESTURES) {
  const element = document.createElement("div");
  element.tabIndex = 0;
  element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 200 }) as DOMRect;
  document.body.appendChild(element);
  const target: GestureTarget = {
    panBy: vi.fn(),
    zoomBy: vi.fn(),
    home: vi.fn(),
    rotateBy: vi.fn(),
    setInteracting: vi.fn(),
  };
  const controller = new GestureController(element, target, options);
  return { element, target, controller };
}

describe("GestureController", () => {
  it("leaves a plain wheel to the page when scrollToZoom is off", () => {
    const { element, target } = setup();
    const event = new WheelEvent("wheel", { deltaY: 100, cancelable: true });
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(target.zoomBy).not.toHaveBeenCalled();
  });

  it("zooms on a trackpad pinch even with scrollToZoom off", () => {
    const { element, target } = setup();
    const event = new WheelEvent("wheel", {
      deltaY: -20,
      ctrlKey: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const [factor] = (target.zoomBy as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(factor).toBeGreaterThan(1);
  });

  it.each([
    ["mouse", true, false],
    ["mouse", false, true],
    ["touch", false, false],
  ])(
    "a %s drag with flickEnabled %s is eased: %s",
    (pointerType, flickEnabled, eased) => {
      const { element, target } = setup({ ...DEFAULT_GESTURES, flickEnabled });
      const at = (type: string, x: number, timeStamp: number) => {
        const event = Object.assign(
          new MouseEvent(type, { clientX: x, clientY: 50, button: 0 }),
          { pointerId: 1, pointerType },
        );
        Object.defineProperty(event, "timeStamp", { value: timeStamp });
        element.dispatchEvent(event);
      };
      at("pointerdown", 50, 0);
      at("pointermove", 70, 16);
      at("pointermove", 90, 32);
      at("pointerup", 90, 40);
      const calls = (target.panBy as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0]).toEqual([20, 0, eased]);
      // 40 px in 32 ms, carried on for flickMomentum (0.25 s) unless the drag was eased.
      if (eased) expect(calls).toHaveLength(2);
      else expect(calls[2]).toEqual([312.5, 0, true]);
    },
  );

  it("zooms on a plain wheel when scrollToZoom is on", () => {
    const { element, target } = setup({
      ...DEFAULT_GESTURES,
      scrollToZoom: true,
    });
    const event = new WheelEvent("wheel", { deltaY: 100, cancelable: true });
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const [factor] = (target.zoomBy as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(factor).toBeLessThan(1);
  });

  it.each([
    ["ArrowLeft", "panBy", [40, 0, true]],
    ["ArrowRight", "panBy", [-40, 0, true]],
    ["ArrowUp", "panBy", [0, 20, true]],
    ["+", "zoomBy", [1.5, undefined, true]],
    ["-", "zoomBy", [1 / 1.5, undefined, true]],
    ["0", "home", []],
    ["r", "rotateBy", [90]],
    ["R", "rotateBy", [-90]],
  ])("maps %s to %s", (key, method, args) => {
    const { element, target } = setup();
    const event = new KeyboardEvent("keydown", { key, cancelable: true });
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect((target as any)[method]).toHaveBeenCalledWith(...args);
  });

  it("ignores keys it does not handle, and modified keys", () => {
    const { element, target } = setup();
    const plain = new KeyboardEvent("keydown", { key: "x", cancelable: true });
    const modified = new KeyboardEvent("keydown", {
      key: "+",
      metaKey: true,
      cancelable: true,
    });
    element.dispatchEvent(plain);
    element.dispatchEvent(modified);
    expect(plain.defaultPrevented).toBe(false);
    expect(modified.defaultPrevented).toBe(false);
    expect(target.zoomBy).not.toHaveBeenCalled();
  });

  it("stops listening on dispose", () => {
    const { element, target, controller } = setup();
    controller.dispose();
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "0" }));
    expect(target.home).not.toHaveBeenCalled();
  });

  it("holds the camera still when not navigable, reporting only taps", () => {
    const { element, target } = setup({
      ...DEFAULT_GESTURES,
      clickToZoom: false,
      navigable: false,
    });
    target.tap = vi.fn();
    const pointer = (type: string, x: number) =>
      element.dispatchEvent(
        Object.assign(
          new MouseEvent(type, { clientX: x, clientY: 10, button: 0 }),
          { pointerId: 1, pointerType: "mouse" },
        ),
      );

    // A drag moves nothing.
    pointer("pointerdown", 10);
    pointer("pointermove", 60);
    pointer("pointerup", 60);
    expect(target.panBy).not.toHaveBeenCalled();

    // A click is still a tap (play / pause).
    pointer("pointerdown", 20);
    pointer("pointerup", 20);
    expect(target.tap).toHaveBeenCalledTimes(1);

    // Double-click, keys and a trackpad pinch are left alone.
    element.dispatchEvent(new MouseEvent("dblclick", { clientX: 20 }));
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "+" }));
    const pinch = new WheelEvent("wheel", { ctrlKey: true, cancelable: true });
    element.dispatchEvent(pinch);
    expect(pinch.defaultPrevented).toBe(false);
    expect(target.zoomBy).not.toHaveBeenCalled();
  });
});
