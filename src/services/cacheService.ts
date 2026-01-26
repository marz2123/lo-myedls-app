// Global Client-Side Caching Service
// TTL-based caching with hash-based deduplication

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hash?: string;
}

interface CacheConfig {
  transcripts: number;      // Per-segment transcript cache TTL (ms)
  visionResults: number;    // Per-frame vision cache TTL (ms)
  edlSummaries: number;     // EDL summary cache TTL (ms)
  taskLists: number;        // Task list cache TTL (ms)
}

const DEFAULT_TTL: CacheConfig = {
  transcripts: 30 * 60 * 1000,     // 30 minutes
  visionResults: 60 * 60 * 1000,   // 1 hour (frames don't change)
  edlSummaries: 10 * 60 * 1000,    // 10 minutes
  taskLists: 5 * 60 * 1000,        // 5 minutes (invalidate on update)
};

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig = DEFAULT_TTL;

  // Generate hash for content (for frame deduplication)
  private async generateHash(content: string | Blob): Promise<string> {
    let data: ArrayBuffer;
    if (content instanceof Blob) {
      data = await content.arrayBuffer();
    } else {
      data = new TextEncoder().encode(content).buffer as ArrayBuffer;
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  // Check if cache entry is valid
  private isValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < entry.ttl;
  }

  // Get cached item
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (this.isValid(entry)) {
      return entry!.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  // Set cached item with TTL
  set<T>(key: string, data: T, ttl: number, hash?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hash,
    });
  }

  // Invalidate cache by key or pattern
  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Transcript caching
  async cacheTranscript(segmentId: string, transcript: string): Promise<void> {
    const key = `transcript:${segmentId}`;
    this.set(key, transcript, this.config.transcripts);
  }

  getTranscript(segmentId: string): string | null {
    return this.get(`transcript:${segmentId}`);
  }

  // Vision results caching with frame hash
  async cacheVisionResult(frameData: Blob, result: any): Promise<void> {
    const hash = await this.generateHash(frameData);
    const key = `vision:${hash}`;
    this.set(key, result, this.config.visionResults, hash);
  }

  async getVisionResult(frameData: Blob): Promise<any | null> {
    const hash = await this.generateHash(frameData);
    return this.get(`vision:${hash}`);
  }

  // EDL Summary caching
  cacheEDLSummary(projectId: string, summary: any): void {
    const key = `edl:${projectId}`;
    this.set(key, summary, this.config.edlSummaries);
  }

  getEDLSummary(projectId: string): any | null {
    return this.get(`edl:${projectId}`);
  }

  // Task list caching
  cacheTaskList(projectId: string, tasks: any[]): void {
    const key = `tasks:${projectId}`;
    this.set(key, tasks, this.config.taskLists);
  }

  getTaskList(projectId: string): any[] | null {
    return this.get(`tasks:${projectId}`);
  }

  invalidateTaskList(projectId: string): void {
    this.invalidate(`tasks:${projectId}`);
  }

  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cacheService = new CacheService();
export default cacheService;
