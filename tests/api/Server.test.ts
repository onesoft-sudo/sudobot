import Server from "../../src/api/Server";
import { beforeEach, describe, test, expect } from '@jest/globals';
import request from 'supertest';
import DiscordClient from "../../src/client/Client";
import { Config } from "../../src/client/Config";

describe("API server", () => {
    process.env.SUDO_PREFIX = '';

    const server = new Server({} as any);
    const config = new Config({} as any);
    const serverIDs = ["87263215715323525", "87263215715323526"];

    config.props[serverIDs[0]] = {
        prefix: "-",
        mod_role: "7262152378215621"
    };

    config.props[serverIDs[1]] = {
        prefix: "+",
        mod_role: "7262152378215622"
    };

    DiscordClient.client = { server } as DiscordClient;

    beforeEach(async () => {
        await server.boot();
    });
    
    test('check if the server works', async () => {
        const response = await request(server.express)
            .get('/')
            .expect(200);

        expect(response?.body?.message).toBe('Server is up.');
    });

    test('check if the server authentication works', async () => {
        const response1 = await request(server.express)
            .get('/config/' + serverIDs[0])
            .expect(401);

        expect(response1?.body?.error).toBe("No authorization header in the request");

        const response2 = await request(server.express)
            .get('/config/' + serverIDs[0])
            .set("Authorization", "Basic 218h23hd461xh6sh1273brh6216y7r1bh")
            .expect(401);

        expect(response2?.body?.error).toBe("Only Bearer tokens are supported");

        const response3 = await request(server.express)
            .get('/config/' + serverIDs[0])
            .set("Authorization", "Bearer")
            .expect(401);

        expect(response3?.body?.error).toBe("No Bearer token provided");
    });
});