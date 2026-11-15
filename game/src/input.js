// Keyboard plus mouse input. Tracks what is held down, what was just
// pressed this frame, and where the mouse is and whether it is clicking.
// The main loop consumes "just pressed" keys so a single tap never fires twice.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 640;
    this.mouseY = 300;
    this.mouseDown = false;
    this.clicked = null;
    this.onFirstGesture = null;

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pressed.clear();
      this.mouseDown = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      const r = canvas.getBoundingClientRect();
      this.clicked = {
        x: (e.clientX - r.left) * (canvas.width / r.width),
        y: (e.clientY - r.top) * (canvas.height / r.height),
      };
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** True while the key is held. */
  down(code) { return this.keys.has(code); }

  /** True once, on the frame the key went down; consumed by the caller. */
  wasPressed(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }

  /** Any movement key held, as a normalised direction vector. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  }

  /** Whether the player is holding fire: mouse or Space. */
  firing() { return this.mouseDown || this.down('Space'); }

  /** The mouse position most recently clicked, consumed once. */
  takeClick() {
    const c = this.clicked;
    this.clicked = null;
    return c;
  }

  /** Clear the just-pressed set at the end of a frame. */
  endFrame() { this.pressed.clear(); }
}
