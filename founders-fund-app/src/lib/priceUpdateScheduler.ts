/**
 * Price Update Scheduler
 *
 * Client-side scheduler for triggering price updates
 * This runs in the browser and calls the update-prices API endpoint
 */

export class PriceUpdateScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private updateInterval = 30000; // 30 seconds

  /**
   * Start the price update scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Price update scheduler is already running');
      return;
    }

    console.log('[Price Scheduler] Starting price update scheduler...');
    this.isRunning = true;

    // Run immediately
    this.triggerUpdate();

    // Then run every 30 seconds
    this.intervalId = setInterval(() => {
      this.triggerUpdate();
    }, this.updateInterval);
  }

  /**
   * Stop the price update scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Price Scheduler] Stopped price update scheduler');
  }

  /**
   * Trigger a price update
   */
  private async triggerUpdate(): Promise<void> {
    try {
      const response = await fetch('/api/jobs/update-prices', {
        method: 'POST',
      });

      if (!response.ok) {
        console.error('[Price Scheduler] Update failed:', response.statusText);
        return;
      }

      const data = await response.json();
      console.log('[Price Scheduler] Update completed:', data.stats);
    } catch (error) {
      console.error('[Price Scheduler] Update error:', error);
    }
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Set update interval (in milliseconds)
   */
  setInterval(intervalMs: number): void {
    this.updateInterval = intervalMs;
    if (this.isRunning) {
      // Restart with new interval
      this.stop();
      this.start();
    }
  }
}

// Singleton instance
let schedulerInstance: PriceUpdateScheduler | null = null;

/**
 * Get the price update scheduler instance
 */
export function getPriceScheduler(): PriceUpdateScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new PriceUpdateScheduler();
  }
  return schedulerInstance;
}
