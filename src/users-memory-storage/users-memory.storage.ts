import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class UsersMemoryStorage {
  private static readonly FOUR_HOURS_IN_MILLISECONDS = 4 * 60 * 60 * 1000;
  private redisClient: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('Environment variable REDIS_URL is not set properly.');
    }

    try {
      this.redisClient = new Redis(redisUrl); // Initialize Redis Cloud client
    } catch (error) {
      console.error('Error initializing Redis client:', error);
      throw error;
    }
  }

  /**
   * Calculates the remaining time (in seconds) before the user can play again.
   *
   * @param key - The key associated with the user.
   * @returns The number of remaining seconds. Returns 0 if the user can already play again.
   */
  async timeUntilNextPlay(userIp: string): Promise<number> {
    try {
      const storedEventDateStr: string | null = await this.redisClient.get(
        this.constructKeyFromIP(userIp),
      );

      if (!storedEventDateStr) {
        return 0;
      }

      const storedEventDate = new Date(storedEventDateStr);
      const currentTime = new Date();
      const timeDifference = currentTime.getTime() - storedEventDate.getTime();

      if (timeDifference >= UsersMemoryStorage.FOUR_HOURS_IN_MILLISECONDS) {
        return 0;
      } else {
        return Math.ceil(
          (UsersMemoryStorage.FOUR_HOURS_IN_MILLISECONDS - timeDifference) /
            1000,
        );
      }
    } catch (error) {
      console.error('Error fetching data from Redis:', error);
      return 0; // If there's an error, allow the user to play
    }
  }

  /**
   * Validates a user based on their IP address.
   * If the user is new or last event is older than 4 hours, returns true.
   *
   * @param userIp - The IP address of the user.
   * @returns true if the user is valid, false otherwise.
   */
  async validate(userIp: string): Promise<boolean> {
    try {
      const remainingTime = await this.timeUntilNextPlay(userIp);

      if (remainingTime === 0) {
        const currentDate = new Date();
        const key = this.constructKeyFromIP(userIp);
        await this.storeEventDate(key, currentDate);
        return true;
      }
    } catch (error) {
      console.error('Error during Redis operation (validate):', error);
    }
    return false;
  }

  /**
   * Constructs a key for Redis storage based on the user's IP address.
   *
   * @param ip - The IP address of the user.
   * @returns The constructed key.
   */
  private constructKeyFromIP(ip: string): string {
    return `user-${ip}`;
  }

  /**
   * Stores the event date for a given key in Redis.
   *
   * @param key - The key under which to store the data.
   * @param date - The date of the event to store.
   */
  private async storeEventDate(key: string, date: Date): Promise<void> {
    try {
      await this.redisClient.set(
        key,
        date.toISOString(),
        'PX',
        UsersMemoryStorage.FOUR_HOURS_IN_MILLISECONDS,
      );
    } catch (error) {
      console.error('Error storing data in Redis:', error);
    }
  }
}
