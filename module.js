function init(wsServer, path) {
    const
        express = require('express'),
        app = wsServer.app,
        registry = wsServer.users,
        EventEmitter = require("events"),
        utils = require('./utils'),
        channel = "citadels";

    registry.handleAppPage(path, `${__dirname}/public/app.html`);

    app.use("/citadels", express.static(`${__dirname}/public`));

    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/public/app.html');
    });

    class GameState extends wsServer.users.RoomState {
        constructor(hostId, hostData, userRegistry) {
            super(hostId, hostData, userRegistry);
            const room = {
                inited: true,
                hostId: hostId,
                playerSlots: Array(7).fill(null),
                playerNames: {},
                onlinePlayers: new JSONSet(),
                spectators: new JSONSet(),
                teamsLocked: false,
                phase: 0,
                currentPlayer: null,
                currentCharacter: 0,

                playerGold: {},
                playerHand: {},
                playerDistricts: {},
                playerCharacter: {},
                playerScore: {}
            };
            this.room = room;
            this.lastInteraction = new Date();
            const state = {
                players: {},
                districtDeck: [],
                characterDeck: [],
                characterRoles: {}
            };
            const players = state.players;
            this.state = state;
            const
                send = (target, event, data) => userRegistry.send(target, event, data),
                update = () => send(room.onlinePlayers, "state", room),
                sendSlot = (slot, event, data) => send(room.playerSlots[slot], event, data),
                sendState = (user) => {
                    const slot = room.playerSlots.indexOf(user);
                    if (players[slot]) {
                        send(user, "player-state", players[slot]);
                    } else send(user, "player-state", {})
                },
                updateState = () => [...room.onlinePlayers].forEach(sendState),
                sendStateSlot = (slot) => sendState(room.playerSlots[slot]),
                getRandomPlayer = () => {
                    const res = [];
                    room.playerSlots.forEach((user, slot) => {
                        if (user !== null)
                            res.push(slot);
                    });
                    return utils.shuffle(res)[0];
                },
                getNextPlayer = () => {
                    let slot = room.currentPlayer;
                    slot++;
                    while (!players[slot]) {
                        if (slot === 7)
                            slot = 0;
                        else
                            slot++;
                    }
                    return slot;
                },
                startGame = () => {
                    state.playersCount = room.playerSlots.filter((user) => user !== null).length;
                    if (state.playersCount > 1) {
                        room.playerGold = {};
                        room.playerHand = {};
                        room.playerDistricts = {};
                        room.playerCharacter = {};
                        room.playerScore = {};
                        room.teamsLocked = true;
                        state.districtDeck = utils.createDeck();
                        if (room.winnerPlayer != null)
                            utils.shuffle(room.playerSlots);
                        room.playerSlots.forEach((player, slot) => {
                            if (player != null) {
                                players[slot] = {
                                    hand: state.districtDeck.splice(0, 4)
                                };
                                room.playerGold[slot] = 2;
                                room.playerHand[slot] = 4;
                                room.playerDistricts[slot] = [];
                                room.playerCharacter[slot] = [];
                                room.playerScore[slot] = 0;
                            } else
                                delete players[slot];
                        });

                        room.king = getRandomPlayer();
                        room.ender = null;
                        room.winnerPlayer = null;
                        state.maxDistricts = state.playersCount < 4 ? 8 : 7;
                        newRound();
                    }
                },
                newRound = () => {
                    room.phase = 1;
                    room.currentCharacter = 0;
                    state.characterDeck = [1, 2, 3, 4, 5, 6, 7, 8];
                    room.characterFace = [];

                    let discard = state.playersCount === 7 || state.playersCount < 4 ? 0 : 6 - state.playersCount;
                    while (room.characterFace.length < discard) {
                        let rnd = Math.floor(Math.random() * state.characterDeck.length);
                        if (state.characterDeck[rnd] !== 4)
                            room.characterFace.push(...state.characterDeck.splice(rnd, 1));
                    }

                    let rnd = Math.floor(Math.random() * state.characterDeck.length);
                    state.discarded = state.characterDeck.splice(rnd, 1);

                    Object.keys(players).forEach(slot => {
                        players[slot].character = [];
                        room.playerCharacter[slot] = [];
                    });
                    state.characterRoles = {};

                    room.assassined = null;
                    room.robbed = null;
                    room.currentPlayer = room.king;
                    players[room.currentPlayer].action = 'choose';
                    players[room.currentPlayer].choose = state.characterDeck;
                    update();
                    updateState();
                },
                nextChoose = () => {
                    players[room.currentPlayer].action = null;
                    players[room.currentPlayer].choose = null;
                    sendStateSlot(room.currentPlayer);
                    if (state.characterDeck.length > 1) {
                        room.currentPlayer = getNextPlayer();
                        players[room.currentPlayer].action = 'choose';
                        players[room.currentPlayer].choose = state.characterDeck;
                        update();
                        sendStateSlot(room.currentPlayer);
                    } else if (state.playersCount === 7 && state.discarded) {
                        state.characterDeck.push(state.discarded);
                        state.characterDeck.sort((a, b) => a - b);
                        state.discarded = null;
                        room.currentPlayer = getNextPlayer();
                        players[room.currentPlayer].action = 'choose';
                        players[room.currentPlayer].choose = state.characterDeck;
                        update();
                        sendStateSlot(room.currentPlayer);
                    } else {
                        room.phase = 2;
                        nextCharacter();
                    }
                },
                nextChoose2 = () => {
                    switch (state.characterDeck.length) {
                        case 6:
                        case 4:
                        case 2:
                            players[room.currentPlayer].action = null;
                            players[room.currentPlayer].choose = null;
                            sendStateSlot(room.currentPlayer);
                            room.currentPlayer = getNextPlayer();
                            players[room.currentPlayer].action = 'choose';
                            players[room.currentPlayer].choose = state.characterDeck;
                            update();
                            sendStateSlot(room.currentPlayer);
                            break;
                        case 5:
                        case 3:
                            players[room.currentPlayer].action = 'discard';
                            update();
                            sendStateSlot(room.currentPlayer);
                            break;
                        case 1:
                            players[room.currentPlayer].action = null;
                            players[room.currentPlayer].choose = null;
                            sendStateSlot(room.currentPlayer);
                            room.phase = 2;
                            nextCharacter();
                    }
                },
                nextCharacter = () => {
                    room.currentCharacter++;
                    if (room.currentCharacter > 8) return endRound();
                    room.currentPlayer = state.characterRoles[room.currentCharacter];
                    if (room.currentPlayer == undefined || room.assassined === room.currentCharacter) return nextCharacter();
                    room.playerCharacter[room.currentPlayer][players[room.currentPlayer].character.indexOf(room.currentCharacter)] = room.currentCharacter;

                    if (room.robbed === room.currentCharacter) {
                        let gold = room.playerGold[room.currentPlayer];
                        room.playerGold[room.currentPlayer] = 0;
                        countPoints(room.currentPlayer);
                        room.playerGold[state.characterRoles[2]] += gold;
                        countPoints(state.characterRoles[2]);
                    }

                    room.buildDistincts = 1;
                    room.tookResource = false;
                    switch (room.currentCharacter) {
                        case 4:
                        case 5:
                        case 6:
                        case 8:
                            room.incomeAction = true;
                            break;
                        default:
                            room.incomeAction = false;
                            break;
                    }
                    players[room.currentPlayer].action = null;
                    switch (room.currentCharacter) {
                        case 1:
                            players[room.currentPlayer].action = 'assassin-action';
                            break;
                        case 2:
                            players[room.currentPlayer].action = 'thief-action';
                            break;
                        case 3:
                            players[room.currentPlayer].action = 'magician-action';
                            break;
                        case 4:
                            room.king = room.currentPlayer;
                            break;
                        case 6:
                            room.playerGold[room.currentPlayer] += 1;
                            countPoints(room.currentPlayer);
                            break;
                        case 7:
                            room.playerHand[room.currentPlayer] += 2;
                            players[room.currentPlayer].hand.push(...state.districtDeck.splice(0, 2));
                            room.buildDistincts = 3;
                            countPoints(room.currentPlayer);
                            break;
                        case 8:
                            players[room.currentPlayer].action = 'warlord-action';
                            break;
                    }

                    update();
                    sendStateSlot(room.currentPlayer);
                },
                endRound = () => {
                    room.king = '4' in state.characterRoles ? state.characterRoles[4] : room.king;
                    if (room.ender !== null) return endGame();
                    newRound();
                },
                endGame = () => {
                    room.currentPlayer = null;
                    Object.keys(players).forEach(slot => {
                        countPoints(slot);
                        players[slot].character = [];
                        room.playerCharacter[slot] = [];
                    });
                    let maxPoints = 0;
                    for (let i = 1; i <= 8; i++) {
                        if (state.characterRoles[i] !== null)
                            if (room.playerScore[state.characterRoles[i]] >= maxPoints) {
                                maxPoints = room.playerScore[state.characterRoles[i]]
                                room.winnerPlayer = state.characterRoles[i];
                            }
                    }
                    room.phase = 0;
                    update();
                    updateState();
                },
                isComboCity = (slot) => {
                    let type = room.playerDistricts[slot].map(card => utils.distincts[card].type);
                    let types = new Set(type);
                    if (types.size === 4 && include(slot, 18) && type.filter(type => type === 9).length > 1)
                        return true;
                    return types.size === 5;
                },
                countPoints = (slot) => {
                    room.playerScore[slot] = room.playerDistricts[slot].map(card => utils.distincts[card].cost).reduce((a, b) => a + b, 0);
                    room.playerScore[slot] += 3 * isComboCity(slot);
                    if (room.ender == slot) room.playerScore[slot] += 2;
                    if (room.playerDistricts[slot].length >= state.maxDistricts) room.playerScore[slot] += 2;

                    room.playerScore[slot] += 2 * include(slot, 27);
                    room.playerScore[slot] += room.playerHand[slot] * include(slot, 24);
                    room.playerScore[slot] += room.playerGold[slot] * include(slot, 25);
                },
                include = (slot, card) => room.playerDistricts[slot].includes(card),
                removePlayer = (playerId) => {
                    if (room.spectators.has(playerId)) {
                        this.emit("user-kicked", playerId);
                        room.spectators.delete(playerId);
                    } else {
                        room.playerSlots[room.playerSlots.indexOf(playerId)] = null;
                        if (room.onlinePlayers.has(playerId)) {
                            room.spectators.add(playerId);
                            sendState(playerId);
                        }
                    }
                },
                userJoin = (data) => {
                    const user = data.userId;
                    if (!room.playerNames[user])
                        room.spectators.add(user);
                    room.onlinePlayers.add(user);
                    room.playerNames[user] = data.userName.substr && data.userName.substr(0, 60);
                    update();
                    sendState(user);
                },
                userLeft = (user) => {
                    room.onlinePlayers.delete(user);
                    if (room.spectators.has(user))
                        delete room.playerNames[user];
                    room.spectators.delete(user);
                    update();
                },
                userEvent = (user, event, data) => {
                    this.lastInteraction = new Date();
                    try {
                        if (this.userEventHandlers[event])
                            this.userEventHandlers[event](user, data[0], data[1], data[2], data[3]);
                        else if (this.slotEventHandlers[event] && ~room.playerSlots.indexOf(user))
                            this.slotEventHandlers[event](room.playerSlots.indexOf(user), data[0], data[1], data[2], data[3]);
                    } catch (error) {
                        console.error(error);
                        registry.log(error.message);
                    }
                };

            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.slotEventHandlers = {
                "take-character": (slot, value) => {
                    if (room.phase === 1 && slot === room.currentPlayer && players[slot].action === 'choose' && ~state.characterDeck[value]) {
                        let role = state.characterDeck.splice(value, 1)[0];
                        players[slot].character.push(role);
                        room.playerCharacter[slot].push(0);
                        state.characterRoles[role] = slot;
                        state.playersCount == 2 ? nextChoose2() : nextChoose();
                    }
                },
                "discard-character": (slot, value) => {
                    if (room.phase === 1 && slot === room.currentPlayer && players[slot].action === 'discard' && ~state.characterDeck[value]) {
                        state.characterDeck.splice(value, 1)[0];
                        nextChoose2();
                    }
                },
                "take-resources": (slot, res) => {
                    if (room.phase === 2 && slot === room.currentPlayer && !room.tookResource && ~['coins', 'card'].indexOf(res)) {
                        if (res === 'coins') {
                            room.tookResource = true;
                            room.playerGold[slot] += 2;
                        } else {
                            if (!state.districtDeck.length) return;
                            room.tookResource = true;
                            players[slot].choose = state.districtDeck.splice(0, 2 + include(slot, 20));
                            room.phase = 3;
                        }
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "take-card": (slot, card) => {
                    if (room.phase === 3 && slot === room.currentPlayer && ~players[slot].choose[card]) {
                        players[slot].hand.push(...players[slot].choose.splice(card, 1));
                        state.districtDeck.push(...players[slot].choose.splice(0));
                        room.playerHand[slot] += 1;
                        room.tookResource = true;
                        room.phase = 2;
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "take-income": (slot) => {
                    if (room.phase === 2 && slot === room.currentPlayer && room.incomeAction) {
                        room.incomeAction = false;
                        let income = room.playerDistricts[slot].map(card => utils.distincts[card].type)
                                .filter(type => type === room.currentCharacter).length
                            + include(slot, 26);
                        room.playerGold[slot] += income;
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "build": (slot, card) => {
                    if (room.phase === 2 && slot === room.currentPlayer && room.buildDistincts && ~players[slot].hand[card]) {
                        const building = players[slot].hand[card];
                        if (include(slot, building) && !include(slot, 22))
                            return sendSlot(slot, "message", 'You already have this district in city.');
                        const cost = utils.distincts[building].cost - include(slot, 23) * (utils.distincts[building].type === 9);
                        if (room.playerGold[slot] < cost)
                            return sendSlot(slot, "message", `You don't have enough coins (${room.playerGold[slot]}/${cost}).`);
                        room.buildDistincts -= 1;
                        room.playerGold[slot] -= cost;
                        room.playerDistricts[slot].push(...players[slot].hand.splice(card, 1));
                        room.playerHand[slot] -= 1;
                        if (room.ender === null && room.playerDistricts[slot].length >= state.maxDistricts)
                            room.ender = slot;
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "kill-character": (slot, char) => {
                    if (room.phase === 2 && players[slot].action === 'assassin-action' && ~[2, 3, 4, 5, 6, 7, 8].indexOf(char)) {
                        room.assassined = char;
                        players[slot].action = null;
                        update();
                        sendStateSlot(slot);
                    }
                },
                "rob-character": (slot, char) => {
                    if (room.phase === 2 && players[slot].action === 'thief-action' && ~[3, 4, 5, 6, 7, 8].indexOf(char) && room.assassined !== char) {
                        room.robbed = char;
                        players[slot].action = null;
                        update();
                        sendStateSlot(slot);
                    }
                },
                "exchange-hand": (slot, slot_d) => {
                    if (room.phase === 2 && players[slot].action === 'magician-action' && players[slot_d]) {
                        players[slot].action = null;
                        if (slot_d === slot) {
                            let size = players[slot].hand.length;
                            state.districtDeck.push(...players[slot].hand.splice(0));
                            players[slot].hand = state.districtDeck.splice(0, size);
                            sendStateSlot(slot);
                        } else {
                            [players[slot].hand, players[slot_d].hand] = [players[slot_d].hand, players[slot].hand];
                            room.playerHand[slot] = players[slot].hand.length;
                            room.playerHand[slot_d] = players[slot_d].hand.length;
                            countPoints(slot);
                            update();
                            sendStateSlot(slot);
                            sendStateSlot(slot_d);
                        }
                    }
                },
                "destroy": (slot, slot_d, card) => {
                    if (room.phase === 2 && players[slot].action === 'warlord-action' && room.playerDistricts[slot_d][card]) {
                        if (state.characterRoles[5] === slot_d && room.assassined !== 5)
                            return sendSlot(slot, "message", 'You cannot use ability on the Bishop\'s districts.');
                        if (room.playerDistricts[slot_d].length >= state.maxDistricts)
                            return sendSlot(slot, "message", 'You cannot use ability on the completed city.');
                        const building = room.playerDistricts[slot_d][card];
                        if (building === 19)
                            return sendSlot(slot, "message", 'You cannot use ability on the Keep.');
                        const cost = utils.distincts[building].cost - 1 + include(slot_d, 29) * (building !== 29);
                        if (room.playerGold[slot] < cost)
                            return sendSlot(slot, "message", `You don't have enough coins (${room.playerGold[slot]}/${cost}).`);
                        players[slot].action = null;
                        room.playerGold[slot] -= cost;
                        state.districtDeck.push(...room.playerDistricts[slot_d].splice(card, 1));
                        countPoints(slot_d);
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "end-turn": (slot) => {
                    if (room.phase === 2 && slot === room.currentPlayer && room.tookResource) {
                        if (!room.playerGold[slot] && include(slot, 21))
                            room.playerGold[slot] += 1;
                        if (!players[slot].hand.length && include(slot, 28)) {
                            players[slot].hand.push(...state.districtDeck.splice(0, 2));
                            room.playerHand[slot] += 2;
                        }
                        players[slot].action = null;
                        countPoints(slot);
                        sendStateSlot(slot);
                        nextCharacter();
                    }
                }
            };
            this.userEventHandlers = {
                "start-game": (user) => {
                    if (user === room.hostId)
                        startGame();
                },
                "toggle-lock": (user) => {
                    if (user === room.hostId)
                        room.teamsLocked = !room.teamsLocked;
                    update();
                },
                "players-join": (user, slot) => {
                    if (!room.teamsLocked && room.playerSlots[slot] === null) {
                        if (~room.playerSlots.indexOf(user))
                            room.playerSlots[room.playerSlots.indexOf(user)] = null;
                        room.playerSlots[slot] = user;
                        players[slot] = players[slot] || {};
                        room.spectators.delete(user);
                        update();
                        sendState(user)
                    }
                },
                "spectators-join": (user) => {
                    if (!room.teamsLocked && ~room.playerSlots.indexOf(user)) {
                        room.playerSlots[room.playerSlots.indexOf(user)] = null;
                        room.spectators.add(user);
                        update();
                        sendState(user);
                    }
                },
                "remove-player": (user, playerId) => {
                    if (room.hostId === user && playerId)
                        removePlayer(playerId);
                    update();
                },
                "give-host": (user, playerId) => {
                    if (room.hostId === user && playerId) {
                        room.hostId = playerId;
                        this.emit("host-changed", user, playerId);
                    }
                    update();
                },
                "change-name": (user, value) => {
                    if (value)
                        room.playerNames[user] = value.substr && value.substr(0, 60);
                    update();
                }
            };
        }

        getPlayerCount() {
            return Object.keys(this.room.playerNames).length;
        }

        getActivePlayerCount() {
            return this.room.onlinePlayers.size;
        }

        getLastInteraction() {
            return this.lastInteraction;
        }

        getSnapshot() {
            return {
                room: this.room,
                state: this.state
            };
        }

        setSnapshot(snapshot) {
            Object.assign(this.room, snapshot.room);
            Object.assign(this.state, snapshot.state);
            this.room.onlinePlayers = new JSONSet();
            this.room.spectators = new JSONSet();
            this.room.onlinePlayers.clear();
        }
    }

    class JSONSet extends Set {
        constructor(iterable) {
            super(iterable)
        }

        toJSON() {
            return [...this]
        }
    }

    registry.createRoomManager(path, channel, GameState);
}

module.exports = init;
