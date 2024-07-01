import { cookies } from "next/headers";
import { ExternalUserId } from "@mirohq/miro-api";
import { Storage, State } from "@mirohq/miro-api/dist/storage";
import { createClient } from "redis";

const tokensCookie = "miro_tokens";

export class RedisStorage implements Storage {
  private redisClient: any;

  // Initiate a connection to the Redis instance.
  // On subsequent calls, it returns the same Redis connection
  async _getClient() {
    if (!this.redisClient) {
      const client = createClient();
      await client.connect();
      this.redisClient = client;
    }
    return this.redisClient;
  }

  // Return the state from Redis, if this data exists
  async get(userId: ExternalUserId) {
    const client = await this._getClient();
    const value = await client.get(userId.toString());
    if (!value) return undefined;
    return JSON.parse(value);
  }

  // Store the state in Redis.
  // If the state is undefined, the corresponding Redis key is deleted
  async set(userId: ExternalUserId, state: State | undefined) {
    // If I set the cookie here, it works as expected. But I'm not sure if I should set it before or after storing the state in Redis.
    // cookies().set(tokensCookie, JSON.stringify(state), {
    //   path: "/",
    //   httpOnly: true,
    //   sameSite: "none",
    //   secure: true,
    // });

    const client = await this._getClient();

    // Delete the state, if it's undefined
    if (!state) {
      return await client.del(userId.toString());
    }

    // Store the state in Redis
    await client.set(userId.toString(), JSON.stringify(state));

    // BUG: If I set the cookie here, a response is already sent to the client (src/app/api/redirect/route.ts). I don't get any error, but the cookie is not set.
    cookies().set(tokensCookie, JSON.stringify(state), {
      path: "/",
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
  }
}
