export class WorkerManager {
  private jobs: object[] = [];
  private readonly _worker: Worker;

  private isBusy = false;

  private _results = {};

  constructor() {
    this._worker = new Worker(new URL('/src/worker.ts', import.meta.url), {
      type: 'module', // Важно для Vite
    });
  }

  postMessage(message: object) {
    this.isBusy = true;

    this._worker.postMessage(message);

    this._worker.onmessage = (e: MessageEvent) => {
      this.jobs = this.jobs.filter((m) => m !== message);
      // resolve(e.data);
      this.isBusy = false;
      // worker.terminate(); // Закрываем Worker после выполнения
    };

    this._worker.onerror = (error) => {
      console.error('Worker error:', error);
      this.isBusy = false;
      // worker.terminate();
    };
  }

  start() {
    setTimeout(() => {
      if (this.isBusy) {
        return;
      }

      const message = this.jobs.shift();
      if (!message) {
        return;
      }

      this.postMessage(message);
    }, 500);
  }

  async emit<T>(message: object): Promise<T> {
    // this.jobs.push(message);

    return new Promise((resolve, reject) => {
      this._worker.postMessage(message);

      this._worker.onmessage = (e: MessageEvent) => {
        this.jobs = this.jobs.filter((m) => m !== message);
        resolve(e.data);
        this.isBusy = false;
        // worker.terminate(); // Закрываем Worker после выполнения
      };

      this._worker.onerror = (error) => {
        console.error('Worker error:', error);
        reject(error);
        this.isBusy = false;
        // worker.terminate();
      };
    });
  }
}
