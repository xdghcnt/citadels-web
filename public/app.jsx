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
                    ? (<PlayerName data={data} id={id} />)
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
            type = this.props.type,
            isCharacter = type === "character",
            data = this.props.game.state,
            originalCard = this.props.card,
            isToken = this.props.isToken,
            isGallery = this.props.isGallery,
            card = (originalCard === "1_2" && data.witchedstate === 1 && !isToken && !isGallery) ? data.witched : originalCard,
            cardType = card.type,
            getBackgroundImage = (isToken, useOriginalCard) => `url(/citadels/${isToken ? "character-tokens" : (isCharacter ? "characters" : "cards")}/${
                isCharacter
                    ? (card !== "0_1" ? (useOriginalCard ? originalCard : card) : "card_back")
                    : cardType || "card_back"
            }.jpg)`,
            backgroundImage = getBackgroundImage(isToken),
            backgroundImageZoomed = getBackgroundImage(),
            cardChosen = this.props.play === undefined && data.userAction != null && data.cardChosen.includes(this.props.id),
            blackmailedChosen = data.cardChosen.includes(card) && !isToken,
            magistrateNotChosen = data.player && data.player.action === 'magistrate-action' && data.cardChosen.indexOf(card) > 0 && !isToken,
            diplomatCard = data.player && data.player.action === 'diplomat-action' && this.props.play && !isCharacter
                && data.cardChosen[0] === this.props.slot && data.cardChosen[1] === this.props.id,
            currentCharacter = data.currentCharacter === card && isToken,
            isSecretVault = card.type === "secret_vault",
            decorationCount = card.decoration === true ? 1 : (card.decoration || 0);
        return (
            <div className={cs(type, "card-item", {
                "card-chosen": cardChosen || blackmailedChosen || diplomatCard,
                "card-not-chosen": magistrateNotChosen,
                "card-wizard": card.wizard,
                "current-character": currentCharacter,
                "secret-vault": isSecretVault,
                "decoration": decorationCount,
                "in-action": !isCharacter && (data.userAction === card.type || (data.buildTarget === this.props.id && this.props.inHand)),
                "witched-state": !isGallery && !isToken && data.witchedstate === 1 && originalCard === data.witched
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
                {decorationCount ? <div className="decoration-coin" style={{top: `${20 * card.cost}px`}}>
                    {decorationCount > 1 ? <span className="decoration-count">{decorationCount}</span> : ""}
                </div> : ""}
                {card === "9_3" && isToken ? <div className={cs("tax-counter", {empty: !data.tax})}>
                    <div className="tax-counter-coin"/>
                    <div className="tax-counter-value">{data.tax || 0}</div>
                </div> : ""}
                {card.exposition ? <div className="exposition-count">
                    <i className="material-icons">content_copy</i> {card.exposition.length}
                </div> : ""}
                {originalCard !== card ? <div className="card-item-original"
                                              style={{"background-image": getBackgroundImage(true, true)}}/> : ""}
            </div>
        );
    }
}

class TimerDisplay extends React.Component {
    constructor() {
        super();
        this.state = {now: Date.now()};
    }

    componentDidMount() {
        this.interval = setInterval(() => this.setState({now: Date.now()}), 1000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    render() {
        const
            data = this.props.data,
            timer = data.timer;
        if (!timer || !timer.endsAt)
            return null;
        const
            serverOffset = (data.serverTime || this.state.now) - (data.serverReceivedAt || this.state.now),
            remainingMs = Math.max(0, timer.endsAt - (this.state.now + serverOffset)),
            totalSeconds = Math.ceil(remainingMs / 1000),
            minutes = Math.floor(totalSeconds / 60),
            seconds = totalSeconds % 60,
            value = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        return <div className={cs("timer-display", {
            "timer-warning": remainingMs <= 10000
        })}>{value}</div>;
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
            theaterAction = data.player && data.player.action === 'theater-action' && data.phase === 1.5 && data.playerChosen === null,
            wizardAction = data.player && data.player.action === 'wizard-player-action' && data.phase === 2,
            emperorAction = data.player && ['emperor-action', 'emperor-nores-action'].includes(data.player.action) && data.phase === 2 && data.playerChosen === null,
            abbatAction = data.player && data.player.action === 'abbat-action' && data.phase === 2,
            cardinalActionPlayer = data.player && data.userAction === 'cardinal-action-player' && data.phase === 2,
            spyAction = data.player && data.player.action === 'spy-action' && data.phase === 2,
            maxMoney = Math.max(...Object.values(data.playerGold)),
            isBigMoney = data.playerGold[slot] === maxMoney && data.playerGold[data.userSlot] !== maxMoney,
            playerChosen = data.playerChosen === slot,
            score = data.playerScore[slot],
            isMyTurn = slot === data.currentPlayer,
            winnerPlayers = data.winnerPlayers || [],
            isWinner = slot === data.winnerPlayer || winnerPlayers.includes(slot);
        return (
            <div className={cs(`player-slot`, `player-slot-${slot}`, {
                "my-turn": isMyTurn,
                "winner": isWinner,
                "player-chosen": playerChosen,
                "hasCrown": data.king === slot,
                "seer-return": slot === data.seerReturnSlot,
                "target": slot === data.targetSlot
            })}>
                <div className="profile">
                    <div className="profile-bg"/>
                    <div className='profile-head'>
                        <div className="profile-name">
                            <Player id={player} data={data} slot={slot}
                                    game={game}
                                    handlePlayerJoin={(slot) => game.handlePlayerJoin(slot)}/>
                        </div>
                        {data.timer && data.timer.ownerSlot === slot ? <TimerDisplay data={data}/> : null}
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
                        {wizardAction && slot != data.userSlot && data.playerHand[slot] ?
                            <button onClick={() => game.handleWizard(slot)}>Отобрать карту</button>
                            : null}
                        {emperorAction && slot != data.userSlot && slot != data.king ?
                            <button onClick={() => game.handleEmperor(slot, null)}>Отдать корону</button>
                            : null}
                        {abbatAction && slot != data.userSlot && isBigMoney ?
                            <button onClick={() => game.handleAbbat(slot)}>Забрать монету</button>
                            : null}
                        {spyAction && slot != data.userSlot && data.playerHand[slot] ?
                            <button onClick={() => game.handleSpy(slot)}>Посмотреть карты</button>
                            : null}
                        {cardinalActionPlayer && slot != data.userSlot && game.isCardinalActionAvailable(data.buildTarget, slot) ?
                            <button onClick={() => game.handleCardinalActionPlayer(slot)}>Выбрать покупателя</button>
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
                            <Card key={id} id={id} card={card} type="card" game={game} slot={slot} play={true}
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

class SetupHelp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {open: false, left: 8, top: 8};
        this.close = () => this.setState({open: false});
    }
    componentDidMount() {
        window.addEventListener("resize", this.close);
        window.addEventListener("scroll", this.close, true);
    }
    componentWillUnmount() {
        window.removeEventListener("resize", this.close);
        window.removeEventListener("scroll", this.close, true);
    }
    show() {
        this.setState({open: true}, () => {
            if (!this.button || !this.tip) return;
            const anchor = this.button.getBoundingClientRect();
            const tip = this.tip.getBoundingClientRect();
            const width = document.documentElement.clientWidth, height = window.innerHeight;
            const left = Math.max(8, Math.min(anchor.right - tip.width, width - tip.width - 8));
            const below = anchor.bottom + 8;
            const top = Math.max(8, Math.min(below + tip.height <= height - 8 ? below : anchor.top - tip.height - 8, height - tip.height - 8));
            this.setState({left, top});
        });
    }
    render() {
        return <span className="setup-help-anchor" onMouseEnter={() => this.show()} onMouseLeave={this.close}>
            <button type="button" ref={button => this.button = button}
                    aria-label="Совет по расширенным настройкам" aria-describedby="advanced-settings-help"
                    onFocus={() => this.show()} onBlur={this.close}
                    onKeyDown={event => {if (event.key === "Escape") this.close();}}
                    onClick={() => this.show()}>ⓘ</button>
            {this.state.open ? ReactDOM.createPortal(
                <span id="advanced-settings-help" role="tooltip" className="setup-help-tooltip"
                      ref={tip => this.tip = tip} style={{left: this.state.left, top: this.state.top}}>
                    Если у вас мало опыта, оставьте настройки по умолчанию
                </span>, document.body) : null}
        </span>;
    }
}

class CreateGamePanel extends React.Component {
    constructor(props) {
        super(props);
        const saved = !props.galleryMode && (props.data.setupDraft || props.data.gameSetup);
        this.state = {
            basicCounts: CitadelsSetup.normalizeBasicCounts(saved ? saved.districts.basic : undefined),
            starting: CitadelsSetup.normalizeStarting(saved ? saved.starting : undefined),
            rules: CitadelsSetup.normalizeRules(saved ? saved.rules : undefined),
            preserveCharacters: !!saved && props.data.setupDraftPreserveCharacters === true,
            advancedOpen: false,
            basicGroup: 4
        };
        if (saved) {
            this.state.charactersSelected = new Set(saved.characters);
            this.state.districtsSelected = new Set(saved.districts.unique);
            this.state.timerSettings = CitadelsSetup.normalizeTimerSettings(saved.timer);
            this.state.presetSelected = saved.metadata && saved.metadata.presetId || null;
            this.state.setupMetadata = saved.metadata;
            this.playerCount = props.data.playerSlots.filter(slot => slot !== null).length;
        }
    }

    componentDidMount() {
        this.previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        this.publishSetupDraft();
    }

    componentDidUpdate() {
        this.publishSetupDraft();
    }

    canEditSetup() {
        const {data} = this.props;
        return !this.unmounted && !this.props.galleryMode && data.phase === 0 && data.userId === data.hostId;
    }

    publishSetupDraft() {
        if (!this.canEditSetup())
            return;
        let setup = null;
        try { setup = this.getSetup(); } catch (error) { /* Keep the last valid shared setup. */ }
        const fingerprint = JSON.stringify([setup, this.state.preserveCharacters]);
        if (fingerprint === this.draftFingerprint)
            return;
        this.draftFingerprint = fingerprint;
        clearTimeout(this.draftTimeout);
        this.pendingDraft = [setup, this.state.preserveCharacters];
        this.draftTimeout = setTimeout(() => this.flushSetupDraft(), 300);
    }

    flushSetupDraft() {
        if (this.pendingDraft && this.canEditSetup())
            this.props.game.socket.emit("update-setup", ...this.pendingDraft);
        this.pendingDraft = null;
    }

    componentWillUnmount() {
        clearTimeout(this.draftTimeout);
        this.flushSetupDraft();
        document.body.style.overflow = this.previousBodyOverflow;
        this.unmounted = true;
        if (this.importReader && this.importReader.readyState === 1)
            this.importReader.abort();
    }

    getSetup() {
        return CitadelsSetup.normalizeSetup({
            format: CitadelsSetup.FORMAT,
            version: CitadelsSetup.VERSION,
            districts: {
                basic: this.state.basicCounts,
                unique: [...this.state.districtsSelected]
            },
            characters: [...this.state.charactersSelected],
            timer: this.state.timerSettings,
            starting: this.state.starting,
            rules: this.state.rules,
            metadata: Object.assign({}, this.state.setupMetadata, {presetId: this.state.presetSelected || null})
        });
    }

    handleBasicCountChange(id, value) {
        this.setState({
            basicCounts: Object.assign({}, this.state.basicCounts, {[id]: value === "" ? "" : Number(value)}),
            importMessage: null
        });
    }

    handleExportSetup() {
        if (!this.canEditSetup())
            return;
        try {
            const text = CitadelsSetup.serializeSetup(this.getSetup());
            const url = URL.createObjectURL(new Blob([text], {type: "application/json;charset=utf-8"}));
            const link = document.createElement("a");
            link.href = url;
            link.download = "citadels-setup.json";
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            this.setState({importError: null, importMessage: "Настройки экспортированы."});
        } catch (error) {
            this.setState({importError: error.message, importMessage: null});
        }
    }

    handleImportSetup(event) {
        if (!this.canEditSetup())
            return;
        const file = event.target.files[0];
        event.target.value = "";
        if (!file)
            return;
        if (file.size > CitadelsSetup.MAX_FILE_SIZE) {
            this.setState({importError: "Файл настроек должен быть не больше 64 КБ.", importMessage: null});
            return;
        }
        const reader = new FileReader();
        this.importReader = reader;
        this.setState({importPending: true, importError: null, importMessage: null});
        reader.onerror = () => {
            if (!this.unmounted)
                this.setState({importPending: false, importError: "Не удалось прочитать файл настроек."});
        };
        reader.onload = () => {
            if (!this.canEditSetup())
                return;
            try {
                const setup = CitadelsSetup.parseSetup(reader.result);
                const players = this.props.data.playerSlots.filter(slot => slot !== null).length;
                CitadelsSetup.normalizeUniqueDistricts(setup.districts.unique, players);
                const presetId = setup.metadata && setup.metadata.presetId;
                const preset = Object.prototype.hasOwnProperty.call(this.presets, presetId) ? this.presets[presetId] : null;
                const matchesPreset = preset
                    && JSON.stringify(preset.characters) === JSON.stringify(setup.characters)
                    && JSON.stringify(preset.quarters.slice().sort()) === JSON.stringify(setup.districts.unique.slice().sort());
                this.setState({
                    basicCounts: setup.districts.basic,
                    districtsSelected: new Set(setup.districts.unique),
                    charactersSelected: new Set(setup.characters),
                    timerSettings: setup.timer,
                    starting: setup.starting,
                    rules: setup.rules,
                    preserveCharacters: true,
                    setupMetadata: setup.metadata,
                    presetSelected: matchesPreset ? presetId : null,
                    importPending: false,
                    importError: null,
                    importMessage: "Настройки импортированы."
                });
            } catch (error) {
                this.setState({importPending: false, importError: error.message});
            }
        };
        reader.readAsText(file);
    }

    handleSetupNumberChange(section, key, value) {
        this.setState({[section]: Object.assign({}, this.state[section], {[key]: value === "" ? "" : Number(value)})});
    }

    handleNestedNumberChange(section, field, key, value) {
        const nested = Object.assign({}, this.state[section][field], {[key]: value === "" ? "" : Number(value)});
        this.setState({[section]: Object.assign({}, this.state[section], {[field]: nested})});
    }

    renderStartingSettings() {
        const busy = this.state.importPending || this.props.data.setupPending;
        const automatic = this.state.rules.citySize === null;
        const citySize = automatic ? CitadelsSetup.getCitySize(this.playerCount) : this.state.rules.citySize;
        const exactUnique = this.state.starting.exactUnique;
        return <div className="starting-settings">
            <div className="create-game-subtitle">Стартовые ресурсы</div>
            <div className="starting-settings-fields">
                {[
                    ["handSize", "Карт на старте"],
                    ["minUnique", exactUnique ? "Особых кварталов на старте" : "Минимум особых кварталов"],
                    ["gold", "Стартовое золото"]
                ].map(([key, label]) => <div className="starting-setting" key={key}>
                    <label className="starting-number" htmlFor={"starting-" + key}>
                        <span>{label}</span>
                        <input id={"starting-" + key} type="number" min="0" step="1" inputMode="numeric"
                               value={this.state.starting[key]} disabled={busy}
                               aria-invalid={!Number.isSafeInteger(this.state.starting[key]) || this.state.starting[key] < 0
                                   || (key === "minUnique" && this.state.starting[key] > this.state.starting.handSize - this.state.starting.firstCrownReduction.cards)}
                               onChange={event => this.handleSetupNumberChange("starting", key, event.target.value)}/>
                    </label>
                    {key === "minUnique" ? <label className="starting-unique-option">
                        <input type="checkbox" checked={exactUnique} disabled={busy}
                               onChange={event => this.setState({starting: Object.assign({}, this.state.starting, {exactUnique: event.target.checked})})}/>
                        Фиксированное число
                    </label> : null}
                </div>)}
            </div>
            <p className="setup-hint">{exactUnique
                ? "Каждому игроку — указанное число особых кварталов. Остальные карты стартовой руки — базовые."
                : "Каждому игроку. Особых кварталов может выпасть больше указанного минимума."}</p>
            <div className="create-game-subtitle">Первому владельцу короны уменьшить</div>
            <div className="starting-settings-fields crown-settings-fields">
                {[["cards", "Число карт на"], ["gold", "Число золотых на"]].map(([key, label]) =>
                    <label className="starting-number" key={key} htmlFor={"crown-reduction-" + key}>
                        <span>{label}</span>
                        <input id={"crown-reduction-" + key} type="number" min="0" step="1" inputMode="numeric"
                               value={this.state.starting.firstCrownReduction[key]} disabled={busy}
                               aria-invalid={!Number.isSafeInteger(this.state.starting.firstCrownReduction[key]) || this.state.starting.firstCrownReduction[key] < 0
                                   || (key === "cards" && this.state.starting.firstCrownReduction.cards > this.state.starting.handSize - this.state.starting.minUnique)
                                   || (key === "gold" && this.state.starting.firstCrownReduction.gold > this.state.starting.gold)}
                               onChange={event => this.handleNestedNumberChange("starting", "firstCrownReduction", key, event.target.value)}/>
                    </label>)}
            </div>
            <p className="setup-hint">Только при начале партии. Минимум особых кварталов сохраняется и для владельца короны.</p>
            <div className="city-settings-block">
                <div className="create-game-subtitle">Завершение города</div>
                <div className="city-settings">
                    <label htmlFor="city-size">Кварталов для завершения города</label>
                    <input id="city-size" type="number" min="2" max="10" step="1" inputMode="numeric"
                           value={citySize} disabled={busy}
                           aria-invalid={!Number.isInteger(citySize) || citySize < 2 || citySize > 10}
                           onChange={event => this.handleSetupNumberChange("rules", "citySize", event.target.value)}/>
                </div>
                <p className="setup-hint">{automatic ? "Автоматически: 8 для троих, 7 для остальных составов." : "Заданный размер сохраняется при изменении числа игроков."}</p>
                <button type="button" className="city-reset" disabled={busy || automatic}
                        onClick={() => this.setState({rules: Object.assign({}, this.state.rules, {citySize: null})})}>По умолчанию</button>
            </div>
            <div className="create-game-subtitle">Бонусные очки</div>
            <div className="starting-settings-fields">
                {[["firstCity", "Первому завершившему город"], ["otherCities", "Остальным завершившим город"], ["allColors", "За все пять цветов"]].map(([key, label]) =>
                    <label className="starting-number" key={key} htmlFor={"bonus-" + key}>
                        <span>{label}</span>
                        <input id={"bonus-" + key} type="number" min="0" step="1" inputMode="numeric"
                               value={this.state.rules.bonuses[key]} disabled={busy}
                               aria-invalid={!Number.isSafeInteger(this.state.rules.bonuses[key]) || this.state.rules.bonuses[key] < 0}
                               onChange={event => this.handleNestedNumberChange("rules", "bonuses", key, event.target.value)}/>
                    </label>)}
            </div>
            <p className="setup-hint">Первый бонус — полный, без прибавления бонуса остальных. Ноль отключает бонус.</p>
            <label className="random-discard-option">
                <input type="checkbox" disabled={busy} checked={this.state.rules.preventRepeatedRandomDiscard}
                       onChange={event => this.setState({rules: Object.assign({}, this.state.rules, {preventRepeatedRandomDiscard: event.target.checked})})}/>
                Не сбрасывать одного персонажа случайно два раунда подряд
            </label>
            <p className="setup-hint">Открытый, закрытый и дополнительный случайный сброс для троих. Ручной сброс не ограничен.</p>
        </div>;
    }

    renderAdvancedSettings(summary, canExport) {
        const busy = this.state.importPending || this.props.data.setupPending;
        return <section className="advanced-settings" aria-labelledby="advanced-settings-title">
            <div className="advanced-settings-heading">
                <span className="advanced-settings-anchor">
                    <button type="button" className="advanced-settings-toggle" aria-expanded={this.state.advancedOpen}
                            aria-controls="advanced-settings-content"
                            onClick={() => this.setState({advancedOpen: !this.state.advancedOpen})}>
                        <span className="advanced-settings-chevron" aria-hidden="true">{this.state.advancedOpen ? "▾" : "▸"}</span>
                        <span id="advanced-settings-title">Расширенные настройки</span>
                    </button>
                    <SetupHelp/>
                </span>
            </div>
            <div id="advanced-settings-content" hidden={!this.state.advancedOpen}>
                {this.renderBasicDeck(summary)}
                {this.renderStartingSettings()}
            </div>
            <div className="basic-deck-total" role="status" aria-live="polite">
                {summary ? <div><strong>Всего кварталов: {summary.total}</strong>
                    <div className="basic-deck-breakdown">Базовых: {summary.basic} · Особых: {summary.unique}</div>
                </div> : "Проверьте количества базовых кварталов"}
            </div>
            {this.state.importError ? <div className="setup-error" role="alert">{this.state.importError}</div> : null}
            {this.state.importMessage ? <div className="setup-message" role="status">{this.state.importMessage}</div> : null}
            <div className="setup-file-actions">
                <button type="button" disabled={busy} onClick={() => this.importInput.click()}>Импорт JSON</button>
                <button type="button" disabled={!canExport || busy} onClick={() => this.handleExportSetup()}>Экспорт JSON</button>
                <input ref={input => this.importInput = input} type="file" accept=".json,application/json"
                       hidden onChange={event => this.handleImportSetup(event)}/>
            </div>
        </section>;
    }

    renderBasicDeck(summary) {
        const group = this.state.basicGroup;
        const busy = this.state.importPending || this.props.data.setupPending;
        return <div className="deck-settings">
            <div className="create-game-subtitle">Базовая колода</div>
            <div id="basic-deck-builder">
                <div className="basic-deck-tabs" role="tablist" aria-label="Типы базовых кварталов">
                    {CitadelsSetup.groups.map((item, index) =>
                        <button key={item.type} id={"deck-tab-" + item.type} type="button" role="tab"
                                className={"basic-deck-tab district-kind-" + item.type}
                                aria-selected={group === item.type} aria-controls="basic-deck-cards"
                                tabIndex={group === item.type ? 0 : -1}
                                onClick={() => this.setState({basicGroup: item.type})}
                                onKeyDown={event => {
                                    let next;
                                    if (event.key === "ArrowRight") next = (index + 1) % 4;
                                    if (event.key === "ArrowLeft") next = (index + 3) % 4;
                                    if (event.key === "Home") next = 0;
                                    if (event.key === "End") next = 3;
                                    if (next !== undefined) {
                                        event.preventDefault();
                                        const type = CitadelsSetup.groups[next].type;
                                        this.setState({basicGroup: type}, () => document.getElementById("deck-tab-" + type).focus());
                                    }
                                }}>
                            {item.name} <span>{summary ? summary.byType[item.type] : "—"}</span>
                        </button>)}
                </div>
                <div id="basic-deck-cards" className="basic-deck-cards" role="tabpanel"
                     aria-labelledby={"deck-tab-" + group}>
                    {CitadelsSetup.basicIds.filter(id => CitadelsSetup.districts[id].type === group).map(id => {
                        const card = CitadelsSetup.districts[id], count = this.state.basicCounts[id];
                        const invalid = !Number.isInteger(count) || count < 0 || count > CitadelsSetup.MAX_COPIES;
                        return <div key={id} className={cs("basic-deck-card", {excluded: count === 0})}>
                            <div className="basic-deck-card-image">
                                <Card card={{type: id}} type="card" game={this.props.game} isGallery={true}/>
                            </div>
                            <label htmlFor={"deck-count-" + id}>{card.name}</label>
                            <div className="basic-deck-cost">Стоимость: {card.cost}</div>
                            <div className="basic-deck-counter">
                                <button type="button" disabled={busy || count <= 0}
                                        aria-label={"Уменьшить количество: " + card.name}
                                        onClick={() => this.handleBasicCountChange(id, Math.max(0, (Number(count) || 0) - 1))}>−</button>
                                <input id={"deck-count-" + id} type="number" min="0" max={CitadelsSetup.MAX_COPIES}
                                       step="1" inputMode="numeric" value={count} disabled={busy}
                                       aria-label={"Количество: " + card.name} aria-invalid={invalid}
                                       onChange={event => this.handleBasicCountChange(id, event.target.value)}/>
                                <button type="button" disabled={busy || count >= CitadelsSetup.MAX_COPIES}
                                        aria-label={"Увеличить количество: " + card.name}
                                        onClick={() => this.handleBasicCountChange(id, Math.min(CitadelsSetup.MAX_COPIES, (Number(count) || 0) + 1))}>+</button>
                            </div>
                        </div>;
                    })}
                </div>
                <button type="button" className="basic-deck-reset" disabled={busy}
                        onClick={() => this.setState({basicCounts: CitadelsSetup.getDefaultBasicCounts()})}>
                    По умолчанию
                </button>
            </div>
        </div>;
    }

    handleClickCharacter(set, type) {
        const
            card = `${type}_${set}`,
            currentCharacters = this.state.charactersSelected,
            alreadyHas = currentCharacters.has(card);
        let unsetSelectedPreset;
        if (!this.state.charactersAvailable.has(card) && !(type === 9 && alreadyHas))
            return;
        if (type === 9 && (![3, 8].includes(this.playerCount) || !alreadyHas)) {
            unsetSelectedPreset = true;
            if (!alreadyHas) {
                currentCharacters.delete("9_1");
                currentCharacters.delete("9_2");
                currentCharacters.delete("9_3");
                currentCharacters.add(card);
            } else {
                currentCharacters.delete(card);
            }
        } else if (type !== 9) {
            unsetSelectedPreset = this.replaceCharacter(type - 1, card);
        }
        if (unsetSelectedPreset && this.state.presetSelected) {
            if (!((type === 9 && alreadyHas)
                || (type === 9 && !alreadyHas && this.presets[this.state.presetSelected].characters[8] === card)
                || (type === 9 && this.presets[this.state.presetSelected].characters.includes("9_2") && this.playerCount < 5)
                || (type === 4 && this.presets[this.state.presetSelected].characters.includes("4_2") && this.playerCount < 3)))
                this.state.presetSelected = null;
        }
        this.setState(this.state);
    }

    handleClickDistrict(district) {
        if (this.playerCount < 4 && district === "theater")
            return;
        if (!this.state.districtsSelected.has(district))
            this.state.districtsSelected.add(district);
        else
            this.state.districtsSelected.delete(district);
        this.state.presetSelected = null;
        this.setState(this.state);
    }

    replaceCharacter(position, character) {
        const characters = [...this.state.charactersSelected];
        if (characters[position] !== character) {
            characters[position] = character;
            this.state.charactersSelected = new Set(characters);
            return true;
        }
    }

    getTimerPresets() {
        return CitadelsSetup.timerPresets;
    }

    getTimerSettings(data) {
        if (!this.state.timerSettings)
            this.state.timerSettings = CitadelsSetup.normalizeTimerSettings(data.timerSettings);
        return this.state.timerSettings;
    }

    handleClickTimerPreset(preset) {
        const presetSettings = this.getTimerPresets()[preset];
        this.state.timerSettings = {
            enabled: true,
            preset,
            characterDurationMs: presetSettings.characterDurationMs,
            mainDurationMs: presetSettings.mainDurationMs,
            responseDurationMs: presetSettings.responseDurationMs
        };
        this.setState(this.state);
    }

    handleTimerEnabledChange(evt) {
        this.state.timerSettings.enabled = evt.target.checked;
        this.setState(this.state);
    }

    handleTimerDurationChange(kind, value) {
        let duration = Number(value);
        if (kind === "characterDurationMs" && duration > 0 && duration < 30000)
            duration = 30000;
        if (kind === "mainDurationMs" && duration > 0 && duration < 30000)
            duration = 30000;
        if (kind === "responseDurationMs" && duration > 0 && duration < 10000)
            duration = 10000;
        this.state.timerSettings[kind] = duration;
        this.state.timerSettings.preset = "custom";
        this.state.timerSettings.enabled = !!(this.state.timerSettings.characterDurationMs || this.state.timerSettings.mainDurationMs || this.state.timerSettings.responseDurationMs);
        this.setState(this.state);
    }

    formatTimerDuration(durationMs) {
        if (!durationMs)
            return "off";
        const seconds = Math.floor(durationMs / 1000);
        return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} мин.` : `${seconds} сек.`;
    }

    getPresets() {
        return {
            basic: {
                name: "Базовая",
                desc: "Базовый набор кварталов и персонажей. Лучше всего подходит для знакомства с игрой.",
                characters: [
                    "1_1",
                    "2_1",
                    "3_1",
                    "4_1",
                    "5_1",
                    "6_1",
                    "7_1",
                    "8_1"
                ],
                quarters: [
                    "dragon_gate",
                    "factory",
                    "haunted_quarter",
                    "imperial_treasury",
                    "keep",
                    "laboratory",
                    "library",
                    "map_room",
                    "quarry",
                    "den_of_thieves",
                    "well_of_wishes"
                ]
            },
            aristocrats: {
                name: "Амбициозные аристократы",
                desc: "Вы сможете сосредоточиться на строительстве кварталов (или попытках получить их другими путями). У вас будет много возможностей построить несколько кварталов за ход.",
                characters: [
                    "1_3",
                    "2_1",
                    "3_2",
                    "4_3",
                    "5_1",
                    "6_3",
                    "7_1",
                    "8_3",
                    "9_2"
                ],
                quarters: [
                    "capitol",
                    "factory",
                    "framework",
                    "great_wall",
                    "haunted_quarter",
                    "keep",
                    "necropolis",
                    "park",
                    "poor_house",
                    "quarry",
                    "school_of_magic",
                    "stable",
                    "memorial",
                    "den_of_thieves"
                ]
            },
            agents: {
                name: "Хитроумные агенты",
                desc: "В основе этой комбинации лежит прямое противостояние игроков. В партии с таким составом вас ждёт немало любопытных ситуаций.",
                characters: [
                    "1_2",
                    "2_2",
                    "3_1",
                    "4_2",
                    "5_2",
                    "6_2",
                    "7_1",
                    "8_1",
                    "9_3"
                ],
                quarters: [
                    "arsenal",
                    "basilica",
                    "dragon_gate",
                    "gold_mine",
                    "keep",
                    "monument",
                    "museum",
                    "necropolis",
                    "park",
                    "poor_house",
                    "quarry",
                    "secret_vault",
                    "forgery",
                    "theater"
                ]
            },
            emissary: {
                name: "Видные эмиссары",
                desc: "Эта комбинация менее агрессивна, чем предыдущая. У вас будет немало способов защитить свои владения и несколько альтернативных путей получить ресурсы.",
                characters: [
                    "1_2",
                    "2_3",
                    "3_3",
                    "4_2",
                    "5_1",
                    "6_1",
                    "7_3",
                    "8_2",
                    "9_1"
                ],
                quarters: [
                    "factory",
                    "framework",
                    "great_wall",
                    "haunted_quarter",
                    "ivory_tower",
                    "keep",
                    "library",
                    "museum",
                    "observatory",
                    "park",
                    "poor_house",
                    "quarry",
                    "school_of_magic",
                    "forgery"
                ]
            },
            dignitaries: {
                name: "Коварные сановники",
                desc: "Блеф, интриги, попытки раскусить соперников и предугадать их тактику — вот ключевые особенности этой комбинации.",
                characters: [
                    "1_3",
                    "2_2",
                    "3_2",
                    "4_1",
                    "5_2",
                    "6_2",
                    "7_2",
                    "8_3",
                    "9_2"
                ],
                quarters: [
                    "dragon_gate",
                    "factory",
                    "framework",
                    "haunted_quarter",
                    "laboratory",
                    "necropolis",
                    "park",
                    "poor_house",
                    "secret_vault",
                    "forgery",
                    "stable",
                    "theater",
                    "den_of_thieves",
                    "well_of_wishes"
                ]
            },
            messengers: {
                name: "Неуступчивые посланники",
                desc: "Вы сможете проверить, как взаимодействуют друг с другом различные карты персонажей и кварталов на пределе своих возможностей.",
                characters: [
                    "1_1",
                    "2_3",
                    "3_3",
                    "4_1",
                    "5_3",
                    "6_3",
                    "7_3",
                    "8_2",
                    "9_1"
                ],
                quarters: [
                    "basilica",
                    "capitol",
                    "haunted_quarter",
                    "imperial_treasury",
                    "laboratory",
                    "library",
                    "map_room",
                    "observatory",
                    "school_of_magic",
                    "secret_vault",
                    "forgery",
                    "stable",
                    "memorial",
                    "well_of_wishes"
                ]
            },
            nobles: {
                name: "Порочные дворяне",
                desc: "Вас ждёт беспощадное противостояние, полное интриг и жёсткой агрессии. В общем, не для слабонервных…",
                characters: [
                    "1_1",
                    "2_1",
                    "3_1",
                    "4_3",
                    "5_3",
                    "6_1",
                    "7_2",
                    "8_1",
                    "9_3"
                ],
                quarters: [
                    "arsenal",
                    "basilica",
                    "dragon_gate",
                    "gold_mine",
                    "imperial_treasury",
                    "ivory_tower",
                    "laboratory",
                    "map_room",
                    "monument",
                    "museum",
                    "school_of_magic",
                    "memorial",
                    "den_of_thieves",
                    "well_of_wishes"
                ]
            }
        };
    }

    handleClickChangePreset(preset) {
        this.changePreset(preset);
        this.setState(this.state);
    }

    handleClickSelectAllDistricts() {
        this.state.presetSelected = null;
        this.state.districtsSelected = new Set(this.game.getUniqueDistricts());
        this.setState(this.state);
    }

    changePreset(preset, refresh) {
        this.state.preserveCharacters = false;
        if (this.state.presetSelected === preset && !refresh)
            this.state.presetSelected = null;
        else
            this.state.presetSelected = preset;
        this.state.charactersSelected = new Set(this.presets[preset].characters);
        this.state.districtsSelected = new Set(this.presets[preset].quarters);
    }

    render() {
        const
            data = this.props.data,
            game = this.props.game,
            galleryMode = this.props.galleryMode,
            playerCount = data.playerSlots && data.playerSlots.filter((slot) => slot !== null).length,
            getNineCharacterAvailable = (set) => set !== 2
                ? (playerCount < 3
                    ? []
                    : [`9_${set}`])
                : (playerCount < 5
                    ? []
                    : [`9_2`]),
            getEmperorAvailable = () => (playerCount < 3
                ? []
                : [`4_2`]);

        this.game = game;

        if (!this.presets)
            this.presets = this.getPresets();
        if (!this.timerPresets)
            this.timerPresets = this.getTimerPresets();
        const timerSettings = this.getTimerSettings(data);

        if (this.state.presetSelected === undefined || (data.phase !== 0 && this.wasNotStarted)) {
            if (data.presetSelected)
                this.state.presetSelected = data.presetSelected;
            else
                this.state.presetSelected = galleryMode ? null : "basic";
        }
        this.wasNotStarted = data.phase === 0;

        if (this.state.presetSelected && !Object.prototype.hasOwnProperty.call(this.presets, this.state.presetSelected))
            this.state.presetSelected = null;

        if (this.playerCount !== playerCount && this.state.presetSelected && !this.state.preserveCharacters)
            this.changePreset(this.state.presetSelected, true);

        this.playerCount = playerCount;

        this.state.charactersAvailable = new Set([
            "1_1", "2_1", "3_1", "4_1", "5_1", "6_1", "7_1", "8_1", ...getNineCharacterAvailable(1),
            "1_2", "2_2", "3_2", ...getEmperorAvailable(), "5_2", "6_2", "7_2", "8_2", ...getNineCharacterAvailable(2),
            "1_3", "2_3", "3_3", "4_3", "5_3", "6_3", "7_3", "8_3", ...getNineCharacterAvailable(3)
        ]);

        if (!this.state.charactersSelected)
            this.state.charactersSelected = new Set([
                "1_1", "2_1", "3_1", "4_1", "5_1", "6_1", "7_1", "8_1"
            ]);
        else if (!this.state.preserveCharacters)
            this.state.charactersSelected.forEach((character) => {
                if (!this.state.charactersAvailable.has(character)) {
                    if (character === "4_2")
                        this.replaceCharacter(3, "4_1");
                    else
                        this.state.charactersSelected.delete(character);
                }
            });

        if (!this.state.preserveCharacters && (playerCount === 3 || playerCount === 8) && !(this.state.charactersSelected.has("9_1")
            || this.state.charactersSelected.has("9_2") || this.state.charactersSelected.has("9_3")))
            this.state.charactersSelected.add("9_1");

        if (!this.state.districtsSelected)
            this.state.districtsSelected = new Set(game.getUniqueDistricts());

        if (playerCount < 4)
            this.state.districtsSelected.delete("theater");

        const showAllCards = !this.state.presetSelected && galleryMode;
        let setup, summary, setupErrors = [];
        if (!galleryMode) {
            try {
                setup = this.getSetup();
                summary = CitadelsSetup.getDeckSummary(setup.districts.basic, setup.districts.unique);
                setupErrors = CitadelsSetup.getStartErrors(setup, playerCount);
            } catch (error) {
                setupErrors = [error.message];
            }
        }
        const setupBusy = this.state.importPending || data.setupPending;

        return <div className={cs("create-game-panel", {galleryMode, noPresetSelected: !this.state.presetSelected})}>
            <div className="create-game-panel-modal" role="dialog" aria-modal="true" aria-labelledby="create-game-title">
                <div className="create-game-header">
                    <div className="create-game-title" id="create-game-title">{galleryMode ? "Галерея карт" : "Настройки игры"}</div>
                    {!galleryMode ? <div className="create-game-player-count">Игроков: {playerCount}</div> : null}
                </div>
                <div className="characters-panel">
                    <div className="create-game-subtitle">Комбинации</div>
                    <div className="presets-list">
                        {Object.keys(this.presets).map((preset) =>
                            <div className={cs("preset-item", {selected: this.state.presetSelected === preset})}
                                 onClick={() => this.handleClickChangePreset(preset)}>
                                {this.presets[preset].name}
                            </div>)}
                    </div>
                    <div className="preset-description">
                        {
                            this.state.presetSelected
                                ? this.presets[this.state.presetSelected].desc
                                : !galleryMode ? "Ваша собственная комбинация" : "Комбинация не выбрана"
                        }
                    </div>
                    <div className="create-game-subtitle">Персонажи</div>
                    <div className="characters-set">
                        {Array(3).fill(null).map((_, set) =>
                            <div className="characters-row">
                                {Array(9).fill(null).map((_, type) => {
                                        const card = `${type + 1}_${set + 1}`;
                                        return <div key={card} data-character={card}
                                            className={cs("character-slot", {
                                                incompatible: !galleryMode && this.state.charactersSelected.has(card) && !this.state.charactersAvailable.has(card),
                                                available: showAllCards || this.state.charactersAvailable.has(card),
                                                selected: showAllCards || this.state.charactersSelected.has(card)
                                            })}>
                                            <Card card={card} type="character"
                                                  game={game} isGallery={true}
                                                  onClick={() => !galleryMode && this.handleClickCharacter(set + 1, type + 1)}/>
                                        </div>;
                                    }
                                )}
                            </div>)}

                    </div>
                    <div className="create-game-subtitle">Уникальные кварталы
                        {!galleryMode
                            ? <span onClick={() => this.handleClickSelectAllDistricts()}
                                    className="add-all-districts">(Добавить все)</span>
                            : ""}</div>
                    <div className="district-set">
                        {game.getUniqueDistricts().map((district) => (
                            <div className={cs("district-slot", {
                                selected: showAllCards || this.state.districtsSelected.has(district)
                            })}>
                                <Card card={{type: district}} type="card"
                                      game={game}
                                      onClick={() => !galleryMode && this.handleClickDistrict(district)}/>
                            </div>
                        ))}
                    </div>
                    {!galleryMode ? this.renderAdvancedSettings(summary, !!setup) : null}
                    {!galleryMode ? <div className="timer-settings">
                        <div className="create-game-subtitle">Настройки времени</div>
                        <label className="timer-enabled">
                            <input type="checkbox"
                                   checked={timerSettings.enabled}
                                   onChange={(evt) => this.handleTimerEnabledChange(evt)}/>
                            Включить
                        </label>
                        <div className="timer-presets-list">
                            {Object.keys(this.timerPresets).map((preset) =>
                                <div className={cs("timer-preset-item", {selected: timerSettings.preset === preset})}
                                     onClick={() => this.handleClickTimerPreset(preset)}>
                                    {this.timerPresets[preset].name}
                                </div>)}
                        </div>
                        <div className="timer-slider-row">Выбор персонажа:</div>
                        <div className="timer-slider-row">
                            <div className="timer-slider-label">{this.formatTimerDuration(timerSettings.characterDurationMs)}</div>
                            <input type="range"
                                   min="0"
                                   max={CitadelsSetup.timerLimits.characterDurationMs.max}
                                   step="1"
                                   value={timerSettings.characterDurationMs}
                                   onChange={(evt) => this.handleTimerDurationChange("characterDurationMs", evt.target.value)}/>
                        </div>
                        <div className="timer-slider-row">Основной ход: </div>
                        <div className="timer-slider-row">
                            <div className="timer-slider-label">{this.formatTimerDuration(timerSettings.mainDurationMs)}</div>
                            <input type="range"
                                   min="0"
                                   max={CitadelsSetup.timerLimits.mainDurationMs.max}
                                   step="1"
                                   value={timerSettings.mainDurationMs}
                                   onChange={(evt) => this.handleTimerDurationChange("mainDurationMs", evt.target.value)}/>
                        </div>
                        <div className="timer-slider-row">Ответное действие:</div>
                        <div className="timer-slider-row">
                            <div className="timer-slider-label">{this.formatTimerDuration(timerSettings.responseDurationMs)}</div>
                            <input type="range"
                                   min="0"
                                   max={CitadelsSetup.timerLimits.responseDurationMs.max}
                                   step="1"
                                   value={timerSettings.responseDurationMs}
                                   onChange={(evt) => this.handleTimerDurationChange("responseDurationMs", evt.target.value)}/>
                        </div>
                    </div> : ""}
                </div>
                <div className="setup-footer">
                {!galleryMode && setupErrors.length ? <div className="setup-error" role="alert">
                    {setupErrors.map(error => <div key={error}>{error}</div>)}
                </div> : null}
                {!galleryMode && data.setupError ? <div className="setup-error" role="alert">{data.setupError}</div> : null}
                <div className="create-game-buttons">
                    <button
                        onClick={() => game.handleClickCloseCreateGame()}>{!galleryMode ? "Отмена" : "Закрыть"}</button>
                    {!galleryMode ? <button disabled={!!setupErrors.length || setupBusy}
                        className={cs({inactive: !!setupErrors.length || setupBusy})}
                        onClick={() => !setupErrors.length && !setupBusy && game.handleClickCreateGame(
                            setup.characters, setup.districts.unique, this.state.presetSelected, setup.timer, setup.districts.basic,
                            {starting: setup.starting, rules: setup.rules})}>
                        {data.setupPending ? "Создание…" : "Создать"}
                    </button> : ""}
                </div>
                </div>
            </div>
        </div>;
    }
}

class SetupViewer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {advancedOpen: false};
    }
    componentDidMount() {
        this.previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
    }
    componentWillUnmount() {
        document.body.style.overflow = this.previousBodyOverflow;
    }
    render() {
        const {data, game} = this.props;
        const setup = data.phase !== 0 ? data.gameSetup : data.setupDraft;
        const players = data.playerSlots.filter(user => user !== null).length;
        const citySize = data.phase !== 0 && data.citySize ? data.citySize : setup && CitadelsSetup.getCitySize(players, setup.rules);
        const summary = setup && CitadelsSetup.getDeckSummary(setup.districts.basic, setup.districts.unique);
        const resources = setup && CitadelsSetup.getStartingResources(setup.starting, true);
        const entry = (label, value) => <div className="setup-view-entry" key={label}><dt>{label}</dt><dd>{value}</dd></div>;
        return <div className="create-game-panel setup-viewer">
            <div className="create-game-panel-modal" role="dialog" aria-modal="true" aria-labelledby="setup-view-title">
                <div className="create-game-header">
                    <div className="create-game-title" id="setup-view-title">Сетап партии</div>
                    <div className="create-game-player-count">Игроков: {players} · Только просмотр</div>
                </div>
                <div className="characters-panel">
                    {!setup ? <p>Сетап этой партии не сохранён в старом формате. Партия продолжает действовать по своим правилам.</p> : <>
                        {data.phase === 0 ? <p className="setup-hint">Настройки следующей партии. Изменения хозяина обновляются автоматически.</p> : null}
                        {data.phase === 0 && data.setupDraftInvalid ? <div className="setup-error" role="status">
                            Хозяин редактирует некорректные значения. Показан последний корректный сетап.
                        </div> : null}
                        <div className="create-game-subtitle">Персонажи</div>
                        <div className="setup-view-cards">
                            {setup.characters.map(card => <Card key={card} card={card} type="character" game={game} isGallery={true}/>) }
                        </div>
                        <div className="create-game-subtitle">Особые кварталы</div>
                        <div className="setup-view-cards">
                            {setup.districts.unique.map(id => <Card key={id} card={{type: id}} type="card" game={game} isGallery={true}/>) }
                            {!setup.districts.unique.length ? <p>Не выбраны</p> : null}
                        </div>
                        <section className="advanced-settings">
                            <div className="advanced-settings-heading">
                                <button type="button" className="advanced-settings-toggle"
                                        aria-expanded={this.state.advancedOpen} aria-controls="setup-view-advanced"
                                        onClick={() => this.setState({advancedOpen: !this.state.advancedOpen})}>
                                    {this.state.advancedOpen ? "▾ " : "▸ "}Расширенные настройки
                                </button>
                            </div>
                            <div id="setup-view-advanced" hidden={!this.state.advancedOpen}>
                                <div className="create-game-subtitle">Базовая колода</div>
                                <dl className="setup-view-values">
                                    {CitadelsSetup.basicIds.map(id => entry(CitadelsSetup.districts[id].name, setup.districts.basic[id]))}
                                </dl>
                                <div className="create-game-subtitle">Стартовые ресурсы</div>
                                <dl className="setup-view-values">
                                    {entry("Карт каждому", setup.starting.handSize)}
                                    {entry(setup.starting.exactUnique ? "Особых — фиксированное число" : "Минимум особых", setup.starting.minUnique)}
                                    {entry("Золота каждому", setup.starting.gold)}
                                    {entry("Уменьшение карт первой короны", setup.starting.firstCrownReduction.cards)}
                                    {entry("Уменьшение золота первой короны", setup.starting.firstCrownReduction.gold)}
                                    {entry("Первая корона: карты / золото", resources.handSize + " / " + resources.gold)}
                                </dl>
                                <div className="create-game-subtitle">Правила и бонусы</div>
                                <dl className="setup-view-values">
                                    {entry("Размер города", citySize + (setup.rules.citySize === null ? " (по числу игроков)" : ""))}
                                    {entry("Первому завершившему", setup.rules.bonuses.firstCity)}
                                    {entry("Остальным завершившим", setup.rules.bonuses.otherCities)}
                                    {entry("За все пять цветов", setup.rules.bonuses.allColors)}
                                    {entry("Запрет повторного случайного сброса", setup.rules.preventRepeatedRandomDiscard ? "Включён" : "Выключен")}
                                </dl>
                            </div>
                            <div className="basic-deck-total"><strong>Всего кварталов: {summary.total}</strong>
                                <div className="basic-deck-breakdown">Базовых: {summary.basic} · Особых: {summary.unique}</div>
                            </div>
                        </section>
                        <div className="create-game-subtitle">Настройки времени</div>
                        <dl className="setup-view-values">
                            {entry("Таймер", setup.timer.enabled ? "Включён" : "Выключен")}
                            {[["characterDurationMs", "Выбор персонажа"], ["mainDurationMs", "Основной ход"], ["responseDurationMs", "Ответное действие"]]
                                .map(([key, label]) => entry(label, setup.timer[key] ? setup.timer[key] / 1000 + " сек." : "Выключен"))}
                        </dl>
                    </>}
                </div>
                <div className="setup-footer"><div className="create-game-buttons">
                    <button onClick={() => game.handleClickCloseCreateGame()}>Закрыть</button>
                </div></div>
            </div>
        </div>;
    }
}

class DistrictPileCounters extends SetupHelp {
    show() {
        this.setState({open: true}, () => {
            if (!this.button || !this.tip) return;
            const anchor = this.button.getBoundingClientRect(), tip = this.tip.getBoundingClientRect();
            const width = document.documentElement.clientWidth, height = window.innerHeight;
            const beside = anchor.left >= tip.width + 16;
            const left = Math.max(8, Math.min(beside ? anchor.left - tip.width - 8 : anchor.right - tip.width, width - tip.width - 8));
            const top = Math.max(8, Math.min(beside ? anchor.top : anchor.bottom + 8, height - tip.height - 8));
            this.setState({left, top});
        });
    }
    render() {
        const {data} = this.props;
        const deck = data.districtDeckCount == null ? "—" : data.districtDeckCount;
        const discard = data.districtDiscardCount == null ? "—" : data.districtDiscardCount;
        return <div className="district-pile-counts" onMouseEnter={() => this.show()} onMouseLeave={this.close}>
            <button type="button" ref={button => this.button = button} aria-label={"В колоде: " + deck + ". В сбросе: " + discard}
                    aria-expanded={this.state.open} aria-describedby={this.state.open ? "district-pile-help" : undefined}
                    onFocus={() => this.show()} onBlur={this.close} onClick={() => this.show()}
                    onKeyDown={event => {if (event.key === "Escape") this.close();}}>
                <span><i className="material-icons" aria-hidden="true">style</i><strong data-pile="deck">{deck}</strong></span>
                <span><i className="material-icons" aria-hidden="true">layers_clear</i><strong data-pile="discard">{discard}</strong></span>
            </button>
            {this.state.open ? ReactDOM.createPortal(
                <div id="district-pile-help" role="tooltip" className="setup-help-tooltip district-pile-tooltip"
                     ref={tip => this.tip = tip} style={{left: this.state.left, top: this.state.top}}>
                    <div><strong>В колоде:</strong> {deck}</div><div><strong>В сбросе:</strong> {discard}</div>
                    <p>Когда колода заканчивается, сброс перемешивается и становится новой колодой.</p>
                    <p>Карты в руках, городах и на выборе в эти счётчики не входят.</p>
                </div>, document.body) : null}
        </div>;
    }
}

class Game extends React.Component {

    componentDidMount() {
        this.gameName = "citadels";
        const initArgs = CommonRoom.roomInit(this);
        this.initSounds();
        this.socket.on("state", (state) => {
            CommonRoom.processCommonRoom(state, this.state, {
                maxPlayers: 8,
                largeImageKey: "citadels",
                details: "Citadels"
            }, this);
            if (this.state && this.state.currentPlayer !== this.state.userSlot && state.currentPlayer === this.state.userSlot)
                this.playSound("chime");
            if (state.sound)
                this.playSound(state.sound);
            const nextState = Object.assign({}, this.state, {
                userId: this.userId,
                userSlot: state.playerSlots.indexOf(this.userId),
                serverReceivedAt: Date.now(),
                sound: null
            }, state);
            if (state.phase !== 0 || nextState.userId !== nextState.hostId) {
                nextState.showCreateGamePanel = false;
                nextState.setupPending = false;
                nextState.setupError = null;
            }
            this.resetLocalActionIfStale(nextState);
            this.setState(nextState);
        });
        this.socket.on("setup-error", (message) => {
            this.setState({setupPending: false, setupError: message});
        });
        this.socket.on("setup-draft-error", (message) => {
            this.setState({setupError: message});
        });
        this.socket.on("player-state", (player) => {
            const nextState = Object.assign({}, this.state, {
                player: player
            });
            this.resetLocalActionIfStale(nextState);
            this.setState(nextState);
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

    resetLocalActionIfStale(state) {
        const
            hasLocalSelection = state.userAction || state.cardChosen.length || state.playerChosen !== null || state.buildTarget !== null,
            player = state.player || {},
            isCurrentPlayer = state.currentPlayer === state.userSlot,
            resetLocalSelection = () => {
                state.userAction = null;
                state.cardChosen = [];
                state.playerChosen = null;
                state.buildTarget = null;
            };
        if (!hasLocalSelection)
            return;
        if (!isCurrentPlayer || state.phase === 0 || state.winnerPlayer != null)
            return resetLocalSelection();
        if (state.userAction) {
            const actionByUserAction = {
                magician: "magician-action",
                emperor: "emperor-action",
                spy: "spy-action",
                "cardinal-action-player": "cardinal-action",
                "cardinal-action-cards": "cardinal-action"
            };
            if (actionByUserAction[state.userAction] && player.action !== actionByUserAction[state.userAction])
                return resetLocalSelection();
            if (!actionByUserAction[state.userAction] && state.phase !== 2)
                return resetLocalSelection();
        } else if (state.cardChosen.length && !["magistrate-action", "blackmailer-action", "diplomat-action"].includes(player.action)) {
            return resetLocalSelection();
        }
    }

    constructor() {
        super();
        this.state = {
            inited: false,
            userAction: null,
            cardChosen: [],
            playerChosen: null,
            soundsMuted: localStorage.citadelsSoundsMuted === "true"
        };
    }

    initSounds() {
        this.sounds = {};
    }

    getSound(name) {
        if (!this.sounds[name]) {
            this.sounds[name] = new Audio(`/citadels/sounds/${name}.mp3`);
            this.sounds[name].volume = 0.8;
        }
        return this.sounds[name];
    }

    playSound(name) {
        if (!name || this.state.soundsMuted)
            return;
        const sound = this.getSound(name);
        sound.currentTime = 0;
        const playPromise = sound.play();
        if (playPromise && playPromise.catch)
            playPromise.catch(() => {});
    }

    handleToggleSounds() {
        const soundsMuted = !this.state.soundsMuted;
        localStorage.citadelsSoundsMuted = soundsMuted ? "true" : "false";
        if (soundsMuted && this.sounds)
            Object.values(this.sounds).forEach(sound => sound.pause());
        this.setState({soundsMuted});
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
        this.state.player.action === 'wizard-card-action' ?
            this.socket.emit("wizard-choose-card", card) :
            this.state.player.action === 'scholar-response' ?
                this.socket.emit("scholar-response", card) :
                this.socket.emit("take-card", card);
    }

    handleTakeIncome() {
        if (this.state.currentCharacter !== "5_2") return this.socket.emit('take-income');
        this.setUserAction("abbat");
    }

    handleAbbatIncome(cards) {
        this.socket.emit('abbat-income', cards);
        this.handleStopUserAction();
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

    handleClickHandCard(cardInd, forGold) {
        if (this.state.userAction === "cardinal-action-player")
            return;
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
        } else if (this.state.userAction === "den_of_thieves" && !forGold) {
            if (this.state.player.hand[cardInd].type !== "den_of_thieves")
                this.toggleCardChoose(cardInd);
        } else if (this.state.userAction === "cardinal-action-cards") {
            if (this.state.player.hand[cardInd] !== this.state.buildTarget)
                this.toggleCardChoose(cardInd);
        } else if (this.state.userAction === "necropolis" && !forGold) {
        } else if (this.state.player.action === "seer-return") {
            this.socket.emit("seer-return", cardInd);
        } else {
            const cardType = this.state.player.hand[cardInd].type;
            if (!forGold && cardType === "necropolis" && this.state.playerDistricts[this.state.userSlot].length && (this.state.buildDistricts > 0 || this.state.player.hand[cardInd].wizard))
                this.setUserAction("necropolis");
            else if (!forGold && cardType === "den_of_thieves" && this.state.player.hand.length > 1 && (this.state.buildDistricts > 0 || this.state.player.hand[cardInd].wizard))
                this.setUserAction("den_of_thieves");
            else if (this.state.currentCharacter === "5_3" && this.state.buildDistricts && Object.keys(this.state.playerCharacter).some((player) => this.isCardinalActionAvailable(cardInd, player)))
                this.setUserAction("cardinal-action-player", {buildTarget: cardInd});
            else
                this.socket.emit('build', cardInd);
        }
    }

    getBuildCost(cardInd) {
        const building = this.state.player.hand[cardInd];
        return building.cost - ((building.kind === 9 && this.state.playerDistricts[this.state.userSlot].find((card) => card.type === "factory")) ? 1 : 0);
    }

    isCardinalActionAvailable(cardInd, target) {
        const goldNeeded = this.getBuildCost(cardInd) - this.state.playerGold[this.state.userSlot];
        if (goldNeeded <= 0)
            return false;
        if (goldNeeded > (this.state.player.hand.length - 1))
            return false;
        if (goldNeeded > this.state.playerGold[target])
            return false;
        return true;
    }

    handleCardinalActionPlayer(player) {
        this.setUserAction("cardinal-action-cards", {buildTarget: this.state.buildTarget, playerChosen: player});
    }

    handleCardinalActionCards() {
        const goldNeeded = this.getBuildCost(this.state.buildTarget) - this.state.playerGold[this.state.userSlot];
        if (this.state.cardChosen.length === goldNeeded) {
            this.socket.emit("cardinal-sell", this.state.playerChosen, this.state.buildTarget, this.state.cardChosen);
            this.handleStopUserAction();
        }
    }

    handleBlackmailedResponse(res) {
        this.socket.emit('blackmailed-response', res)
    }

    handleTokenOpen(res) {
        this.state.player.action === 'magistrate-open' ?
            this.socket.emit('magistrate-open', res) :
            this.socket.emit('blackmailed-open', res)
    }

    handleMagician(slot, cards) {
        this.socket.emit('exchange-hand', slot, cards)
    }

    handleWizard(slot) {
        this.socket.emit('wizard-choose-player', slot)
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

    handleAbbat(slot) {
        this.socket.emit('abbat-steal', slot)
    }

    handleSpy(slot) {
        this.setState(Object.assign(this.state, {
            userAction: 'spy',
            playerChosen: slot
        }));
    }

    handleNavigatorResource(res) {
        this.socket.emit('navigator-resources', res)
    }

    handleSeerAction() {
        this.socket.emit('seer-action');
    }

    handleSpyChooseDistrict(districtType) {
        this.socket.emit('spy-choose-player', this.state.playerChosen, districtType);
        this.handleStopUserAction();
    }

    handleSpyCardsEnd() {
        this.socket.emit('spy-cards-end');
    }

    handleScholar() {
        this.socket.emit('scholar-action')
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
        if (this.state.player.action == 'magistrate-action') {
            this.toggleCardChoose(char);
            if (this.state.cardChosen.length == 3) {
                this.socket.emit("magistrate-character", this.state.cardChosen[0], this.state.cardChosen[1], this.state.cardChosen[2]);
                this.handleStopUserAction();
            }
        }
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
        this.handleClickHandCard(index, true);
        this.handleStopUserAction();
    }

    setUserAction(action, params) {
        this.setState(Object.assign(this.state, {
            userAction: action,
            cardChosen: [],
            playerChosen: null,
            buildTarget: null,
        }, params));
    }

    handleStopUserAction() {
        this.setState(Object.assign(this.state, {
            userAction: null,
            cardChosen: [],
            playerChosen: null,
            buildTarget: null
        }));
    }

    handleClickBuilding(slot, card) {
        if (this.state.player.action === 'diplomat-action') {
            if (!this.state.cardChosen.length)
                return this.setState(Object.assign(this.state, {cardChosen: [slot, card]}));
            if (slot === this.state.userSlot && slot === this.state.cardChosen[0])
                return this.setState(Object.assign(this.state, {cardChosen: [slot, card]}));
            if (slot !== this.state.userSlot && this.state.userSlot !== this.state.cardChosen[0])
                return this.setState(Object.assign(this.state, {cardChosen: [slot, card]}));

            if (this.state.cardChosen[0] === this.state.userSlot)
                this.socket.emit('exchange-districts', this.state.cardChosen[1], slot, card);
            else
                this.socket.emit('exchange-districts', card, this.state.cardChosen[0], this.state.cardChosen[1]);
            this.handleStopUserAction();
            return;
        }
        if (this.state.userAction === 'arsenal') {
            this.socket.emit("arsenal-destroy", slot, card);
            this.handleStopUserAction();
            return;
        }
        if (this.state.userAction === "necropolis") {
            this.socket.emit("build-necropolis", card);
            this.handleStopUserAction();
            return;
        }
        if (this.state.player.action === 'warlord-action') return this.socket.emit("destroy", slot, card);
        if (this.state.player.action === 'marshal-action') return this.socket.emit("seize-district", slot, card);
        if (this.state.player.action === 'artist-action') return this.socket.emit("beautify", slot, card);
    }

    handleEndTurn() {
        this.socket.emit('end-turn')
    }

    handleClickTogglePause() {
        if (this.state.phase === 0) {
            this.setState({
                ...this.state,
                showCreateGamePanel: true,
                setupError: null,
                setupPending: false
            });
        }
    }

    handleClickShowCards() {
        this.setState({
            ...this.state,
            showCardsPanel: true
        });
    }

    handleClickCreateGame(charactersSelected, districtsSelected, presetSelected, timerSettings, basicCounts, options) {
        this.setState({setupPending: true, setupError: null});
        this.socket.emit("start-game", charactersSelected, districtsSelected, presetSelected, timerSettings, basicCounts, options);
    }

    handleClickCloseCreateGame() {
        this.setState({
            ...this.state,
            showCreateGamePanel: false,
            showCardsPanel: false
        });
    }

    handleClickStop() {
        popup.confirm({content: `Игра будет закончена. Вы уверены?`}, (evt) => evt.proceed && this.socket.emit("abort-game"));
    }

    handleToggleTeamLockClick() {
        this.socket.emit("toggle-lock");
    }

    handleToggleTimersPause() {
        this.socket.emit("toggle-timers-pause");
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
            }, 400);
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
            popup.confirm({content: `Removing ${window.commonRoom.getPlayerName(id)}?`}, (evt) => evt.proceed && this.socket.emit("remove-player", id));
    }

    handleGiveHost(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Give host ${window.commonRoom.getPlayerName(id)}?`}, (evt) => evt.proceed && this.socket.emit("give-host", id));
    }

    hasDistricts(building) {
        const data = this.state;
        return data.player && data.playerDistricts[data.userSlot] && data.playerDistricts[data.userSlot].some(card => card.type === building) && data.phase === 2
    }

    getUniqueDistricts() {
        return CitadelsSetup.uniqueIds;
    }

    render() {
        const
            data = this.state,
            isHost = data.hostId === data.userId,
            magistrateOpenAction = data.player && data.player.action === 'magistrate-open' && data.phase === 2,
            blackmailedResponseAction = data.player && data.player.action === 'blackmailed-response' && data.phase === 2,
            blackmailedOpenAction = data.player && data.player.action === 'blackmailed-open' && data.phase === 2,
            magicianAction = data.player && data.player.action === 'magician-action' && data.phase === 2,
            emperor = data.player && ['emperor-action', 'emperor-nores-action'].includes(data.player.action) && data.phase === 2,
            emperorAction = data.player && data.userAction === 'emperor' && data.phase === 2,
            abbatIncome = data.player && data.userAction === 'abbat' && data.phase === 2,
            seerAction = data.player && data.player.action === 'seer-action' && data.phase === 2,
            seerReturnAction = data.player && data.player.action === 'seer-return' && data.phase === 2,
            spyUserAction = data.player && data.userAction === 'spy' && data.phase === 2,
            cardinalActionCards = data.player && data.userAction === 'cardinal-action-cards' && data.phase === 2,
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
                || data.phase == 3 || data.phase === 2 && (['assassin-action', 'thief-action', 'witch-action', 'blackmailer-action', 'magistrate-action'].includes(data.player.action))
                && !necropolisAction && !denOfThievesAction);
            let
                userActionText = {
                    magician: "Выберите карты для сброса",
                    arsenal: "Выберите постройку для сноса",
                    framework: "Выберите карту для постройки",
                    museum: "Выберите карту для музея",
                    necropolis: "Вы можете выбрать квартал для разрушения",
                    den_of_thieves: "Вы можете выбрать карты для оплаты",
                    emperor: "Выберите ресурс, за который вы отдадите корону",
                    abbat: "Количество дохода, получаемое картами",
                    spy: "Выберите вид квартала",
                    "cardinal-action-player": "Выберите покупателя",
                    "cardinal-action-cards": "Выберите карты для продажи"
                }[data.userAction];
            if (data.userAction === "cardinal-action-cards")
                userActionText = `${userActionText} (${this.getBuildCost(this.state.buildTarget) - this.state.playerGold[this.state.userSlot]})`;
            let incomeValue = 0;
            if (data.incomeAction && !magistrateOpenAction) {
                const kindIncome = data.currentCharacter.split('_')[0];
                incomeValue = data.playerDistricts[data.userSlot] ? data.playerDistricts[data.userSlot].filter(card => card.kind === Number(kindIncome)).length
                    + data.playerDistricts[data.userSlot].some(card => card.type === "school_of_magic") : 0;
            }
            const canTakeResource = !data.tookResource && !magistrateOpenAction && !seerReturnAction;
            return (
                <div
                    className={cs(`game`, {
                        "double-roles": data.phase > 0 && Object.keys(data.playerCharacter).length <= 3,
                        "game-end": data.winnerPlayer != null,
                        "isPlayer": data.playerSlots.includes(data.userId) && data.phase !== 0 && data.winnerPlayer == null
                    })}
                    onMouseUp={(evt) => this.handleBodyRelease(evt)}>
                    <CommonRoom state={this.state} app={this}/>
                    {data.phase !== 0 ?
                        <div className={cs("character-section", `characters-count-${data.characterInGame.length}`)}>
                            <div className="cards-list">
                                {data.characterInGame.map((card, id) => {
                                    const
                                        magistrated = data.magistrated.includes(card),
                                        blackmailed = data.blackmailed.includes(card),
                                        robbed = card === data.robbed,
                                        assassined = card === data.assassined,
                                        witched = card === data.witched,
                                        trueBlackmailed = data.trueBlackmailed === card || (data.player && data.player.trueBlackmailed === card && data.blackmailed.includes(card)),
                                        trueMagistrated = data.trueMagistrated === card || (data.player && data.player.trueMagistrated === card && data.magistrated.includes(card));
                                    return <div className={cs("token-slot", {
                                        discard: ~data.characterFace.indexOf(card),
                                    })}>
                                        <div className={cs("status", {
                                            "two-icons": (magistrated || trueMagistrated) && (robbed || blackmailed || trueBlackmailed),
                                            magistrated, blackmailed, robbed, assassined, witched
                                        })}>
                                            {assassined ?
                                                <ReactInlineSVG.default src="/citadels/icons/assassinated.svg"
                                                                        className="assassined-icon"/>
                                                : null}
                                            {robbed ?
                                                <ReactInlineSVG.default src="/citadels/icons/robbed.svg"
                                                                        className="robbed-icon"/>
                                                : null}
                                            {witched ?
                                                <ReactInlineSVG.default src="/citadels/icons/witched.svg"
                                                                        className="witched-icon"/>
                                                : null}
                                            {!trueBlackmailed && blackmailed ?
                                                <ReactInlineSVG.default src="/citadels/icons/blackmailed.svg"
                                                                        className="blackmailed-icon"/>
                                                : null}
                                            {trueBlackmailed ?
                                                <ReactInlineSVG.default src="/citadels/icons/blackmailed-true.svg"
                                                                        className="true-blackmailed-icon"/>
                                                : null}
                                            {!trueMagistrated && magistrated ?
                                                <ReactInlineSVG.default src="/citadels/icons/scroll-close.svg"
                                                                        className="magistrated-icon"/>
                                                : null}
                                            {trueMagistrated ?
                                                <ReactInlineSVG.default src="/citadels/icons/scroll-open.svg"
                                                                        className='true-magistrated-icon'/>
                                                : null}
                                        </div>
                                        <Card key={id} card={card} type="character" game={this}
                                              isToken={true}/>
                                    </div>;
                                })}
                            </div>
                            <DistrictPileCounters data={data}/>
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
                                        <Card key={id} card={card} type="card" id={id} inHand={true}
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
                                {data.phase == 2 && ['assassin-action', 'witch-action', 'magistrate-action'].includes(data.player.action) && !data.userAction ?
                                    <div className="choose-character">
                                        <p className="status-text">Выберите персонажа
                                            для {data.player.action === "witch-action" ? "колдовства" :
                                                data.player.action === "assassin-action" ? "убийства" :
                                                    data.cardChosen.length == 0 ? "ордера" : "блефа"}</p>
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
                                {data.phase == 2 && data.player.action === "seer-return" ?
                                    <div className="status-text" className="choose-character">
                                        <p className="status-text" className="status-text">Выберите карту, чтобы отдать
                                            её {window.commonRoom.getPlayerName(data.playerSlots[data.seerReturnSlot])}</p>
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
                                        {canTakeResource ?
                                            <button onClick={() => this.handleTakeResource('coins')}>Получить 2
                                                монеты</button> : null}
                                        {canTakeResource ?
                                            <span className="button-or">
                                                или
                                            </span> : null}
                                        {canTakeResource ?
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
                                        {blackmailedOpenAction || magistrateOpenAction ?
                                            <button onClick={() => this.handleTokenOpen('yes')}>Раскрыть
                                                свой {blackmailedOpenAction ? "шантаж" : "орден"}</button> : null}
                                        {blackmailedOpenAction || magistrateOpenAction ?
                                            <span className="button-or">
                                                или
                                            </span> : null}
                                        {blackmailedOpenAction || magistrateOpenAction ?
                                            <button onClick={() => this.handleTokenOpen('no')}>Оставить
                                                свой {blackmailedOpenAction ? "шантаж" : "орден"} в
                                                тайне</button> : null}
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
                                        {seerAction ?
                                            <button onClick={() => this.handleSeerAction()}>Действие провидицы
                                            </button> : null}
                                        {this.state.player.action === 'scholar-action' ?
                                            <button onClick={() => this.handleScholar()}>Раскопать
                                                карту</button> : null}
                                        {(this.hasDistricts('framework') && data.player.hand.length && data.buildDistricts > 0)
                                        && (!magistrateOpenAction && !seerReturnAction) ?
                                            <button onClick={() => this.setUserAction("framework")}>Исп. Строительные
                                                леса</button> : null}
                                        {(this.hasDistricts('museum') && data.player.hand.length && data.museumAction)
                                        && (!magistrateOpenAction && !seerReturnAction) ?
                                            <button onClick={() => this.setUserAction("museum")}>Исп.
                                                Музей</button> : null}
                                        {(this.hasDistricts('laboratory') && data.player.hand.length && data.laboratoryAction)
                                        && (!magistrateOpenAction && !seerReturnAction) ?
                                            <button onClick={() => this.setUserAction("laboratory")}>Исп.
                                                Лабораторию</button> : null}
                                        {this.hasDistricts('arsenal')
                                        && !magistrateOpenAction ?
                                            <button onClick={() => this.setUserAction("arsenal")}>Исп.
                                                Арсенал</button> : null}
                                        {this.hasDistricts('forgery') && data.playerGold[data.userSlot] > 1 && data.forgeryAction
                                        && !magistrateOpenAction ?
                                            <button onClick={() => this.handleForgery()}>Исп. Кузницу</button> : null}
                                        {incomeValue ?
                                            <button onClick={() => this.handleTakeIncome()}>Получить
                                                доход ({incomeValue})</button> : null}
                                        {data.tookResource && !magistrateOpenAction && !blackmailedResponseAction
                                        && !blackmailedOpenAction && !emperorAction && !emperor && !seerReturnAction ?
                                            <button onClick={() => this.handleEndTurn()}>Конец хода</button> : null}
                                    </div>
                                    : null}

                                {data.phase === 3 ?
                                    <div className="choose-card">
                                        <p className="status-text">{
                                            data.player.action !== "spy-cards"
                                                ? "Выберите карту"
                                                : "Просмотр карт"
                                        }</p>
                                        {data.player.action === "spy-cards"
                                            ? <div className="action-button">
                                                <button onClick={() => this.handleSpyCardsEnd()}>Продолжить</button>
                                            </div>
                                            : ""}
                                        <div className="cards-list">
                                            {data.player && data.player.choose && data.player.choose.map((card, id) => (
                                                <Card key={id} card={card} type="card" game={this} id={id}
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
                                            {(abbatIncome && incomeValue) ?
                                                ([...Array(incomeValue + 1).keys()].map((i) => (
                                                    <button
                                                        onClick={() => this.handleAbbatIncome(i)}>{i} к.</button>))) : null}
                                            {spyUserAction ?
                                                <button onClick={() => this.handleSpyChooseDistrict(4)}>Дворянский
                                                </button> : null}
                                            {spyUserAction ?
                                                <button onClick={() => this.handleSpyChooseDistrict(5)}>Церковный
                                                </button> : null}
                                            {spyUserAction ?
                                                <button onClick={() => this.handleSpyChooseDistrict(6)}>Торговый
                                                </button> : null}
                                            {spyUserAction ?
                                                <button onClick={() => this.handleSpyChooseDistrict(8)}>Воинский
                                                </button> : null}
                                            {spyUserAction ?
                                                <button onClick={() => this.handleSpyChooseDistrict(9)}>Особый
                                                </button> : null}
                                            {cardinalActionCards ?
                                                <button onClick={() => this.handleCardinalActionCards()}>Применить
                                                </button> : null}
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
                    {data.showCreateGamePanel && isHost && data.phase === 0 ?
                        <CreateGamePanel data={data} game={this}/>
                        : ""}
                    {data.showCardsPanel ?
                        <SetupViewer data={data} game={this}/>
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
                            {isHost && data.phase !== 0 && data.winnerPlayer == null
                                ? (<i onClick={() => this.handleToggleTimersPause()}
                                      className="material-icons settings-button"
                                      title={data.timersPaused ? "Resume timers" : "Pause timers"}>
                                    {data.timersPaused ? "play_arrow" : "pause"}
                                </i>)
                                : ""}
                            {!isHost || data.phase !== 0
                                ? (<i onClick={() => this.handleClickShowCards()}
                                      title="Посмотреть сетап партии" className="material-icons settings-button">amp_stories</i>)
                                : ""}
                            <i onClick={() => this.handleToggleSounds()}
                               className="material-icons settings-button"
                               title={data.soundsMuted ? "Enable sounds" : "Disable sounds"}>
                                {data.soundsMuted ? "volume_off" : "volume_up"}
                            </i>
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
