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

class ImgSvg extends React.Component {
    render() {
        return <img src={this.props.src} onLoad={(e) => SVGInject(e.target)}/>;
    }
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
                                onClick={() => this.props.handlePlayerJoin(this.props.slot)}>Занять</div>))}
                {(hasPlayer && (isHost || data.hostId === id))
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
                className="spectators panel">
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
            isCharacter = type === "character",
            getBackgroundImage = (isToken) => `url(/citadels/${isToken ? "character-tokens" : (isCharacter ? "characters" : "cards")}/${
                isCharacter
                    ? (card !== "0_1" ? card : "card_back")
                    : cardType || "card_back"
            }.jpg)`,
            backgroundImage = getBackgroundImage(isToken),
            backgroundImageZoomed = getBackgroundImage(),
            cardChosen = game.state.cardChosen.includes(this.props.id),
            blackmailedChosen = game.state.cardChosen.includes(card) && !isToken,
            currentCharacter = game.state.currentCharacter === card && isToken,
            isSecretVault = card === "secret_vault";

        return (
            <div className={cs(type, "card-item", {
                "card-chosen": cardChosen || blackmailedChosen,
                "current-character": currentCharacter,
                "secret-vault": isSecretVault,
                "decoration": card.decoration,
                "in-action": !isCharacter && game.state.userAction === card.type
            })}
                 style={{"background-image": backgroundImage}}
                 onMouseDown={(e) => card !== "0_1" ? game.handleCardPress(e) : null}
                 onTouchStart={(e) => card !== "0_1" ? game.handleCardPress(e) : null}
                 onClick={(e) => game.handleCardClick(e, this.props.onClick)}>
                {card !== "0_1" ? (<div className="card-zoom-button material-icons"
                                        onMouseDown={(e) => game.handleCardZoomClick(e)}
                                        onTouchStart={(e) => game.handleCardZoomClick(e)}>search</div>) : ""}
                {card !== "0_1" ? (<div className={`card-item-zoomed`}
                                        style={{"background-image": backgroundImageZoomed}}/>) : ""}
                {card.decoration ? <div className="decoration-coin" style={{top: `${20 * card.cost}px`}}/> : ""}
                {card.exposition ? <div className="exposition-count">
                    <i className="material-icons">content_copy</i> {card.exposition.length}
                </div> : ""}
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
            theaterAction = data.player && data.player.action === 'theater-action' && data.phase === 1.5  && data.playerChosen === null,
            emperorAction = data.player && ['emperor-action', 'emperor-nores-action'].includes(data.player.action) && data.phase === 2 && data.playerChosen === null,
            playerChosen = data.playerChosen === slot,
            score = data.playerScore[slot],
            isMyTurn = slot === data.currentPlayer,
            isWinner = slot === data.winnerPlayer;
        return (
            <div className={cs(`player-slot`, `player-slot-${slot}`, {
                "my-turn": isMyTurn,
                "winner": isWinner,
                "player-chosen": playerChosen,
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
                                <Card key={id} card={card ? card : `0_1`} type="character" game={game}/>
                            </div>
                        ))}
                        {magicianAction && slot != data.userSlot ?
                            <button onClick={() => game.handleMagician(slot, [])}>Обменяться картами</button>
                            : null}
                        {theaterAction && slot != data.userSlot ?
                            <button onClick={() => game.handleTheater(slot, [])}>Обменяться персонажем</button>
                            : null}
                        {emperorAction && slot != data.userSlot && slot != data.king ?
                            <button onClick={() => game.handleEmperor(slot, null)}>Отдать корону</button>
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
                            <div className="score">Очки: {score}</div>
                        </div>
                        : null}
                </div>
            </div>
        )
    }
}


class Game extends React.Component {

    componentDidMount() {
        this.gameName = "citadels";
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
                maxPlayers: 8,
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
            cardChosen: [],
            playerChosen: null
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

    toggleCardChoose(card) {
        const
            array = this.state.cardChosen,
            cardInd = array.indexOf(card);
        if (~cardInd)
            array.splice(cardInd, 1);
        else
            array.push(card);
        this.setState(this.state);
    }

    handleClickHandCard(cardInd) {
        if (this.state.userAction === "magician")
            this.toggleCardChoose(cardInd);
        else if (this.state.userAction === "framework") {
            this.socket.emit('framework-action', cardInd);
            this.handleStopUserAction();
        } else if (this.state.userAction === "museum") {
            this.socket.emit('museum-action', cardInd);
            this.handleStopUserAction();
        } else if (this.state.userAction === "laboratory") {
            this.socket.emit('laboratory-action', cardInd);
            this.handleStopUserAction();
        } else if (this.state.userAction === "den_of_thieves") {
            if (this.state.player.hand[cardInd].type !== "den_of_thieves")
                this.toggleCardChoose(cardInd);
        } else if (this.state.userAction === "necropolis") {
        } else {
            const cardType = this.state.player.hand[cardInd].type;
            if (cardType === "necropolis" && this.state.playerDistricts[this.state.userSlot].length && this.state.buildDistricts > 0)
                this.setUserAction("necropolis");
            else if (cardType === "den_of_thieves" && this.state.player.hand.length > 1 && this.state.buildDistricts > 0)
                this.setUserAction("den_of_thieves");
            else
                this.socket.emit('build', cardInd);
        }
    }

    handleBlackmailedResponse(res) {
        this.socket.emit('blackmailed-response', res)
    }

    handleMagician(slot, cards) {
        this.socket.emit('exchange-hand', slot, cards)
    }

    handleEmperor(slot, res) {
        if (res === null) {
            if (this.state.player.action === 'emperor-nores-action')
                return this.socket.emit('emperor-crown', slot, 'coin');
            this.setState(Object.assign(this.state, {
                userAction: 'emperor',
                playerChosen: slot
            }));
        } else {
            this.socket.emit('emperor-crown', this.state.playerChosen, res);
            this.handleStopUserAction();
        }
    }

    handleNavigatorResource(res) {
        this.socket.emit('navigator-resources', res)
    }

    handleTheater(slot) {
        this.socket.emit('theater-action', slot)
    }

    handleForgery() {
        this.socket.emit('forgery-action')
    }

    handleActionRank1(char) {
        if (this.state.player.action == 'assassin-action') this.socket.emit("kill-character", char);
        if (this.state.player.action == 'witch-action') this.socket.emit("bewitch-character", char);
    }

    handleActionRank2(char) {
        if (this.state.player.action == 'thief-action') this.socket.emit("rob-character", char);
        if (this.state.player.action == 'blackmailer-action') {
            this.toggleCardChoose(char);
            if (this.state.cardChosen.length == 2) {
                this.socket.emit("threat-character", this.state.cardChosen[0], this.state.cardChosen[1]);
                this.handleStopUserAction();
            }
        }
    }

    handleApplyAction(slot, cards) {
        if (this.state.userAction === "den_of_thieves")
            this.socket.emit('build-den-of-thieves', cards);
        else
            this.socket.emit('exchange-hand', slot, cards);
        this.handleStopUserAction();
    }

    handleClickBuildForGold() {
        let index;
        if (this.state.userAction === "necropolis")
            index = this.state.player.hand.indexOf(this.state.player.hand.filter((card) => card.type === "necropolis")[0]);
        else
            index = this.state.player.hand.indexOf(this.state.player.hand.filter((card) => card.type === "den_of_thieves")[0]);
        this.socket.emit('build', index);
        this.handleStopUserAction();
    }

    setUserAction(action) {
        this.setState(Object.assign(this.state, {
            userAction: action,
            cardChosen: [],
            playerChosen: null
        }));
    }

    handleStopUserAction() {
        this.setState(Object.assign(this.state, {
            userAction: null,
            cardChosen: [],
            playerChosen: null
        }));
    }

    handleClickBuilding(slot, card) {
        if (this.state.userAction === 'arsenal') {
            this.socket.emit("arsenal-destroy", slot, card);
            this.handleStopUserAction();
            return;
        }
        if (this.state.userAction === "necropolis") {
            this.socket.emit("build-necropolis", slot);
            this.handleStopUserAction();
            return;
        }
        if (this.state.player.action === 'warlord-action') return this.socket.emit("destroy", slot, card);
        if (this.state.player.action === 'artist-action') return this.socket.emit("beautify", slot, card);
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
                getEmperorAvailable = (set) => (playerCount === 2
                    ? []
                    : [`4_2`]),
                getQueenAvailable = (set) => (playerCount < 5
                    ? []
                    : [`9_2`]),
                getNineCharacterSelected = (set) => ([3, 8].includes(playerCount)
                    ? [`9_${set}`]
                    : []);

            this.setState({
                ...this.state,
                createGamePanel: {
                    charactersAvailable: [
                        "1_1", "2_1", "3_1", "4_1", "5_1", "6_1", "7_1", "8_1", ...getNineCharacterAvailable(1),
                        "1_2", "2_2", ...getEmperorAvailable(), "6_2", "7_2", ...getQueenAvailable(), //"3_2", "5_2", "8_2",
                        //"1_3", "2_3", "3_3", "4_3", "5_3", "6_3", "7_3", "8_3", ...getNineCharacterAvailable(3)
                    ],
                    charactersSelected: [
                        "1_1", "2_1", "3_1", "4_1", "5_1", "6_1", "7_1", "8_1", ...getNineCharacterSelected(1)
                    ],
                    districtsSelected: [
                        ...this.state.uniqueDistricts.filter((district) => playerCount > 3 || district !== "theater")
                    ]
                }
            });
        }
    }

    handleClickCreateGame() {
        this.socket.emit("start-game", this.state.createGamePanel.charactersSelected, this.state.createGamePanel.districtsSelected);
        this.handleClickCloseCreateGame();
    }

    handleClickCloseCreateGame() {
        this.setState({
            ...this.state,
            createGamePanel: null
        });
    }

    handleClickCharacter(set, type) {
        const
            playerCount = this.state.playerSlots && this.state.playerSlots.filter((slot) => slot !== null).length,
            card = `${type}_${set}`,
            currentCharacters = this.state.createGamePanel.charactersSelected,
            alreadyHas = currentCharacters.includes(card);
        if (!this.state.createGamePanel.charactersAvailable.includes(card))
            return;
        if (type === 9 && playerCount >= 4 && playerCount <= 7 && (alreadyHas || currentCharacters.length === 8)) {
            if (alreadyHas)
                currentCharacters.splice(8, 1);
            else
                currentCharacters.push(card);
        } else if (type !== 9)
            currentCharacters[type - 1] = card;
        this.setState(this.state);
    }

    handleClickDistrict(district) {
        const playerCount = this.state.playerSlots && this.state.playerSlots.filter((slot) => slot !== null).length;
        if (playerCount < 4 && district === "theater")
            return;
        const districtIndex = this.state.createGamePanel.districtsSelected.indexOf(district);
        if (districtIndex === -1)
            this.state.createGamePanel.districtsSelected.push(district);
        else
            this.state.createGamePanel.districtsSelected.splice(districtIndex, 1);
        this.setState(this.state);
    }

    handleClickStop() {
        popup.confirm({content: `Игра будет закончена. Вы уверены?`}, (evt) => evt.proceed && this.socket.emit("abort-game"));
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
        if (window.innerWidth < 750)
            return;
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
        if (this.state.testMode)
            this.socket.emit("remove-player", id);
        else
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
            blackmailedResponseAction = data.player && data.player.action === 'blackmailed-response' && data.phase === 2,
            magicianAction = data.player && data.player.action === 'magician-action' && data.phase === 2,
            emperorAction = data.player && (data.userAction === 'emperor' || data.player.action === 'emperor-nores-action') && data.phase === 2,
            navigatorAction = data.player && data.player.action === 'navigator-action' && data.phase === 2,
            theaterAction = data.player && data.player.action === 'theater-action' && data.phase === 1.5,
            necropolisAction = data.player && data.userAction === 'necropolis' && data.phase === 2,
            denOfThievesAction = data.player && data.userAction === 'den_of_thieves' && data.phase === 2;

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
                || data.phase == 3 || data.phase === 2 && (['assassin-action', 'thief-action', 'witch-action', 'blackmailer-action'].includes(data.player.action)));
            const
                userActionText = {
                    magician: "Выберите карты для сброса",
                    arsenal: "Выберите постройку для сноса",
                    framework: "Выберите карту для постройки",
                    museum: "Выберите карту для музея",
                    necropolis: "Вы можете выбрать квартал для разрушения",
                    den_of_thieves: "Вы можете выбрать карты для оплаты",
                    emperor: "Выберите ресурс, за который вы отдадите корону выбранному игроку"
                }[data.userAction];
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
                                            witched: card === data.witched,
                                            robbed: card === data.robbed,
                                            blackmailed: data.blackmailed.includes(card),
                                        })}>
                                            {card === data.assassined ?
                                                <ReactInlineSVG.default src="/citadels/icons/assassinated.svg"/>
                                                : null}
                                            {card === data.robbed ?
                                                <ReactInlineSVG.default src="/citadels/icons/robbed.svg"/>
                                                : null}
                                            {card === data.witched ?
                                                <ReactInlineSVG.default src="/citadels/icons/witched.svg"/>
                                                : null}
                                            {data.blackmailed.includes(card) ?
                                                <ReactInlineSVG.default src="/citadels/icons/blackmailed.svg"/>
                                                : null}
                                        </div>
                                        <Card key={id} card={card} type="character" game={this}
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
                        {data.player && data.player.hand ?
                            <div className={cs("hand-section", {noAction: !districtCardsMinimized})}>
                                <div className={cs('cards-list', {minimized: districtCardsMinimized})}>
                                    {data.player && data.player.hand && data.player.hand.map((card, id) => (
                                        <Card key={id} card={card} type="card" id={id}
                                              onClick={() => this.handleClickHandCard(id)}
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
                                                <Card key={id} card={card} type="character" game={this}
                                                      onClick={() => this.handleActionCharacter(id)}/>
                                            ))}
                                        </div>
                                    </div>
                                    : null}
                                {data.phase == 2 && ['assassin-action', 'witch-action'].includes(data.player.action) && !data.userAction ?
                                    <div className="choose-character">
                                        <p className="status-text">Выберите персонажа
                                            для {data.player.action === "witch-action" ? "колдовства" : "убийства"}</p>
                                        <div className="cards-list">
                                            {data.characterInGame.filter(id => !(~data.characterFace.indexOf(id) || data.characterInGame.indexOf(id) < 1)).map((card, id) => (
                                                <Card key={id} card={card} type="character" game={this}
                                                      onClick={() => this.handleActionRank1(card)}/>
                                            ))}
                                        </div>
                                    </div>
                                    : null}
                                {data.phase == 2 && ['thief-action', 'blackmailer-action'].includes(data.player.action) && !data.userAction ?
                                    <div className="status-text" className="choose-character">
                                        <p className="status-text" className="status-text">Выберите персонажа
                                            для {data.player.action === "thief-action" ? "воровства" :
                                                data.cardChosen.length == 0 ? "шантажа" : "блефа"}</p>
                                        <div className="cards-list">
                                            {data.characterInGame.filter(id => !(~data.characterFace.indexOf(id) || [data.assassined, data.witched].includes(id) || data.characterInGame.indexOf(id) < 2))
                                                .map((card, id) => (
                                                    <Card key={id} card={card} type="character" game={this}
                                                          onClick={() => this.handleActionRank2(card)}/>
                                                ))}
                                        </div>
                                    </div>
                                    : null}
                                {data.phase == 1.5 ?
                                    <>
                                        <p className="status-text">Выберите игрока для обмена персонажем</p>
                                        <div className="action-button">
                                            {theaterAction ?
                                                <button onClick={() => this.handleTheater(data.userSlot)}>Отказаться от
                                                    театра</button> : null}
                                        </div>
                                    </>
                                    : null}
                                {data.phase == 2 && !data.userAction ?
                                    <div className="action-button">
                                        {!data.tookResource ?
                                            <button onClick={() => this.handleTakeResource('coins')}>Получить 2
                                                монеты</button> : null}
                                        {!data.tookResource ?
                                            <span className="button-or">
                                                или
                                            </span> : null}
                                        {!data.tookResource ?
                                            <button onClick={() => this.handleTakeResource('card')}>Взять
                                                карту</button> : null}
                                        {magicianAction ?
                                            <button onClick={() => this.setUserAction("magician")}>Сбросить
                                                карты</button> : null}
                                        {blackmailedResponseAction ?
                                            <button onClick={() => this.handleBlackmailedResponse('yes')}>Откупиться от
                                                шантажа</button> : null}
                                        {blackmailedResponseAction ?
                                            <span className="button-or">
                                                или
                                            </span> : null}
                                        {blackmailedResponseAction ?
                                            <button onClick={() => this.handleBlackmailedResponse('no')}>Отказаться от
                                                откупа</button> : null}
                                        {navigatorAction ?
                                            <button onClick={() => this.handleNavigatorResource('coins')}>Получить 4
                                                монеты</button> : null}
                                        {navigatorAction ?
                                            <span className="button-or">
                                                или
                                            </span> : null}
                                        {navigatorAction ?
                                            <button onClick={() => this.handleNavigatorResource('card')}>Получить
                                                4 карты</button> : null}
                                        {(this.hasDistricts('framework') && data.player.hand.length && data.buildDistricts > 0) ?
                                            <button onClick={() => this.setUserAction("framework")}>Исп. Строительные
                                                леса</button> : null}
                                        {(this.hasDistricts('museum') && data.player.hand.length && data.museumAction) ?
                                            <button onClick={() => this.setUserAction("museum")}>Исп.
                                                Музей</button> : null}
                                        {(this.hasDistricts('laboratory') && data.player.hand.length && data.laboratoryAction) ?
                                            <button onClick={() => this.setUserAction("laboratory")}>Исп.
                                                Лабораторию</button> : null}
                                        {this.hasDistricts('arsenal') ?
                                            <button onClick={() => this.setUserAction("arsenal")}>Исп.
                                                Арсенал</button> : null}
                                        {this.hasDistricts('forgery') && data.playerGold[data.userSlot] > 1 && data.forgeryAction ?
                                            <button onClick={() => this.handleForgery()}>Исп. Кузницу</button> : null}
                                        {data.incomeAction ?
                                            <button onClick={() => this.handleTakeIncome()}>Получить
                                                доход</button> : null}
                                        {data.tookResource && !blackmailedResponseAction && !emperorAction ?
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
                                            <button onClick={() => this.handleStopUserAction()}>Отмена действия</button>
                                            <p className="status-text">{userActionText}</p>
                                            {(magicianAction || denOfThievesAction)
                                                ? <button
                                                    onClick={() => this.handleApplyAction(data.userSlot, data.cardChosen)}>
                                                    {data.userAction === "magician" ? "Применить" : "Построить"}
                                                </button> : null}
                                            {(necropolisAction)
                                                ? <button
                                                    onClick={() => this.handleClickBuildForGold()}>
                                                    Построить за золото
                                                </button> : null}
                                            {(emperorAction) ?
                                                <button onClick={() => this.handleEmperor(null, 'coin')}>Получить
                                                монету</button> : null}
                                            {(emperorAction) ?
                                                <span className="button-or">
                                                    или
                                                </span> : null}
                                            {(emperorAction) ?
                                                <button onClick={() => this.handleEmperor(null, 'card')}>Получить
                                                    карту</button> : null}
                                        </div>
                                    </div>
                                    : null}
                            </div>
                            : null}
                    </div>
                    <div className="short-rules panel">
                        <i className="material-icons">list_alt</i>
                        <div className="short-rules-title">Памятка</div>
                        <img src="/citadels/short-rules.jpg"/>
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
                                    <div className="create-game-subtitle">Персонажи</div>
                                    <div className={cs("characters-set")}>
                                        {Array(3).fill(null).map((_, set) =>
                                            <div className={cs("characters-row")}>
                                                {Array(9).fill(null).map((_, type) => {
                                                        const card = `${type + 1}_${set + 1}`;
                                                        return <div
                                                            title={!data.createGamePanel.charactersAvailable.includes(card) && !["9_1", "4_2", "9_2"].includes(card)
                                                                ? "В разработке" : ""}
                                                            className={cs("character-slot", {
                                                                available: data.createGamePanel.charactersAvailable.includes(card),
                                                                selected: data.createGamePanel.charactersSelected.includes(card)
                                                            })}>
                                                            <Card card={card} type="character"
                                                                  game={this}
                                                                  onClick={() => this.handleClickCharacter(set + 1, type + 1)}/>
                                                        </div>;
                                                    }
                                                )}
                                            </div>)}

                                    </div>
                                    <div className="create-game-subtitle">Уникальные кварталы</div>
                                    <div className={cs("district-set")}>
                                        {data.uniqueDistricts.map((district) => (
                                            <div className={cs("district-slot", {
                                                selected: data.createGamePanel.districtsSelected.includes(district)
                                            })}>
                                                <Card card={{type: district}} type="card"
                                                      game={this}
                                                      onClick={() => this.handleClickDistrict(district)}/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="create-game-buttons">
                                    <button onClick={() => this.handleClickCloseCreateGame()}>Отмена</button>
                                    <button className={cs({
                                        inactive: playerCount < 2
                                    })} onClick={() => playerCount >= 2 && this.handleClickCreateGame()}>Создать
                                    </button>
                                </div>
                            </div>
                        </div>
                        : ""}
                    <div className="host-controls panel">
                        <div className="side-buttons">
                            {this.state.userId === this.state.hostId ?
                                <i onClick={() => this.socket.emit("set-room-mode", false)}
                                   className="material-icons exit settings-button">store</i> : ""}
                            {isHost ? (data.teamsLocked
                                ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                      className="material-icons start-game settings-button">lock_outline</i>)
                                : (<i onClick={() => this.handleToggleTeamLockClick()}
                                      className="material-icons start-game settings-button">lock_open</i>)) : ""}
                            {isHost ? (data.phase === 0
                                ? (<i onClick={() => this.handleClickTogglePause()}
                                      className={`material-icons start-game settings-button`}>play_arrow</i>)
                                : <i onClick={() => this.handleClickStop()}
                                     className="toggle-theme material-icons settings-button">stop</i>) : ""}
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
