//const React = require('react');
//const ReactDOM = require('react-dom');
//const io = require('socket.io');
function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class Player extends React.Component {
    render() {
        const
            data = this.props.data,
            game = this.props.game,
            id = this.props.id,
            isHost = data.userId === data.hostId,
            hasPlayer = id !== null;
        return (
            <div className={
                "player"
                + (!~data.onlinePlayers.indexOf(id) && hasPlayer ? " offline" : "")
                + (id === data.userId ? " self" : "")
            }
                 onTouchStart={(e) => e.target.focus()}
                 data-playerId={id}>
                {hasPlayer
                    ? data.playerNames[id]
                    : (data.teamsLocked
                        ? (<div className="slot-empty">Empty</div>)
                        : (<div className="join-slot-button"
                                onClick={() => this.props.handlePlayerJoin(this.props.slot)}>Seat</div>))}
                {hasPlayer
                    ? (<div className="player-host-controls">
                        {isHost && data.userId !== id ?
                            (<i className="material-icons host-button"
                                title="Give host"
                                onClick={(evt) => game.handleGiveHost(id, evt)}>
                                vpn_key
                            </i>) : ""}
                        {isHost && data.userId !== id ?
                            (<i className="material-icons host-button"
                                title="Remove"
                                onClick={(evt) => game.handleRemovePlayer(id, evt)}>
                                delete_forever
                            </i>) : ""}
                        {(data.hostId === id) ? (
                            <i className="material-icons host-button inactive"
                               title="Game host">
                                stars
                            </i>
                        ) : ""}
                    </div>) : ""}
            </div>
        );
    }
}

class Spectators extends React.Component {
    render() {
        const
            data = this.props.data,
            game = this.props.game,
            handleSpectatorsClick = this.props.handleSpectatorsClick;
        return (
            <div
                onClick={handleSpectatorsClick}
                className="spectators">
                Наблюдают:
                {
                    data.spectators.length ? data.spectators.map(
                        (player, index) => (<Player key={index} data={data} id={player} game={game}/>)) : " ..."
                }
            </div>
        );
    }
}

class Card extends React.Component {
    render() {
        const
            game = this.props.game,
            card = this.props.card,
            cardType = card.type,
            type = this.props.type,
            isToken = this.props.isToken,
            noZoom = card === 0 ? true : this.props.noZoom,
            isCharacter = type === "character",
            backgroundImage = `url(/citadels/${isToken ? "character-tokens" : (isCharacter ? "characters" : "cards")}/${
                isCharacter
                    ? (card !== "0_1" ? card : "card_back")
                    : cardType || "card_back"
            }.jpg)`,
            cardChosen = game.state.cardChosen.includes(this.props.id),
            currentCharacter = game.state.currentCharacter === card,
            isSecretVault = card === "secret_vault";
        return (
            <div className={cs(type, "card-item", {
                "no-zoom": noZoom,
                "card-chosen": cardChosen || currentCharacter,
                "secret-vault": isSecretVault,
                "decoration": card.decoration
            })}
                 style={{"background-image": backgroundImage}}
                 onMouseDown={(e) => card !== "0_1" ? game.handleCardPress(e) : null}
                 onMouseUp={(e) => game.handleCardClick(e, this.props.onClick)}>
                {!noZoom && card !== "0_1" ? (<div className="card-zoom-button material-icons"
                                         onMouseDown={(e) => game.handleCardZoomClick(e)}>search</div>) : ""}
                {!noZoom && card !== "0_1" ? (<div className={`card-item-zoomed ${type}`}
                                         style={{"background-image": backgroundImage}}/>) : ""}
                {card.decoration ? <div className="decoration-coin" style={{top: `${20 * card.cost}px`}}/> : ""}
            </div>
        );
    }
}

class PlayerSlot extends React.Component {
    render() {
        const
            data = this.props.data,
            slot = this.props.slot,
            game = this.props.game,
            player = data.playerSlots[slot],
            districts = data.playerDistricts[slot],
            character = player === data.userId && data.player ? data.player.character : data.playerCharacter[slot],
            magicianAction = data.player && data.player.action === 'magician-action' && data.phase === 2,
            theaterAction = data.player && data.player.action === 'theater-action' && data.phase === 1.5,
            score = data.playerScore[slot],
            isMyTurn = slot === data.currentPlayer,
            isWinner = slot === data.winnerPlayer;
        return (
            <div className={cs(`player-slot`, `player-slot-${slot}`, {
                "my-turn": isMyTurn,
                "winner": isWinner,
                "hasCrown": data.king == slot
            })}>
                <div className="profile">
                    <div className="profile-bg"/>
                    <div className='profile-head'>
                        <div className="profile-name">
                            <Player id={player} data={data} slot={slot}
                                    game={game}
                                    handlePlayerJoin={(slot) => game.handlePlayerJoin(slot)}/>
                        </div>
                    </div>
                    <div className="characters-list">
                        {character && character.map((card, id) => (
                            <div className="character-container">
                                <Card key={id} card={`${card}_1`} type="character" game={game}/>
                            </div>
                        ))}
                        {magicianAction && slot != data.userSlot ?
                            <button onClick={() => game.handleMagician(slot, [])}>Обменяться картами</button>
                            : null}
                        {theaterAction && slot != data.userSlot ?
                            <button onClick={() => game.handleTheater(slot, [])}>Обменяться персонажем</button>
                            : null}
                    </div>
                    {data.playerCharacter[slot] ?
                        <div className='resources'>
                            <div className="rs-block gold">
                                <div className="resource-count">{data.playerGold[slot] || 0}</div>
                            </div>
                            <div className="rs-block hand">
                                <div className="resource-count">{data.playerHand[slot] || 0}</div>
                            </div>
                            {data.king == slot ?
                                <div className="profile-crown"></div>
                                : null}
                        </div>
                        : null}

                </div>
                <div className='districts'>
                    <div className="districts-bg"/>
                    <div className='cards-list'>
                        {districts && districts.map((card, id) => (
                            <Card key={id} card={card} type="card" game={game}
                                  onClick={() => game.handleClickBuilding(slot, id)}/>
                        ))}
                    </div>
                    {score ?
                        <div className="score-block">
                            <div className="score">Score: {score}</div>
                        </div>
                        : null}
                </div>
            </div>
        )
    }
}


class Game extends React.Component {

    componentDidMount() {
        const initArgs = {};
        if (!localStorage.citadelsUserId || !localStorage.citadelsUserToken) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.citadelsUserId = makeId();
            localStorage.citadelsUserToken = makeId();
        }
        if (!location.hash)
            history.replaceState(undefined, undefined, location.origin + location.pathname + "#" + makeId());
        else
            history.replaceState(undefined, undefined, location.origin + location.pathname + location.hash);
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.citadelsUserId;
        initArgs.token = this.userToken = localStorage.citadelsUserToken;
        initArgs.wssToken = window.wssToken;
        initArgs.userName = localStorage.userName;
        this.socket = window.socket.of("citadels");
        this.socket.on("state", (state) => {
            CommonRoom.processCommonRoom(state, this.state, {
                maxPlayers: 7,
                largeImageKey: "citadels",
                details: "Citadels"
            });
            if (this.state && this.state.currentPlayer !== this.state.userSlot && state.currentPlayer === this.state.userSlot)
                this.turnSound.play();
            this.setState(Object.assign({
                userId: this.userId,
                userSlot: state.playerSlots.indexOf(this.userId)
            }, state));
        });
        this.socket.on("player-state", (player) => {
            this.setState(Object.assign(this.state, {
                player: player
            }));
        });
        this.socket.on("prompt-delete-prev-room", (roomList) => {
            if (localStorage.acceptDelete =
                prompt(`Limit for hosting rooms per IP was reached: ${roomList.join(", ")}. Delete one of rooms?`, roomList[0]))
                location.reload();
        });
        this.socket.on("ping", (id) => {
            this.socket.emit("pong", id);
        });
        this.socket.on("message", (text) => {
            popup.alert({content: text});
        })
        window.socket.on("disconnect", (event) => {
            this.setState({
                inited: false,
                disconnected: true,
                disconnectReason: event.reason
            });
        });
        document.title = `Citadels - ${initArgs.roomId}`;
        this.socket.emit("init", initArgs);
        this.turnSound = new Audio("/citadels/chime.mp3");
        this.turnSound.volume = 0.8;
    }

    constructor() {
        super();
        this.state = {
            inited: false,
            userAction: null,
            cardChosen: []
        };
    }

    handleSpectatorsClick() {
        this.socket.emit("spectators-join");
    }

    handlePlayerJoin(seat) {
        this.socket.emit("players-join", seat);
    }

    handleActionCharacter(char) {
        this.state.player.action === 'choose' ?
            this.socket.emit("take-character", char) :
            this.socket.emit("discard-character", char);
    }

    handleTakeResource(res) {
        this.socket.emit('take-resources', res)
    }

    handleTakeCard(card) {
        this.socket.emit("take-card", card);
    }

    handleTakeIncome() {
        this.socket.emit('take-income')
    }

    handleBuild(card) {
        this.socket.emit('build', card)
    }

    handleTheater(slot) {
        this.socket.emit('theater-action', slot)
    }

    handleForgery() {
        this.socket.emit('forgery-action')
    }

    handleAssassined(char) {
        this.socket.emit("kill-character", char);
    }

    handleRob(char) {
        this.socket.emit("rob-character", char);
    }

    handleMagician(slot, cards) {
        this.socket.emit('exchange-hand', slot, cards);
        this.handleMagicianOff();
    }

    handleMagicianOn() {
        this.setState(Object.assign(this.state, {
            userAction: 'magician',
            cardChosen: []
        }));
    }

    handleArsenalOn() {
        this.setState(Object.assign(this.state, {
            userAction: 'arsenal',
            cardChosen: []
        }));
    }

    handleMagicianOff() {
        this.setState(Object.assign(this.state, {
            userAction: null,
            cardChosen: []
        }));
    }

    handleMagicalCard(id) {
        let _cardChosen = new Set(this.state.cardChosen);
        _cardChosen.has(id) ? _cardChosen.delete(id) : _cardChosen.add(id);
        this.setState(Object.assign(this.state, {
            cardChosen: [..._cardChosen]
        }));
    }

    handleClickBuilding(slot, card) {
        if (this.state.userAction === 'arsenal') {
            this.socket.emit("arsenal-destroy", slot, card);
            this.handleMagicianOff();
        }
        if (this.state.player.action === 'warlord-action') this.socket.emit("destroy", slot, card);
        if (this.state.player.action === 'artist-action') this.socket.emit("beautify", slot, card);
    }

    handleEndTurn() {
        this.socket.emit('end-turn')
    }

    handleClickTogglePause() {
        if (this.state.phase === 0) {
            const
                playerCount = this.state.playerSlots && this.state.playerSlots.filter((slot) => slot !== null).length,
                getNineCharacterAvailable = (set) => (playerCount === 2
                    ? []
                    : [`9_${set}`]),
                getNineCharacterSelected = (set) => ([3, 8].includes(playerCount)
                    ? [`9_${set}`]
                    : []);

            this.setState({
                ...this.state,
                createGamePanel: {
                    charactersAvailable: [
                        "1_1", "2_1", "3_1", "4_1", "5_1", "6_1", "7_1", "8_1", ...getNineCharacterAvailable(1)
                    ],
                    charactersSelected: [
                        "1_1", "2_1", "3_1", "4_1", "5_1", "6_1", "7_1", "8_1", ...getNineCharacterSelected(1)
                    ]
                }
            });
        }
    }

    handleClickCreateGame() {
        this.socket.emit("start-game", this.state.createGamePanel.charactersSelected);
        this.handleClickCloseCreateGame();
    }

    handleClickCloseCreateGame() {
        this.setState({
            ...this.state,
            createGamePanel: null
        });
    }

    handleClickCharacter(set, type) {
        const playerCount = this.state.playerSlots && this.state.playerSlots.filter((slot) => slot !== null).length;
        if (set === 1 && type === 9 && playerCount >= 4 && playerCount <= 7) {
            const cardInd = this.state.createGamePanel.charactersSelected.indexOf(`9_1`);
            if (~cardInd)
                this.state.createGamePanel.charactersSelected.splice(cardInd);
            else
                this.state.createGamePanel.charactersSelected.push(`9_1`);
            this.setState(this.state);
        }
    }

    handleClickStop() {
        if (this.state.phase === 0 || confirm("Game will be aborted. Are you sure?"))
            this.socket.emit("abort-game");
    }

    handleToggleTeamLockClick() {
        this.socket.emit("toggle-lock");
    }

    handleClickChangeName() {
        const name = prompt("New name");
        this.socket.emit("change-name", name);
        localStorage.userName = name;
    }

    zoomCard(node) {
        if (this.zoomed) {
            this.zoomed.classList.remove("zoomed");
            this.zoomed = null;
        } else if (node) {
            node.classList.add("zoomed");
            this.zoomed = node;
        }
    }

    handleCardZoomClick(e) {
        e.stopPropagation();
        this.zoomCard(e.target.parentNode);
    }

    handleCardClick(e, clickFunc) {
        if (this.zoomed)
            this.zoomCard();
        else if (clickFunc)
            clickFunc();
    }

    handleCardPress(e) {
        const node = e.target;
        if (!node.classList.contains("no-zoom")) {
            e.stopPropagation();
            this.wasReleased = false;
            clearTimeout(this.holdTimeout);
            this.holdTimeout = setTimeout(() => {
                if (!this.wasReleased)
                    this.zoomCard(node);
            }, 150);
        }
    }

    handleBodyRelease() {
        this.wasReleased = true;
        //this.zoomCard();
    }

    handleRemovePlayer(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Removing ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("remove-player", id));
    }

    handleGiveHost(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Give host ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("give-host", id));
    }

    hasDistricts(building) {
        const data = this.state;
        return data.player && data.playerDistricts[data.userSlot] && data.playerDistricts[data.userSlot].some(card => card.type === building) && data.phase === 2
    }
    render() {
        const
            data = this.state,
            isHost = data.hostId === data.userId,
            playerCount = data.playerSlots && data.playerSlots.filter((slot) => slot !== null).length,
            notEnoughPlayers = data.phase === 0 && playerCount < 2,
            magicianAction = data.player && data.player.action === 'magician-action' && data.phase === 2,
            theaterAction = data.player && data.player.action === 'theater-action' && data.phase === 1.5;

        if (this.state.disconnected)
            return (<div
                className="kicked">Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}</div>);
        else if (this.state.inited) {
            const
                activeSlots = Object.keys(data.playerCharacter),
                slots = (!data.teamsLocked
                    ? (data.phase === 0 ? data.playerSlots
                        .map((value, slot) => !data.teamsLocked ? slot : value) : activeSlots)
                    : activeSlots).map((n) => parseInt(n));
            const districtCardsMinimized = data.player && data.currentPlayer === data.userSlot && ((data.phase === 1)
                || data.phase == 3 || data.phase === 2 && (data.player.action === 'assassin-action' || data.player.action === 'thief-action'));
            return (
                <div
                    className={cs(`game`, {
                        "double-roles": data.phase > 0 && Object.keys(data.playerCharacter).length <= 3,
                        "game-end": data.winnerPlayer != null,
                        "isPlayer": data.playerSlots.includes(data.userId) && data.phase !== 0 && data.winnerPlayer == null
                    })}
                    onMouseUp={(evt) => this.handleBodyRelease(evt)}>
                    {data.phase !== 0 ?
                        <div className="character-section">
                            <div className="cards-list">
                                {data.characterInGame.map((card, id) => (
                                    <div className={~data.characterFace.indexOf(card) ? 'discard' : ''}>
                                        <div className={cs("status", {
                                            assassined: card === data.assassined,
                                            robbed: card === data.robbed
                                        })}>
                                            {card === data.assassined ?
                                                <svg width="485pt" height="403pt" viewBox="0 0 485 403" version="1.1"
                                                     xmlns="http://www.w3.org/2000/svg">
                                                    <g id="#000000ff">
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 22.73 7.73 C 26.17 2.89 32.17 0.05 38.10 0.77 C 44.07 1.16 48.42 5.69 53.02 8.96 C 56.47 11.85 60.64 13.98 63.47 17.55 C 65.47 20.27 63.40 23.42 61.71 25.67 C 51.76 38.76 41.89 51.90 32.01 65.04 C 30.59 67.18 28.32 68.41 26.06 69.48 C 19.14 65.75 13.28 60.46 6.95 55.87 C -0.02 50.70 -1.42 39.70 3.87 32.87 C 10.05 24.41 16.48 16.13 22.73 7.73 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 271.43 10.51 C 280.00 7.94 289.97 14.18 291.27 23.05 C 292.37 28.84 289.90 34.71 286.09 38.99 C 282.45 43.10 277.67 46.82 272.01 47.27 C 267.99 47.53 264.54 44.70 262.59 41.41 C 259.45 36.27 259.06 29.98 259.65 24.13 C 260.27 17.73 265.22 12.08 271.43 10.51 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 214.31 30.50 C 222.54 26.66 233.18 35.11 230.85 44.02 C 228.88 52.58 227.43 61.26 227.04 70.05 C 227.36 74.53 220.57 76.56 218.23 72.81 C 211.23 64.14 206.95 53.14 206.72 41.95 C 206.60 37.04 209.88 32.44 214.31 30.50 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 67.42 38.41 C 69.59 34.73 74.78 34.30 77.81 37.16 C 93.13 48.61 108.36 60.17 123.64 71.68 C 127.18 67.17 130.43 62.44 134.05 57.99 C 137.06 54.08 143.15 53.04 147.27 55.77 C 150.29 57.74 153.14 59.97 155.97 62.21 C 157.73 63.55 159.04 65.57 158.97 67.85 C 158.30 71.05 155.93 73.48 154.07 76.05 C 137.09 98.51 120.21 121.04 103.23 143.50 C 101.44 146.14 97.84 148.03 94.85 146.13 C 91.15 143.94 87.76 141.23 84.52 138.42 C 80.88 135.17 80.50 129.20 83.30 125.31 C 86.62 120.65 90.22 116.20 93.54 111.55 C 78.25 100.20 63.12 88.64 47.89 77.22 C 44.06 75.05 43.25 69.50 46.32 66.34 C 53.41 57.07 60.28 47.63 67.42 38.41 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 286.94 64.84 C 296.61 61.18 306.80 59.12 316.98 57.48 C 323.98 57.29 331.02 56.99 338.01 57.55 C 341.39 58.00 344.74 58.59 348.16 58.70 C 354.00 60.39 360.10 61.12 365.82 63.27 C 399.90 74.93 430.86 95.32 455.52 121.52 C 463.95 130.94 472.74 140.51 477.64 152.35 C 482.47 163.19 485.19 175.06 484.77 186.96 C 484.43 194.31 484.85 201.71 483.82 209.01 C 482.93 217.61 483.71 226.42 481.92 234.88 C 481.65 239.94 481.74 245.00 481.46 250.05 C 479.96 263.48 480.78 277.12 478.23 290.44 C 474.59 303.65 464.65 315.08 451.62 319.66 C 443.79 323.01 434.88 321.80 427.05 325.07 C 420.96 328.05 416.15 333.80 414.64 340.46 C 411.69 352.61 408.84 364.79 405.92 376.95 C 404.28 383.59 403.39 391.09 398.15 396.05 C 395.31 399.43 391.02 400.77 387.09 402.42 C 383.33 402.47 379.56 402.73 375.82 402.36 C 372.84 401.50 371.09 398.76 369.48 396.32 C 369.07 384.89 369.21 373.44 369.50 362.01 C 369.77 354.13 360.71 347.58 353.40 350.69 C 347.87 352.45 344.58 358.35 344.75 363.96 C 344.75 375.06 344.72 386.15 344.79 397.25 C 342.62 399.48 340.60 402.95 337.00 402.51 C 331.69 402.52 326.38 402.53 321.08 402.51 C 316.61 402.79 312.37 398.95 312.42 394.41 C 311.72 382.94 313.21 371.42 312.03 359.96 C 311.29 354.97 306.87 350.98 302.01 350.09 C 295.41 349.02 288.44 354.15 287.85 360.90 C 287.08 372.27 287.81 383.68 287.47 395.06 C 287.51 398.64 284.30 401.56 281.03 402.37 C 276.58 402.63 271.91 403.00 267.67 401.33 C 261.50 399.16 256.32 394.11 254.28 387.86 C 252.20 381.33 251.22 374.51 249.43 367.90 C 247.09 359.02 245.18 350.03 243.00 341.12 C 241.13 332.12 233.30 324.50 224.12 323.32 C 220.07 322.68 216.05 321.82 211.94 321.56 C 199.34 318.73 188.04 310.31 182.33 298.65 C 176.55 287.00 177.33 273.71 176.05 261.11 C 175.44 248.44 174.64 235.76 174.50 223.08 C 191.62 229.82 208.82 236.37 225.92 243.18 C 230.28 244.72 232.86 248.81 236.14 251.80 C 242.90 259.07 254.08 261.92 263.47 258.63 C 269.07 256.78 273.72 253.02 278.10 249.19 C 294.44 235.07 307.68 216.86 314.02 196.07 C 317.18 183.35 309.36 168.97 296.92 164.79 C 291.25 162.44 284.02 162.23 280.29 156.67 C 265.00 135.45 249.93 114.07 234.78 92.76 C 250.76 81.10 268.40 71.73 286.94 64.84 M 357.90 165.82 C 346.88 171.16 340.31 184.51 343.49 196.46 C 350.71 219.44 366.13 239.22 385.07 253.82 C 391.68 259.02 400.75 261.48 408.95 259.02 C 418.33 256.64 424.81 248.76 430.34 241.34 C 437.82 230.39 443.47 217.50 443.53 204.06 C 443.46 192.70 434.53 184.07 425.64 178.30 C 416.37 172.29 405.89 168.12 395.03 166.09 C 388.44 164.44 381.67 163.50 374.89 163.23 C 369.13 162.13 363.12 163.22 357.90 165.82 M 324.29 244.43 C 321.35 245.53 319.43 248.22 317.85 250.80 C 312.08 260.76 307.06 271.20 303.45 282.14 C 300.50 291.37 307.33 302.16 316.96 303.27 C 324.28 303.66 331.63 303.58 338.96 303.36 C 349.62 303.26 357.47 290.86 353.56 281.08 C 349.57 269.84 344.63 258.86 338.30 248.74 C 335.55 244.02 329.21 242.50 324.29 244.43 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 170.38 77.49 C 173.21 76.70 176.13 77.99 178.33 79.73 C 212.04 107.78 244.39 137.63 273.21 170.73 C 276.72 174.85 281.43 179.00 281.24 184.90 C 280.74 193.94 280.39 203.03 281.18 212.07 C 281.58 216.04 279.15 220.00 275.40 221.37 C 267.99 224.31 260.70 227.57 253.91 231.78 C 249.62 234.59 244.12 234.76 239.60 232.39 C 196.05 212.88 154.90 188.34 115.66 161.27 C 111.78 158.99 111.09 153.32 113.79 149.88 C 118.08 143.83 122.76 138.07 127.12 132.08 C 128.85 129.88 130.64 126.65 133.98 127.50 C 136.89 128.47 139.09 130.84 141.59 132.56 C 178.87 160.34 217.72 186.26 259.04 207.67 C 259.71 206.47 261.08 205.50 261.08 204.02 C 260.11 202.33 258.70 200.95 257.38 199.54 C 225.09 166.62 189.88 136.65 152.99 109.02 C 150.86 107.58 148.37 104.93 149.90 102.21 C 153.96 95.91 158.89 90.22 163.25 84.13 C 165.25 81.60 167.00 78.32 170.38 77.49 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 107.44 210.66 C 123.04 207.42 139.60 211.00 153.39 218.67 C 156.66 220.30 158.05 224.84 155.99 227.93 C 154.48 230.49 151.35 231.09 148.68 231.72 C 138.82 233.73 129.24 236.97 120.00 240.95 C 114.47 243.37 107.49 243.26 102.65 239.36 C 97.49 235.54 94.75 228.62 96.42 222.34 C 97.91 217.01 102.06 212.26 107.44 210.66 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 139.37 261.46 C 143.97 260.67 149.52 260.31 153.18 263.78 C 156.92 267.02 158.02 272.27 157.94 277.02 C 157.65 284.56 155.38 292.42 149.97 297.92 C 145.40 302.65 138.20 304.01 131.92 302.81 C 121.29 300.73 114.48 288.23 118.15 278.10 C 121.40 269.17 130.35 263.35 139.37 261.46 Z"/>
                                                    </g>
                                                </svg>
                                                : null}
                                            {card === data.robbed ?
                                                <svg width="849pt" height="794pt" viewBox="0 0 849 794" version="1.1"
                                                     xmlns="http://www.w3.org/2000/svg">
                                                    <g id="#000000ff">
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 118.90 3.45 C 132.77 0.85 146.94 0.32 161.01 1.00 C 189.34 0.90 217.67 1.24 246.00 0.74 C 300.68 0.75 355.36 0.76 410.04 0.74 C 433.37 1.37 456.72 0.70 480.05 1.13 C 494.57 3.23 509.19 5.83 522.85 11.38 C 533.31 14.84 543.31 21.61 548.44 31.60 C 553.63 45.29 556.74 59.65 559.79 73.95 C 564.65 93.45 567.71 113.34 571.47 133.08 C 576.18 158.47 581.00 183.87 587.42 208.90 C 596.96 244.51 606.12 280.23 615.59 315.86 C 617.69 324.42 619.82 332.98 622.50 341.38 C 623.98 350.99 623.74 360.87 622.33 370.48 C 617.84 393.69 612.82 416.82 606.37 439.58 C 603.46 451.72 599.58 463.60 596.64 475.74 C 594.67 481.79 594.09 488.34 590.87 493.93 C 588.03 499.02 585.79 504.48 582.14 509.07 C 573.76 503.65 564.21 500.73 554.94 497.26 C 534.80 490.39 513.33 488.53 492.16 489.00 C 494.48 482.93 497.79 477.33 500.53 471.47 C 501.66 469.09 503.31 467.02 504.96 464.98 C 504.58 460.25 504.82 455.47 505.83 450.82 C 507.32 444.30 506.59 437.55 507.20 430.94 C 507.56 427.65 508.49 424.46 508.72 421.15 C 509.73 409.30 512.05 397.63 514.25 385.95 C 515.27 380.17 516.80 374.50 518.48 368.88 C 514.68 360.20 510.37 351.74 505.40 343.67 C 500.60 334.98 496.27 326.03 491.88 317.13 C 489.33 310.45 487.16 303.60 485.52 296.63 C 483.46 288.55 481.14 280.41 481.03 272.02 C 480.84 270.62 481.31 268.94 480.20 267.84 C 477.59 264.69 473.94 262.70 470.57 260.49 C 461.93 255.05 453.50 249.20 444.29 244.73 C 439.87 242.10 434.61 239.75 429.42 241.52 C 422.62 245.22 418.76 252.26 413.90 257.98 C 402.67 273.81 389.89 288.65 380.88 305.93 C 374.06 319.98 368.92 334.84 365.64 350.11 C 364.74 354.16 366.02 358.23 366.80 362.19 C 369.67 375.60 376.14 387.81 381.83 400.18 C 386.58 407.73 390.99 415.49 395.86 422.99 C 400.11 431.12 406.31 437.94 411.40 445.52 C 416.80 453.17 424.87 458.24 432.53 463.34 C 447.90 473.77 463.90 483.73 476.72 497.35 C 488.52 508.34 499.70 520.36 507.29 534.71 C 510.87 541.76 514.64 548.83 516.57 556.54 C 519.38 567.12 519.72 578.20 518.98 589.06 C 517.41 595.00 514.99 601.04 510.28 605.23 C 503.96 611.48 494.68 614.43 485.90 612.94 C 477.47 612.01 470.23 607.33 462.38 604.55 C 454.65 601.61 447.64 597.12 440.06 593.83 C 427.96 588.03 416.20 581.55 404.07 575.80 C 394.89 571.20 386.26 565.58 377.01 561.10 C 370.19 556.88 362.93 553.37 356.41 548.67 C 346.13 541.43 336.65 532.94 328.91 523.00 C 321.29 513.37 311.63 505.66 303.46 496.53 C 295.56 487.43 287.34 478.57 278.14 470.77 C 273.60 467.05 269.71 462.62 265.26 458.79 C 241.29 437.37 213.44 421.12 186.95 403.13 C 183.20 400.59 179.34 398.17 175.91 395.20 C 168.51 388.90 160.56 383.26 153.40 376.69 C 150.75 374.25 148.40 371.50 145.51 369.33 C 138.01 363.63 131.35 356.93 124.92 350.07 C 117.93 342.71 109.94 336.42 102.54 329.50 C 92.65 320.43 83.27 310.77 74.72 300.42 C 71.57 296.52 67.54 293.44 64.39 289.55 C 60.03 284.32 55.74 279.03 51.14 274.01 C 38.43 256.84 22.45 241.42 15.21 220.86 C 8.06 201.95 3.59 181.95 2.42 161.75 C -0.28 146.95 0.64 131.76 3.20 117.02 C 6.90 93.76 15.70 71.09 30.29 52.46 C 34.86 46.68 39.26 40.57 45.36 36.30 C 57.48 26.41 70.59 17.34 85.59 12.47 C 96.24 7.98 107.63 5.78 118.90 3.45 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 569.74 46.20 C 573.28 47.28 576.80 48.44 580.24 49.79 C 607.98 62.20 636.28 73.38 664.58 84.48 C 669.63 86.35 673.66 90.00 677.97 93.09 C 708.34 115.41 738.90 137.46 769.26 159.79 C 772.46 162.19 775.98 164.30 778.48 167.49 C 800.47 195.83 822.61 224.05 844.69 252.31 C 847.41 256.21 848.15 261.05 849.00 265.62 L 849.00 269.53 C 848.17 274.29 846.33 279.29 842.36 282.32 C 836.86 286.41 829.76 287.41 823.10 287.94 C 806.55 288.70 790.19 283.84 775.45 276.60 C 772.76 268.29 768.49 260.64 765.47 252.47 C 757.12 234.85 751.91 215.23 738.72 200.35 C 732.72 193.63 727.54 186.18 720.91 180.04 C 713.42 172.84 705.01 166.65 697.79 159.16 C 672.76 137.17 646.89 116.10 622.00 93.92 C 614.89 89.17 609.89 82.02 602.89 77.13 C 597.80 73.60 593.65 68.98 589.41 64.53 C 583.17 58.06 574.76 53.85 569.74 46.20 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 575.78 73.72 C 582.86 77.97 587.18 85.38 594.09 89.84 C 600.29 93.88 604.37 100.34 610.52 104.45 C 613.88 106.65 616.84 109.38 619.53 112.36 C 622.91 116.13 627.47 118.49 631.15 121.92 C 633.24 123.79 635.13 125.87 637.21 127.76 C 646.73 135.20 655.58 143.45 664.98 151.05 C 671.67 156.40 677.59 162.64 684.55 167.66 C 691.29 173.11 696.55 180.21 703.63 185.27 C 710.71 190.52 716.28 197.42 721.76 204.24 C 726.30 208.81 730.30 213.89 733.61 219.42 C 739.89 228.64 742.65 239.61 747.51 249.56 C 749.76 253.83 750.89 258.59 753.17 262.85 C 755.60 267.29 756.78 272.27 759.14 276.75 C 761.65 281.50 763.00 286.76 765.44 291.56 C 768.03 296.48 769.55 301.87 772.11 306.81 C 774.67 311.79 776.08 317.27 778.78 322.19 C 781.57 327.35 783.09 333.07 785.78 338.28 C 789.47 345.38 790.98 353.30 793.04 360.96 C 796.76 375.89 798.26 391.24 800.26 406.47 C 802.30 420.21 800.61 434.13 801.27 447.95 C 801.51 456.97 799.40 466.19 794.85 474.01 C 790.94 479.60 785.21 485.13 777.95 485.23 C 773.75 485.25 769.48 485.38 765.36 484.59 C 759.69 482.63 753.74 480.95 748.98 477.13 C 737.57 469.36 730.22 457.33 723.25 445.74 C 721.25 442.43 720.27 438.66 718.79 435.13 C 710.16 416.76 705.83 396.58 704.42 376.41 C 690.60 361.19 677.67 344.73 668.98 325.95 C 662.99 314.14 658.46 301.61 655.39 288.74 C 654.84 285.58 654.26 282.40 652.98 279.45 C 639.73 277.23 628.55 269.15 617.05 262.72 C 616.58 256.23 613.67 250.30 612.46 243.97 C 609.63 233.31 607.02 222.60 603.94 212.02 C 601.37 203.11 599.69 193.99 597.18 185.07 C 589.97 147.97 582.69 110.88 575.78 73.72 Z"/>
                                                        <path fill="currentColor" opacity="1.00"
                                                              d=" M 506.10 504.86 C 523.24 504.17 540.20 508.17 556.29 513.75 C 567.60 518.60 578.82 523.91 588.81 531.18 C 593.80 534.52 598.12 538.74 603.02 542.20 C 609.16 546.71 613.31 553.23 618.20 558.94 C 624.19 565.84 628.90 573.71 633.40 581.63 C 637.05 587.49 638.88 594.22 641.63 600.51 C 646.01 613.89 649.77 627.79 649.26 641.99 C 648.97 652.91 650.13 664.01 647.70 674.76 C 646.01 683.47 643.91 692.16 640.46 700.36 C 635.14 716.21 625.73 730.36 615.18 743.20 C 604.07 756.67 589.92 767.31 574.76 775.82 C 556.43 785.94 535.80 791.97 514.89 793.13 C 501.92 793.57 488.82 793.23 476.07 790.66 C 467.71 788.22 459.17 786.30 451.14 782.87 C 432.94 775.60 416.57 764.14 402.72 750.36 C 391.83 739.45 383.17 726.54 375.90 713.01 C 370.91 701.70 366.10 690.13 364.27 677.82 C 359.89 659.29 359.62 639.73 364.18 621.21 C 366.05 606.84 372.20 593.52 378.07 580.42 C 381.74 581.13 385.18 582.61 388.39 584.50 C 396.75 588.68 404.68 593.67 413.02 597.89 C 426.39 604.20 439.27 611.59 453.10 616.92 C 460.78 620.97 469.07 623.63 477.16 626.77 C 484.85 629.72 493.39 629.10 501.26 627.19 C 505.22 626.14 509.37 625.23 512.74 622.77 C 520.84 617.13 528.41 609.79 531.46 600.15 C 536.41 587.01 535.50 572.59 533.04 559.03 C 529.23 542.57 522.11 526.86 511.82 513.43 C 509.69 510.73 507.76 507.87 506.10 504.86 Z"/>
                                                    </g>
                                                </svg>
                                                : null}
                                        </div>
                                        <Card key={id} card={`${card}_1`} type="character" noZoom={true} game={this}
                                              isToken={true}/>
                                    </div>
                                ))}
                            </div>
                        </div>
                        : null}
                    <div className="players-section">
                        {slots.map((slot) => (<PlayerSlot data={data} slot={slot} game={this}/>))}
                    </div>
                    <div className="control-section">
                        {data.player && data.player.hand && data.userAction != 'magician' ?
                            <div className="hand-section">
                                <div className={cs('cards-list', {minimized: districtCardsMinimized})}>
                                    {data.player && data.player.hand && data.player.hand.map((card, id) => (
                                        <Card key={id} card={card} type="card" id={id}
                                              onClick={() => this.handleBuild(id)}
                                              game={this}/>
                                    ))}
                                </div>
                            </div>
                            : null}
                        {data.player && data.currentPlayer === data.userSlot ?
                            <div className="action-section">
                                {data.phase == 1 ?
                                    <div className={
                                        "choose-character"
                                        + (data.player.action === "discard" ? " discard" : "")
                                    }>
                                        <div
                                            className="status-text">{data.player.action === "discard" ? "Сбросьте" : "Выберите себе"} персонажа
                                        </div>
                                        <div className="cards-list">
                                            {data.player && data.player.choose && data.player.choose.map((card, id) => (
                                                <Card key={id} card={`${card}_1`} type="character" game={this}
                                                      onClick={() => this.handleActionCharacter(id)}/>
                                            ))}
                                        </div>
                                    </div>
                                    : null}
                                {data.phase == 2 && data.player.action === 'assassin-action' ?
                                    <div className="choose-character">
                                        <p className="status-text">Выберите персонажа для убийства</p>
                                        <div className="cards-list">
                                            {data.characterInGame.filter(id => !(~data.characterFace.indexOf(id) || id === 1)).map((card, id) => (
                                                <Card key={id} card={`${card}_1`} type="character" game={this}
                                                      onClick={() => this.handleAssassined(card)}/>
                                            ))}
                                        </div>
                                    </div>
                                    : null}
                                {data.phase == 2 && data.player.action === 'thief-action' ?
                                    <div className="status-text" className="choose-character">
                                        <p className="status-text" className="status-text">Выберите персонажа для
                                            воровства</p>
                                        <div className="cards-list">
                                            {data.characterInGame.filter(id => !(~data.characterFace.indexOf(id) || data.assassined === id || id < 3))
                                                .map((card, id) => (
                                                    <Card key={id} card={`${card}_1`} type="character" game={this}
                                                          onClick={() => this.handleRob(card)}/>
                                                ))}
                                        </div>
                                    </div>
                                    : null}
                                {data.phase == 1.5 ?
                                    <div className="action-button">
                                        {theaterAction ?
                                            <button onClick={() => this.handleTheater(data.userSlot)}>Отказаться от театра</button> : null}
                                    </div>
                                    : null}
                                {data.phase == 2 && !data.userAction ?
                                    <div className="action-button">
                                        {!data.tookResource ?
                                            <button onClick={() => this.handleTakeResource('coins')}>Take 2
                                                coins</button> : null}
                                        {!data.tookResource ?
                                            <button onClick={() => this.handleTakeResource('card')}>Take a
                                                card</button> : null}
                                        {magicianAction ?
                                            <button onClick={() => this.handleMagicianOn()}>Сбросить</button> : null}
                                        {this.hasDistricts('arsenal') ?
                                            <button onClick={() => this.handleArsenalOn()}>Исп. Арсенал</button> : null}
                                        {this.hasDistricts('forgery') && data.playerGold[data.userSlot] > 1 && data.forgeryAction ?
                                            <button onClick={() => this.handleForgery()}>Исп. Кузницу</button> : null}
                                        {data.incomeAction ?
                                            <button onClick={() => this.handleTakeIncome()}>Получить
                                                доход</button> : null}
                                        {data.tookResource ?
                                            <button onClick={() => this.handleEndTurn()}>Конец хода</button> : null}
                                    </div>
                                    : null}
                                
                                {data.phase == 3 ?
                                    <div className="choose-card">
                                        <p className="status-text">Выберите карту</p>
                                        <div className="cards-list">
                                            {data.player && data.player.choose && data.player.choose.map((card, id) => (
                                                <Card key={id} card={card} type="card" game={this}
                                                      onClick={() => this.handleTakeCard(id)}/>
                                            ))}
                                        </div>
                                    </div>
                                    : null}
                                {data.userAction ?
                                    <div>
                                        <div className="action-button">
                                            <button onClick={() => this.handleMagicianOff()}>Отмена действия</button>
                                            { data.userAction === 'magician' ? <button
                                                onClick={() => this.handleMagician(data.userSlot, data.cardChosen)}>Применить
                                            </button> : null}
                                        </div>
                                    </div>
                                    : null}
                                {data.userAction === 'magician' ?
                                    <div>
                                        <div className="hand-section">
                                            <div className={cs('cards-list', {minimized: districtCardsMinimized})}>
                                                {data.player && data.player.hand && data.player.hand.map((card, id) => (
                                                    <Card key={id} card={card} type="card" id={id}
                                                          onClick={() => this.handleMagicalCard(id)}
                                                          game={this}/>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    : null}
                            </div>
                            : null}
                    </div>
                    <div className={"spectators-section"
                    + ((data.spectators.length > 0 || !data.teamsLocked) ? " active" : "")
                    }>
                        <Spectators game={this} data={data} handleSpectatorsClick={() => this.handleSpectatorsClick()}/>
                    </div>
                    {data.createGamePanel ?
                        <div className="create-game-panel">
                            <div className="create-game-panel-modal">
                                <div className="create-game-title">
                                    Выбор набора карт
                                </div>
                                <div className="characters-panel">
                                    {Array(3).fill(null).map((_, set) =>
                                        <>
                                            {set === 1 ? <div className="not-implemented">В разработке</div> : ""}
                                            <div className={cs("characters-set", {
                                                notImplemented: set > 0
                                            })}>
                                                {Array(9).fill(null).map((_, type) => {
                                                        const card = `${type + 1}_${set + 1}`;
                                                        return <div className={cs("character-slot", {
                                                            available: data.createGamePanel.charactersAvailable.includes(card),
                                                            selected: data.createGamePanel.charactersSelected.includes(card)
                                                        })}>
                                                            <Card card={card} type="character"
                                                                  game={this}
                                                                  onClick={() => this.handleClickCharacter(set + 1, type + 1)}/>
                                                        </div>;
                                                    }
                                                )}
                                            </div>
                                        </>)}
                                </div>
                                <div className="create-game-buttons">
                                    <button onClick={() => this.handleClickCloseCreateGame()}>Отмена</button>
                                    <button onClick={() => this.handleClickCreateGame()}>Создать</button>
                                </div>
                            </div>
                        </div>
                        : ""}
                    <div className="host-controls">
                        <div className="side-buttons">
                            {this.state.userId === this.state.hostId ?
                                <i onClick={() => this.socket.emit("set-room-mode", false)}
                                   className="material-icons exit settings-button">store</i> : ""}
                            {isHost ? (data.teamsLocked
                                ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                      className="material-icons start-game settings-button">lock_outline</i>)
                                : (<i onClick={() => this.handleToggleTeamLockClick()}
                                      className="material-icons start-game settings-button">lock_open</i>)) : ""}
                            {(isHost && data.phase !== 0)
                                ? (<i onClick={() => this.handleClickStop()}
                                      className="toggle-theme material-icons settings-button">stop</i>) : ""}
                            {isHost ? (data.phase === 0
                                ? (<i onClick={() => this.handleClickTogglePause()}
                                      title={notEnoughPlayers ? "Not enough players" : ""}
                                      className={`material-icons start-game settings-button ${notEnoughPlayers
                                          ? "inactive" : ""}`}>play_arrow</i>)
                                : (<i onClick={() => this.handleClickTogglePause()}
                                      className="material-icons start-game settings-button">sync</i>)) : ""}
                            <i onClick={() => this.handleClickChangeName()}
                               className="toggle-theme material-icons settings-button">edit</i>
                        </div>
                        <i className="settings-hover-button material-icons">settings</i>
                    </div>
                    <CommonRoom state={this.state} app={this}/>
                </div>)
        } else return (<div/>);

    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
