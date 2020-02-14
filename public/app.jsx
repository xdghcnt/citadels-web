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
                + (!~data.onlinePlayers.indexOf(id) ? " offline" : "")
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
                Spectators:
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
            type = this.props.type,
            noZoom = this.props.noZoom;
        return (
            <div className={`${type} card-item ${noZoom ? "no-zoom" : ""}`}
                 style={{"background-position": `-${card * 130}px 0px`}}
                 onMouseDown={(e) => game.handleCardPress(e)}
                 onMouseUp={(e) => game.handleCardClick(e, this.props.onClick)}>
                {!noZoom ? (<div className="card-zoom-button material-icons"
                                 onMouseDown={(e) => game.handleCardZoomClick(e)}>search</div>) : ""}
                {!noZoom ? (<div className={`card-item-zoomed ${type}`}
                                 style={{"background-position": `-${card * 430}px 0px`}}/>) : ""}
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
            score = data.playerScore[slot],
            isMyTurn = slot === data.currentPlayer,
            isWinner = slot === data.winnerPlayer;
        return (
            <div className={
                `player-slot player-slot-${slot}`
                + (isMyTurn ? " my-turn" : "")
                + (isWinner ? " winner" : "")
            }>
                <div className="profile">
                    <div className="profile-bg">
                        <i className="material-icons">person</i>
                    </div>
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
                                <Card key={id} card={card} type="character" game={game} />
                            </div>
                        ))}
                        {magicianAction ?
                            <button onClick={() => game.handleMagician(slot)}>
                                {slot == data.userSlot ? 'Discard' : 'Exchange'}
                            </button>
                        : null}
                    </div>
                    {player ?
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
                    <div className="districts-bg">
                        <i className="material-icons">home</i>
                    </div>
                    <div className='cards-list'>
                        {districts && districts.map((card, id) => (
                            <Card key={id} card={card} type="card" game={game}
                                  onClick={() => game.handleDestroy(slot, id)}/>
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
    }

    constructor() {
        super();
        this.state = {
            inited: false
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

    handleAssassined(char) {
        this.socket.emit("kill-character", char);
    }

    handleRob(char) {
        this.socket.emit("rob-character", char);
    }

    handleMagician(slot) {
        this.socket.emit('exchange-hand', slot);
    }

    handleDestroy(slot, card) {
        this.socket.emit("destroy", slot, card);
    }

    handleEndTurn() {
        this.socket.emit('end-turn')
    }

    handleClickTogglePause() {
        if (this.state.phase === 0 || confirm("Game will be aborted. Are you sure?"))
            this.socket.emit("start-game");
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
    
    handleTakeCharacter(char) {
        this.socket.emit("take-character", char);
    }

    render() {
        const
            data = this.state,
            isHost = data.hostId === data.userId,
            playerCount = data.playerSlots && data.playerSlots.filter((slot) => slot !== null).length,
            notEnoughPlayers = data.phase === 0 && playerCount < 2;

        if (this.state.disconnected)
            return (<div
                className="kicked">Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}</div>);
        else if (this.state.inited) {
            const activeSlots = [];
            data.playerSlots.forEach((userId, slot) => {
                if (userId != null) activeSlots.push(slot);
            });
            const
                slots = (!data.teamsLocked ? data.playerSlots : activeSlots)
                    .map((value, slot) => !data.teamsLocked ? slot : value);
            return (
                <div
                    className={`game ${(data.phase > 0 && playerCount <= 3) ? "double-roles" : ""}`}
                    onMouseUp={(evt) => this.handleBodyRelease(evt)}>
                    {data.phase != 0 ?
                        <div className="character-section">
                            <div className="cards-list">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((card, id) => (
                                    <div className={~data.characterFace.indexOf(card) ? 'discard' : ''}>
                                        <div className="status">
                                            {card === data.assassined ? "assassined" : null}
                                            {card === data.robbed ? "robbed" : null}
                                        </div>
                                        <Card key={id} card={card} type="character" noZoom={true} game={this}/>
                                    </div>
                                ))}
                            </div>
                        </div>
                        : null}
                    {data.player && data.currentPlayer == data.userSlot ?
                        <div className="action-section"> 
                            {data.phase == 1 ? 
                                <div className={
                                        "choose-character"
                                        + (data.player.action === "discard" ? " discard" : "")
                                    }>
                                    <p>{data.player.action === "discard" ? "Discard" : "Choose"} character:</p>
                                    <div className="cards-list">
                                        {data.player && data.player.choose && data.player.choose.map((card, id) => (
                                            <Card key={id} card={card} type="character" game={this}
                                                  onClick={() => this.handleActionCharacter(id)}/>
                                        ))}
                                    </div>
                                </div>
                                : null}
                            {data.phase == 2 && data.player.action === 'assassin-action' ?
                                <div className="choose-character">
                                    <p>Choose character to assassinate:</p>
                                    <div className="cards-list">
                                        {[2, 3, 4, 5, 6, 7, 8].filter(id => !~data.characterFace.indexOf(id)).map((card, id) => (
                                            <Card key={id} card={card} type="character" game={this}
                                                  onClick={() => this.handleAssassined(card)}/>
                                        ))}
                                    </div>
                                </div>
                                : null}
                            {data.phase == 2 && data.player.action === 'thief-action' ?
                                <div className="choose-character">
                                    <p>Choose character to rob:</p>
                                    <div className="cards-list">
                                        {[3, 4, 5, 6, 7, 8].filter(id => !(~data.characterFace.indexOf(id) || data.assassined === id))
                                            .map((card, id) => (
                                                <Card key={id} card={card} type="character" game={this}
                                                      onClick={() => this.handleRob(card)}/>
                                            ))}
                                    </div>
                                </div>
                                : null}
                            {data.phase == 2 ?
                                <div className="action-button">
                                    {!data.tookResource ?
                                        <button onClick={() => this.handleTakeResource('coins')}>Take 2
                                            coins</button> : null}
                                    {!data.tookResource ? <button onClick={() => this.handleTakeResource('card')}>Take a
                                        card</button> : null}
                                    {data.incomeAction ?
                                        <button onClick={() => this.handleTakeIncome()}>Take income</button> : null}
                                    {data.tookResource ?
                                        <button onClick={() => this.handleEndTurn()}>End turn</button> : null}
                                </div>
                                : null}
                            {data.phase == 3 ?
                                <div className="choose-card">
                                    <p>Choose card:</p>
                                    <div className="cards-list">
                                        {data.player && data.player.choose && data.player.choose.map((card, id) => (
                                            <Card key={id} card={card} type="card" game={this}
                                                  onClick={() => this.handleTakeCard(id)}/>
                                        ))}
                                    </div>
                                </div>
                                : null}
                        </div>
                        : null}
                    {data.player && data.player.hand ?
                        <div className="hand-section">
                            <p>Your cards:</p>
                            <div className='cards-list'>
                                {data.player && data.player.hand && data.player.hand.map((card, id) => (
                                    <Card key={id} card={card} type="card" onClick={() => this.handleBuild(id)}
                                          game={this}/>
                                ))}
                            </div>
                        </div>
                        : null}
                    <div className="players-section">
                        {slots.map((slot) => (<PlayerSlot data={data} slot={slot} game={this}/>))}
                    </div>
                    <div className={"spectators-section"
                    + ((data.spectators.length > 0 || !data.teamsLocked) ? " active" : "")
                    }>
                        <Spectators game={this} data={data} handleSpectatorsClick={() => this.handleSpectatorsClick()}/>
                    </div>
                    <div className="host-controls">
                        <div className="side-buttons">
                            {isHost ? (data.teamsLocked
                                ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                      className="material-icons start-game settings-button">lock_outline</i>)
                                : (<i onClick={() => this.handleToggleTeamLockClick()}
                                      className="material-icons start-game settings-button">lock_open</i>)) : ""}
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
                </div>)
        } else return (<div/>);

    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
