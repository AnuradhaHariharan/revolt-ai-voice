/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Analyser} from './analyser';

@customElement('gdm-live-audio-visuals')
export class GdmLiveAudioVisuals extends LitElement {
  private inputAnalyser: Analyser;
  private outputAnalyser: Analyser;

  private _outputNode: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  static styles = css`
    canvas {
      width: 100vw;
      height: 100vh;
      position: absolute;
      inset: 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
  }

  protected firstUpdated() {
    this.canvas = this.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.animation();
  }

  private animation() {
    requestAnimationFrame(() => this.animation());

    if (!this.inputAnalyser || !this.outputAnalyser) return;

    this.inputAnalyser.update();
    this.outputAnalyser.update();

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const gradient = this.ctx.createLinearGradient(
      0,
      0,
      0,
      window.innerHeight,
    );
    gradient.addColorStop(0, '#000010');
    gradient.addColorStop(1, '#100010');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    this.ctx.lineWidth = 4;

    this.ctx.strokeStyle = '#ff0000';
    this.ctx.beginPath();
    this.ctx.arc(
      cx,
      cy,
      50 + (this.inputAnalyser.data[0] / 255) * 50,
      0,
      Math.PI * 2,
    );
    this.ctx.stroke();

    this.ctx.strokeStyle = '#0000ff';
    this.ctx.beginPath();
    this.ctx.arc(
      cx,
      cy,
      50 + (this.outputAnalyser.data[0] / 255) * 50,
      0,
      Math.PI * 2,
    );
    this.ctx.stroke();
  }

  protected render() {
    return html`<canvas></canvas>`;
  }
}
