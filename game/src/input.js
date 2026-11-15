// Keyboard + mouse, read as a canvas-relative aim point and a movement vector.
// Actions are edge-triggered bits consumed once per frame by the game loop.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_CHOICE_1 = 8;
export const ACTION_CHOICE_2 = 16;
export const ACTION_CHOICE_3 = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let firing = false;
  let mouseX = 640;
  let mouseY = 360;
  let mouseDown = false;
  let clicked = false;
  let clickX = 0;
  let clickY = 0;

  function keyToAction(code) {
    if (code === 'Space' || code === 'Enter') return ACTION_CONFIRM;
    if (code === 'KeyP' || code === 'Escape') return ACTION_PAUSE;
    if (code === 'KeyM') return ACTION_MUTE;
    if (code === 'Digit1' || code === 'Numpad1') return ACTION_CHOICE_1;
    if (code === 'Digit2' || code === 'Numpad2') return ACTION_CHOICE_2;
    if (code === 'Digit3' || code === 'Numpad3') return ACTION_CHOICE_3;
    return 0;
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      actions |= keyToAction(event.code);
      if (event.code === 'Space') firing = true;
    }
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'Space') firing = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPoint(event);
    mouseX = p.x;
    mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPoint(event);
    mouseX = p.x;
    mouseY = p.y;
    mouseDown = true;
    clicked = true;
    clickX = p.x;
    clickY = p.y;
  });
  window.addEventListener('mouseup', () => {
    mouseDown = false;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    firing = false;
    mouseDown = false;
  });

  function has(...codes) {
    return codes.some((c) => keys.has(c));
  }

  return {
    /** Normalised WASD / arrow movement vector. */
    direction() {
      let x = 0;
      let y = 0;
      if (has('KeyA', 'ArrowLeft')) x -= 1;
      if (has('KeyD', 'ArrowRight')) x += 1;
      if (has('KeyW', 'ArrowUp')) y -= 1;
      if (has('KeyS', 'ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    get firing() {
      return firing || mouseDown;
    },
    get mouse() {
      return { x: mouseX, y: mouseY };
    },
    /** The latest click point, if the player clicked since the last read. */
    takeClick() {
      if (!clicked) return null;
      clicked = false;
      return { x: clickX, y: clickY };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
