export interface CounterConfig {
  w: number;
  h: number;
  tex: string;
  spac: number;
  bgc: string;
  tc: string;
}

const DEFAULT_CONFIG: CounterConfig = {
  w: 50,
  h: 64,
  tex: '/cimg/001/c/default.png',
  spac: 50,
  bgc: '#EEEEEE',
  tc: '#101010',
};

class ImgDigit {
  value = 0;
  setValue = 0;
  px = 0;
  py = 0;
  setPx = 0;
  setPy = 0;
  sx = 0;
  sy = 0;
  setSx = 1;
  setSy = 1;
  cm = 1;

  private valAnimate(v: number, s: number, min: number): number {
    const d = s - v;
    if (Math.abs(d) < min) return s;
    return v + d * 0.25;
  }

  animate(): void {
    this.px = this.valAnimate(this.px, this.setPx, 1);
    this.py = this.valAnimate(this.py, this.setPy, 1);
    this.sx = this.valAnimate(this.sx, this.setSx, 0.05);
    this.sy = this.valAnimate(this.sy, this.setSy, 0.05);
    this.setValue = Math.abs(this.setValue % 10);
    this.value = Math.abs(this.value % 10);
    if (this.value !== this.setValue) {
      this.value += this.cm;
      if (this.value < 0) this.value = 9;
      else if (this.value > 10) this.value = 0;
    }
  }

  draw(c: CanvasRenderingContext2D, tex: HTMLImageElement, cfg: CounterConfig, sc: number): void {
    const { w, h } = cfg;
    c.drawImage(
      tex,
      0,
      Math.abs(this.value % 10) * h,
      w,
      h,
      this.px * sc,
      this.py * sc,
      w * this.sx * sc,
      h * this.sy * sc,
    );
  }
}

export class DigitCounter {
  private c: CanvasRenderingContext2D;
  private d: ImgDigit[] = [];
  private tex: HTMLImageElement;
  ready = false;
  mv = 0;
  cm = 1;
  private digCount = 12;
  private cfg: CounterConfig;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement, cfg: Partial<CounterConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.width = canvas.width;
    this.height = canvas.height;
    this.c = canvas.getContext('2d')!;
    this.tex = new Image();
    this.tex.src = this.cfg.tex;
    this.tex.onload = () => {
      this.ready = true;
    };
    for (let i = 0; i < this.digCount; i++) {
      const digit = new ImgDigit();
      digit.setPy = (this.digCount - i) * 30;
      this.d.push(digit);
    }
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  setTexture(src: string): void {
    if (this.cfg.tex === src) return;
    this.cfg.tex = src;
    this.ready = false;
    this.tex = new Image();
    this.tex.src = src;
    this.tex.onload = () => {
      this.ready = true;
    };
  }

  draw(): void {
    if (!this.ready) return;
    const { w, h, spac } = this.cfg;
    this.c.save();
    this.c.clearRect(0, 0, this.width, this.height);

    for (const digit of this.d) {
      digit.setValue = 0;
      digit.setSx = 0;
      digit.setSy = 0;
      digit.cm = this.cm;
    }

    const mvText = String(this.mv);
    let mvTextLen = mvText.length;
    const sc = 1;

    if (this.mv < 1000000000000) {
      for (let i = 0; i < mvTextLen; i++) {
        const ind = i + this.digCount - mvTextLen;
        this.d[ind].setValue = Number(mvText.charAt(i));
        this.d[ind].setSx = sc;
        this.d[ind].setSy = sc;
        this.d[ind].setPy = 0;
      }
    } else {
      mvTextLen = this.digCount;
      for (let i = 0; i < this.digCount; i++) {
        this.d[i].setValue = 9;
        this.d[i].setSx = sc;
        this.d[i].setSy = sc;
        this.d[i].setPy = 0;
      }
    }

    const xOffset = (this.digCount - mvTextLen) * -spac;
    for (let i = 0; i < this.digCount; i++) {
      this.d[i].setPx = i * spac + xOffset + Math.floor(i / 3) * 25;
    }

    let minX = Infinity;
    let maxX = 0;
    for (let i = 0; i < this.digCount; i++) {
      if (this.d[i].setSx > 0) {
        minX = Math.min(minX, this.d[i].setPx);
        maxX = Math.max(maxX, this.d[i].setPx + w);
      }
    }
    if (!isFinite(minX)) {
      this.c.restore();
      return;
    }

    const contentWidth = maxX - minX;
    const pad = 8;
    let scale = 1;
    if (contentWidth > this.width - pad) {
      scale = (this.width - pad) / contentWidth;
    }
    const offsetX = (this.width - contentWidth * scale) / 2 - minX * scale;

    for (let i = 0; i < this.digCount; i++) {
      this.d[i].animate();
    }

    this.c.translate(offsetX, 0);
    for (let i = 0; i < this.digCount; i++) {
      this.d[i].draw(this.c, this.tex, this.cfg, scale);
    }
    this.c.restore();
  }
}
