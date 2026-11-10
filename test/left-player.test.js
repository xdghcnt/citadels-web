"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const init = require("../module");
const setup = require("../public/setup");

function createRoom() {
    let GameState;
    const messages = [];
    class RoomState extends EventEmitter {
        constructor() { super(); this.room = {}; this.eventHandlers = {}; }
    }
    init({app: {use() {}, get() {}}, users: {RoomState, handleAppPage() {}, createRoomManager(path, State) { GameState = State; }}, static() {}}, "/test");
    const game = new GameState("host", {}, {
        send(target, event, data) { messages.push({target, event, data}); }
    }, {games: {citadels: {id: "test"}}, authUsers: {processAchievement() {}},
        achievements: {win100Citadels: {id: "win"}, winGames: {id: "games"}}});
    return {game, messages};
}

const targets = (message) => message.target && message.target.forEach ? [...message.target] : [message.target];

test("a player who left the room gets nothing from it, while their seat keeps playing", () => {
    const {game, messages} = createRoom();
    ["host", "p1", "p2", "p3"].forEach((userId, slot) => {
        game.userJoin({userId, userName: userId});
        game.userEventHandlers["players-join"](userId, slot);
    });
    const chars = Array.from({length: 8}, (_, i) => (i + 1) + "_1");
    game.userEventHandlers["start-game"]("host", chars, [], null, setup.normalizeTimerSettings({enabled: false}), setup.getDefaultBasicCounts());
    assert.equal(game.room.phase, 1);
    // p2 went to another room: the engine calls userLeft, the seat stays taken
    game.userLeft("p2");
    messages.length = 0;
    for (let i = 0; i < 4 && game.room.phase === 1; i++) {
        const slot = game.room.currentPlayer;
        game.slotEventHandlers["take-character"](slot, 0);
    }
    assert.ok(messages.some(message => message.event === "player-state"), "the game went on");
    const leaked = messages.filter(message => targets(message).includes("p2"));
    assert.deepEqual(leaked.map(message => message.event), []);
    game.clearTurnTimer();
});
