/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Type definitions for Web Speech API to fix compilation errors ---
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognition extends EventTarget {
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}
// ---

import {Chat, GoogleGenAI} from '@google/genai';
import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

// Polyfill for SpeechRecognition
const SpeechRecognitionAPI =
  window.SpeechRecognition || window.webkitSpeechRecognition;

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() isThinking = false;
  @state() isSpeaking = false;
  @state() status = 'Click the mic and start talking.';
  @state() error = '';

  private client: GoogleGenAI;
  private chat: Chat;
  private speechRecognition: SpeechRecognition;
  private utterance: SpeechSynthesisUtterance | null = null;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
      background-color: #121212;
      color: white;
      font-family: 'Inter', sans-serif;
    }

    .container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      position: relative;
    }

    .logo {
     position: fixed;
    top: 1.5rem;
    left: 1.5rem;
    width: 50px;
    height: auto;
    transition: filter 0.3s ease;
    filter: invert(1) brightness(2);
    }

    .main-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 40px;
    }

    .title-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }

    .robot-icon {
      width: 80px;
      height: 80px;
      transition: transform 0.3s ease;
    }

    .robot-icon.thinking,
    .robot-icon.speaking {
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
      }
    }

    h1 {
      margin: 0;
      color: #e9ecef;
      font-size: 2.5rem;
      font-weight: 600;
      transition: color 0.3s;
      ext-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mic-button {
      width: 72px;
      height: 72px;
      background-color: #2979ff;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: background-color 0.2s ease, transform 0.2s ease;
      box-shadow: 0 4px 12px rgba(41, 121, 255, 0.4);
    }

    .mic-button:hover:not(:disabled) {
      background-color: #448aff;
      transform: translateY(-2px);
    }

    .mic-button:disabled {
      background-color: #555;
      cursor: not-allowed;
    }

    .mic-button.recording {
      background-color: #ff4081;
      box-shadow: 0 4px 12px rgba(255, 64, 129, 0.4);
    }

    .mic-button svg {
      width: 32px;
      height: 32px;
      fill: white;
    }

    .status-container {
      position: absolute;
      bottom: 20px;
      text-align: center;
      min-height: 2.2em;
    }

    .status-text {
      font-size: 1rem;
      color: #b0b0b0;
    }

    .error-text {
      font-size: 0.9rem;
      color: #f44336;
    }
  `;

  constructor() {
    super();
    if (!SpeechRecognitionAPI) {
      this.updateError(
        'Speech Recognition API is not supported in this browser.',
      );
      return;
    }
    this.initClient();
  }

  private async initClient() {
    this.client = new GoogleGenAI({
      apiKey: process.env.API_KEY,
    });

    this.chat = this.client.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction:
          'You are an AI assistant and expert on Revolt Motors. Your knowledge is strictly limited to Revolt Motors. If a user asks about anything unrelated to Revolt Motors, you must respond with the exact phrase "I cannot provide that information." and nothing else. For questions about Revolt Motors, answer them as helpfully as possible.',
      },
    });
  }

  private updateStatus(msg: string) {
    this.status = msg;
    this.error = '';
  }

  private updateError(msg: string) {
    this.error = msg;
    console.error(msg);
  }

  private startRecording() {
    if (this.isRecording || this.isThinking || this.isSpeaking) return;

    this.speechRecognition = new SpeechRecognitionAPI();
    this.speechRecognition.interimResults = false;
    this.speechRecognition.lang = 'en-US';

    this.speechRecognition.onstart = () => {
      this.isRecording = true;
      this.updateStatus('Listening...');
    };

    this.speechRecognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[
        event.results.length - 1
      ][0].transcript.trim();
      if (transcript) {
        this.isThinking = true;
        this.updateStatus("I'm thinking...");
        this.askAi(transcript);
      }
    };

    this.speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.updateError(`Speech recognition error: ${event.error}`);
      this.resetState();
    };

    this.speechRecognition.onend = () => {
      this.isRecording = false;
      if (!this.isThinking) {
        this.updateStatus('Click the mic and start talking.');
      }
    };

    this.speechRecognition.start();
  }

  private stopRecording() {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }
  }

  private async askAi(prompt: string) {
    try {
      const response = await this.chat.sendMessage({message: prompt});
      this.isThinking = false;
      this.speak(response.text);
    } catch (e) {
      console.error(e);
      this.updateError('Sorry, I had trouble responding. Please try again.');
      this.resetState();
    }
  }

  private speak(text: string) {
    if (!text?.trim()) {
      this.updateError('I received an empty response. Please try again.');
      this.resetState();
      return;
    }

    this.utterance = new SpeechSynthesisUtterance(text);

    this.utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateStatus('Speaking...');
    };

    this.utterance.onend = () => {
      this.utterance = null;
      this.resetState();
    };

    this.utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.updateError("Sorry, I couldn't speak the response.");
      this.utterance = null;
      this.resetState();
    };

    window.speechSynthesis.speak(this.utterance);
  }

  private resetState() {
    this.isRecording = false;
    this.isThinking = false;
    this.isSpeaking = false;
    this.updateStatus('Click the mic and start talking.');
  }

  private toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else if (this.isSpeaking) {
      // Interrupt speech and start recording.
      if (this.utterance) {
        // Prevent onend from firing resetState() when we cancel manually.
        this.utterance.onend = null;
      }
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.utterance = null;
      this.startRecording();
    } else {
      this.startRecording();
    }
  }

  render() {
    const isBusy = this.isThinking;
    const robotClasses = {
      thinking: this.isThinking,
      speaking: this.isSpeaking,
    };

    return html`
      <div class="container">
        <img class ="logo" src="/revolt.png">

        <div class="main-content">
          <div class="title-container">
           <img src="https://live.revoltmotors.com/images/Rev.gif">
            <h1>Talk to Rev</h1>
          </div>

          <button
            class="mic-button ${this.isRecording ? 'recording' : ''}"
            @click=${this.toggleRecording}
            ?disabled=${isBusy}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 0 24 24"
              width="24px"
              fill="#FFFFFF">
              <path d="M0 0h24v24H0z" fill="none" />
              <path
                d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          </button>
        </div>

        <div class="status-container">
          ${
            this.error
              ? html`<div class="error-text">${this.error}</div>`
              : html`<div class="status-text">${this.status}</div>`
          }
        </div>
      </div>
    `;
  }
}