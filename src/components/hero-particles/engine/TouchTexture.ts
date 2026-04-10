import * as THREE from 'three';

function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}

type TrailPoint = {
  x: number;
  y: number;
  age: number;
  force: number;
};

export default class TouchTexture {
  public texture: THREE.Texture;
  public canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;
  private size = 64;
  private maxAge = 120;
  private radius = 0.15;
  private trail: TrailPoint[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = this.size;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Não foi possível criar o contexto do TouchTexture.');
    }

    this.ctx = ctx;
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.texture = new THREE.Texture(this.canvas);
    this.texture.needsUpdate = true;
  }

  update(): void {
    this.clear();

    this.trail = this.trail.filter((point) => {
      point.age += 1;
      return point.age <= this.maxAge;
    });

    this.trail.forEach((point) => {
      this.drawTouch(point);
    });

    this.texture.needsUpdate = true;
  }

  addTouch(point: { x: number; y: number }): void {
    let force = 0;
    const last = this.trail[this.trail.length - 1];

    if (last) {
      const dx = last.x - point.x;
      const dy = last.y - point.y;
      const dd = dx * dx + dy * dy;
      force = Math.min(dd * 10000, 1);
    }

    this.trail.push({
      x: point.x,
      y: point.y,
      age: 0,
      force,
    });
  }

  private clear(): void {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawTouch(point: TrailPoint): void {
    const pos = {
      x: point.x * this.size,
      y: (1 - point.y) * this.size,
    };

    let intensity = 1;
    if (point.age < this.maxAge * 0.3) {
      intensity = easeOutSine(point.age / (this.maxAge * 0.3));
    } else {
      intensity = easeOutSine(
        1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7),
      );
    }

    intensity *= point.force;

    const radius = this.size * this.radius * intensity;
    const gradient = this.ctx.createRadialGradient(
      pos.x,
      pos.y,
      radius * 0.25,
      pos.x,
      pos.y,
      radius,
    );

    gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.0)');

    this.ctx.beginPath();
    this.ctx.fillStyle = gradient;
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}