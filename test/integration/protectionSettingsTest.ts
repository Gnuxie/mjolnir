import { strict as assert } from "assert";

import config from "../../src/config";
import { PROTECTIONS } from "../../src/protections/protections";
import { ProtectionSettingValidationError } from "../../src/protections/ProtectionSettings";
import { NumberProtectionSetting, StringProtectionSetting, StringListProtectionSetting } from "../../src/protections/ProtectionSettings";
import { newTestUser, noticeListener } from "./clientHelper";
import { matrixClient, mjolnir } from "./mjolnirSetupUtils";

describe("Test: Protection settings", function() {
    let client;
    this.beforeEach(async function () {
        client = await newTestUser(true);
        await client.start();
    })
    this.afterEach(async function () {
        await client.stop();
    })
    it("Mjolnir refuses to save invalid protection setting values", async function() {
        this.timeout(20000);
        await assert.rejects(
            async () => await this.mjolnir.setProtectionSettings("BasicFloodingProtection", {"maxPerMinute": "soup"}),
            ProtectionSettingValidationError
        );
    });
    it("Mjolnir successfully saves valid protection setting values", async function() {
        this.timeout(20000);

        PROTECTIONS["05OVMS"] = {
            description: "A test protection",
            factory: () => new class implements IProtection {
                name = "05OVMS";
                async handleEvent(mjolnir: Mjolnir, roomId: string, event: any) {};
                settings = { test: new NumberProtectionSetting(3) };
            }
        };

        await this.mjolnir.setProtectionSettings("05OVMS", { test: 123 });
        assert.equal(
            (await this.mjolnir.getProtectionSettings("05OVMS"))["test"],
            123
        );
    });
    it("Mjolnir should accumulate changed settings", async function() {
        this.timeout(20000);

        PROTECTIONS["HPUjKN"] = {
            description: "A test protection",
            factory: () => new class implements IProtection {
                name = "HPUjKN";
                async handleEvent(mjolnir: Mjolnir, roomId: string, event: any) {};
                settings = {
                    test1: new NumberProtectionSetting(3),
                    test2: new NumberProtectionSetting(4)
                };
            }
        };

        await this.mjolnir.setProtectionSettings("HPUjKN", { test1: 1 });
        await this.mjolnir.setProtectionSettings("HPUjKN", { test2: 2 });
        const settings = await this.mjolnir.getProtectionSettings("HPUjKN");
        assert.equal(settings["test1"], 1);
        assert.equal(settings["test2"], 2);
    });
    it("Mjolnir responds to !set correctly", async function() {
        this.timeout(20000);
        await client.joinRoom(config.managementRoom);

        PROTECTIONS["JY2TPN"] = {
            description: "A test protection",
            factory: () => new class implements IProtection {
                name = "JY2TPN";
                async handleEvent(mjolnir: Mjolnir, roomId: string, event: any) {};
                settings = { test: new StringProtectionSetting() };
            }
        };


        let reply = new Promise((resolve, reject) => {
            client.on('room.message', noticeListener(this.mjolnir.managementRoomId, (event) => {
                if (event.content.body.includes("Changed JY2TPN.test ")) {
                    resolve(event);
                }
            }))
        });

        await client.sendMessage(this.mjolnir.managementRoomId, {msgtype: "m.text", body: "!mjolnir config set JY2TPN.test asd"})
        await reply

        const settings = await this.mjolnir.getProtectionSettings("JY2TPN");
        assert.equal(settings["test"], "asd");
    });
    it("Mjolnir adds a value to a list setting", async function() {
        this.timeout(20000);
        await client.joinRoom(config.managementRoom);

        PROTECTIONS["r33XyT"] = {
            description: "A test protection",
            factory: () => new class implements IProtection {
                name = "r33XyT";
                async handleEvent(mjolnir: Mjolnir, roomId: string, event: any) {};
                settings = { test: new StringListProtectionSetting() };
            }
        };


        let reply = new Promise((resolve, reject) => {
            client.on('room.message', noticeListener(this.mjolnir.managementRoomId, (event) => {
                if (event.content.body.includes("Changed r33XyT.test ")) {
                    resolve(event);
                }
            }))
        });

        await client.sendMessage(this.mjolnir.managementRoomId, {msgtype: "m.text", body: "!mjolnir config add r33XyT.test asd"})
        await reply

        assert.deepEqual(await this.mjolnir.getProtectionSettings("r33XyT"), { "test": ["asd"] });
    });
    it("Mjolnir removes a value from a list setting", async function() {
        this.timeout(20000);
        await client.joinRoom(config.managementRoom);

        PROTECTIONS["oXzT0E"] = {
            description: "A test protection",
            factory: () => new class implements IProtection {
                name = "oXzT0E";
                async handleEvent(mjolnir: Mjolnir, roomId: string, event: any) {};
                settings = { test: new StringListProtectionSetting() };
            }
        };


        let reply = new Promise((resolve, reject) => {
            let i = 0;
            client.on('room.message', noticeListener(this.mjolnir.managementRoomId, (event) => {
                if (event.content.body.includes("Changed oXzT0E.test ")) {
                    if (++i == 2) {
                        resolve(event);
                    }
                }
            }))
        });

        await client.sendMessage(this.mjolnir.managementRoomId, {msgtype: "m.text", body: "!mjolnir config add oXzT0E.test asd"})
        await client.sendMessage(this.mjolnir.managementRoomId, {msgtype: "m.text", body: "!mjolnir config remove oXzT0E.test asd"})
        await reply

        assert.deepEqual(await this.mjolnir.getProtectionSettings("oXzT0E"), { "test": [] });
    });
});

