export class WorkerPool {
    private workers: Worker[] = [];
    private queue: Array<{ resolve: (w: Worker) => void }> = [];
    private idle: Worker[] = [];

    constructor(size: number, factory: () => Worker) {
        for (let i = 0; i < size; i++) {
            const w = factory(); // I dunno why but if I just pass in a URL and construct the worker here it misreads the URL. 
            this.workers.push(w);
            this.idle.push(w);
        }
    }

    acquire(): Promise<Worker> {
        return new Promise((resolve) => {
            if (this.idle.length > 0) {
                resolve(this.idle.pop()!);
            } else {
                this.queue.push({ resolve });
            }
        });
    }

    release(worker: Worker) {
        worker.onmessage = null;
        worker.onerror = null;
        if (this.queue.length > 0) {
            this.queue.shift()!.resolve(worker);
        } else {
            this.idle.push(worker);
        }
    }

    terminate() {
        this.workers.forEach(w => w.terminate());
    }
}