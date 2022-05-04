const { InverseClient, WebsocketClient, DefaultLogger } = require('bybit-api')
var readline = require('readline');
//const iohook = require('iohook');
const sound = require("sound-play") //https://www.npmjs.com/package/sound-play
var colors = require('colors')
var fs = require('fs')

// Disable all logging on the silly level
DefaultLogger.silly = () => {};

const utils = require('./utils.js')

const API_KEY = ''
const PRIVATE_KEY = ''
const useLivenet = true

const client = new InverseClient(
    API_KEY,
    PRIVATE_KEY,
    useLivenet
);

// config.js
let runningCycles = 1
let minCyclesExperience = 0
let priceDiffMark_1 = 0
let priceDiffMark_2 = 0
let priceDiffMark_3 = 0
let lowPriceGoodToBuy1 = 0
let liqBarsThreshold = 0
let mainLoopDelay = 0
let maxOwnContracts = 0
let minDelayBetweenOrders = 0
let minRunningCyclesToPlaceOrder = 0
let offerOffsetDown = 0
let highChangeThreshold = 0
let qtdContractsToBuy = 0
let ancientOrderMinutes = 0
let minPriceDistanceOrder = 0
let excludeFromDebugLog = []
let autoManageOrderPrice = false
let autoMinPriceDistance = -1000
let autoOfferOffsetDown = 0
let considerClosingPositionPriceDistance = 0
let priceDistThreshold = 0
let qtdContractsToClosePosition = 0
let liquidationDistAlert = 100
let liquidationQtdOffer = 10
let minOwnedContractsToStartClosingPosition = 0
let ancientClosePositionOrderMinutes = 0
let enableSounds = true

// response vars
let lastPrice = 0
let highPrice24h = 0
let lowPrice24h = 0
let lastLastPrice = 0
let entryPrice = 0
let liqPrice = 0
let headerCounter = 0
let headerInterval = 0
let ownedContracts = 0
let walletBalance = 0
let orderMargin = 0
let positionMargin = 0
let lastMarkPrice = 0
let positionSide = 0

// aux vars
let pdist = 0 // distance between position to marketprice
let ldist = 0 // distance between marketprice to liquidation
let pdistMax = 0
let pdistMin = 0
let command = 'wait'
let PLNonRealized = 0
let lastOfferDate = null
let lastOrderId = ''
let lastOrderPrice = 0
let lastClosePositionOrderId = 0
let lastClosePositionOrderPrice = 0
let lastClosePositionOrderCreatedAt = null
let lastOrderCreatedAt = null
let lastOrderQty = 0;
let bybitApiCalls = 0
let bybitApiCallsPerMinute = 0
let dtCalcApiCals = new Date()
let dtStartApiCals = new Date()
let priceHistory = []
let activeOrderExists = false
let isLongActive = false
let lastEntryPrice = 0
let keyPressed_H = false
let showheader = false
let currentMaxPrice = 0
let currentMinPrice = 200000
let skipLineFeedThisRound = false
let samePrice1x = false
let samePrice2x = false
let lastClosePositionOrderDate = new Date()
let shortExitRunning = false
let lastCloseShortOrderId = ''
let startingLongPosition = false

const wsConfig = {
    key: API_KEY,
    secret: PRIVATE_KEY,
    livenet: useLivenet,

    // how long to wait (in ms) before deciding the connection should be terminated & reconnected
    // pongTimeout: 1000,

    // how often to check (in ms) that WS connection is still alive
    pingInterval: 60000,

    // how long to wait before attempting to reconnect (in ms) after connection is closed
    // reconnectTimeout: 500,

    // config options sent to RestClient (used for time sync). See RestClient docs.
    // restOptions: { },

    // config for axios used for HTTP requests. E.g for proxy support
    // requestOptions: { }

    // override which URL to use for websocket connections
    // wsUrl: 'wss://stream.bytick.com/realtime'
};

const ws = new WebsocketClient(wsConfig, DefaultLogger);

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY)
    process.stdin.setRawMode(true);

process.stdin.on('keypress', (chunk, key) => {
    if (key && key.name == 'h')
        keyPressed_H = true

    if (key && key.name == 'm')
        sound.play("D:\\workspace\\bybit\\abbot\\buybit-machine\\Connected.mp3", 0.2)

    if (key && key.name == 's')
        enableSounds ? enableSounds = false : enableSounds = true

    if (key && key.name == 'q')
        process.exit()

});

mainLoop();

async function mainLoop() {

    ws.on('update', async data => {

        console.log('[ '.brightCyan.bgBlack +
            'ORDER '.brightYellow.bgBlack +
            data.data[0].side.brightYellow.bgBlack +
            ' ] '.brightCyan.bgBlack +
            data.data[0].order_status.toString().brightYellow.bgBlack +
            ' ->'.brightYellow.bgBlack +
            '> '.yellow.bgBlack +
            data.data[0].qty.toString().brightWhite.bgBlack +
            'x'.white.bgBlack +
            '@'.yellow.bgBlack +
            data.data[0].price.toString().brightYellow.bgBlack + ' ' +
            data.data[0].order_id.toString().cyan.bgBlack + ' ' +
            new Date().toString().substring(16).yellow.bgBlack)


        if (data.data[0].order_status == 'Filled' || data.data[0].order_status == 'Cancelled') {

            lastOrderPrice = 0
            lastOfferDate = new Date()
            activeOrderExists = false
            if (data.data[0].order_status == 'Filled' && enableSounds) {
                sound.play("D:\\workspace\\bybit\\abbot\\buybit-machine\\money-soundfx.mp3", 0.06)
                lastClosePositionOrderDate = new Date()

                if (data.data[0].side == 'Buy') startingLongPosition = false

            }
            //if (data.data[0].order_id = lastCloseShortOrderId) shortExitRunning = false
            let dtnow = new Date()

            let logOutput = dtnow.toString().replace('GMT-0300 (Brasilia Standard Time)', '')
            logOutput = logOutput + "owned:" + ownedContracts + " "
            logOutput = logOutput + "entryPrice:" + Number(entryPrice).toFixed(2) + " "
            logOutput = logOutput + "liqPrice:" + Number(liqPrice).toFixed(2) + " "
            logOutput = logOutput + "price:" + Number(lastPrice).toFixed(2)
            logOutput = logOutput + "PLNonRealized:" + Number(PLNonRealized).toFixed(2) + " \n"

            fs.appendFile('bybit.log', logOutput, (err) => {
                if (err) throw err;
                //console.log('Log file updated!');
            });

        } else if (data.data[0].order_status == 'New') {
            skipLineFeedThisRound = true
        }
    });

    ws.on('open', ({ wsKey, event }) => {
        //console.log('connection open for websocket with ID: ' + wsKey);
    });

    ws.subscribe(['order'])


    //sound.play("D:\\workspace\\bybit\\abbot\\buybit-machine\\Connected.mp3", 0.2)

    console.log()
    console.log('  .______  ._______ ._______  _____.______._'.brightYellow.bgBlack)
    console.log('  :      \\ : __   / : .___  \\ \\__ _:|\\__ _:|'.brightYellow.bgBlack)
    console.log('  |   .   ||  |>  \\ | :   |  |  |  :|  |  :|'.yellow.bgBlack)
    console.log('  |   :   ||  |>   \\|     :  |  |   |  |   |'.yellow.bgBlack)
    console.log('  |___|   ||_______/ \\_. ___/   |   |  |   |'.magenta.bgBlack)
    console.log('      |___|            :/       |___|  |___|'.brightMagenta.bgBlack)
    console.log('                       :                    '.brightWhite.bgBlack)
    console.log()

    clearAllOrders() // remove ofertas existentes

    await new Promise(resolve => setTimeout(resolve, 3000))

    while (true) {

        await loadConfigs()
        await getTickers()
        await getPosition()
        await calculations()
        printLog()

        await new Promise(resolve => setTimeout(resolve, mainLoopDelay))
        runningCycles++
        lastLastPrice = lastPrice
        skipLineFeedThisRound = false
    }

    async function loadConfigs() {
        return new Promise(resolve => {
            fs.readFile('./config.json', 'utf8', function(err, data) {
                if (err) throw err; // we'll not consider error handling for now
                var obj = JSON.parse(data)
                priceDiffMark_1 = obj.priceDiffMark_1
                priceDiffMark_2 = obj.priceDiffMark_2
                priceDiffMark_3 = obj.priceDiffMark_3
                lowPriceGoodToBuy1 = obj.lowPriceGoodToBuy1
                liqBarsThreshold = obj.liqBarsThreshold
                if (mainLoopDelay != obj.mainLoopDelay) {
                    bybitApiCalls = 0
                    dtCalcApiCals = new Date()
                }
                mainLoopDelay = obj.mainLoopDelay
                headerInterval = obj.headerInterval
                maxOwnContracts = obj.maxOwnContracts
                minDelayBetweenOrders = obj.minDelayBetweenOrders
                minRunningCyclesToPlaceOrder = obj.minRunningCyclesToPlaceOrder
                offerOffsetDown = obj.offerOffsetDown
                highChangeThreshold = obj.highChangeThreshold
                qtdContractsToBuy = obj.qtdContractsToBuy
                ancientOrderMinutes = obj.ancientOrderMinutes
                minPriceDistanceOrder = obj.minPriceDistanceOrder
                excludeFromDebugLog = obj.excludeFromDebugLog
                autoManageOrderPrice = obj.autoManageOrderPrice
                if (autoMinPriceDistance != obj.autoMinPriceDistance)
                    showheader = true
                autoMinPriceDistance = obj.autoMinPriceDistance
                autoOfferOffsetDown = obj.autoOfferOffsetDown
                considerClosingPositionPriceDistance = obj.considerClosingPositionPriceDistance
                priceDistThreshold = obj.priceDistThreshold
                qtdContractsToClosePosition = obj.qtdContractsToClosePosition
                liquidationDistAlert = obj.liquidationDistAlert
                liquidationQtdOffer = obj.liquidationQtdOffer
                minOwnedContractsToStartClosingPosition = obj.minOwnedContractsToStartClosingPosition
                ancientClosePositionOrderMinutes = obj.ancientClosePositionOrderMinutes
                enableSounds = obj.enableSounds
                resolve('')
            });
        });
    }

    async function getTickers() {
        return new Promise(resolve => {
            bybitApiCalls++
            client.getTickers({ symbol: 'BTCUSD' })
                .then(response => {
                    debugFile(response, 'getTickers')
                    lastPrice = response.result[0].last_price
                    highPrice24h = response.result[0].high_price_24h
                    lowPrice24h = response.result[0].low_price_24h
                    lastMarkPrice = response.result[0].mark_price

                    resolve('')
                })
                .catch(err => {
                    debugFile(err, 'getTickers')
                    console.error("getTickers inverse error: ", err)
                    resolve('')
                });
        });
    }

    async function getPosition() {
        return new Promise(resolve => {
            bybitApiCalls++
            client.getPosition({ symbol: 'BTCUSD' })
                .then(response => {
                    debugFile(response, 'getPosition')
                    lastEntryPrice = entryPrice
                    entryPrice = response.result.entry_price
                    liqPrice = response.result.liq_price
                    ownedContracts = response.result.size
                    unrealizedPNL = response.result.unrealised_pnl
                    walletBalance = response.result.wallet_balance
                    orderMargin = response.result.order_margin
                    positionMargin = response.result.position_margin
                    positionSide = response.result.side

                    if (response.result.side == 'Buy')
                        isLongActive = true
                    else
                        isLongActive = false

                    resolve('')
                })
                .catch(err => {
                    debugFile(err, 'getPosition')
                    console.error("getPosition inverse error: ", err)
                    resolve('')
                });
        });
    }

    async function clearAllOrders() {
        return new Promise(resolve => {

            bybitApiCalls++
            client.queryActiveOrder({ symbol: 'BTCUSD' })
                .then(async response => {
                    debugFile(response, 'queryActiveOrder')
                        //console.log("RESPONSE queryActiveOrder: ", response);
                    for (let i = 0; i < response.result.length; i++) {
                        const offer = response.result[i]
                        closeOrderByID(offer.order_id)
                    }

                }).catch(err => {
                    debugFile(err, 'queryActiveOrder')
                    console.error("clearAllOrders queryActiveOrder inverse error: ", err)
                });
            resolve('')
        });
    }

    async function placeActiveOrder(price) {

        return new Promise(resolve => {

            activeOrderExists = false
            bybitApiCalls++
            client.queryActiveOrder({ symbol: 'BTCUSD' })
                .then(async response => {
                    debugFile(response, 'placeActiveOrder/queryActiveOrder')
                        //console.log("RESPONSE queryActiveOrder: ", response);
                    for (let i = 0; i < response.result.length; i++) {
                        const offer = response.result[i]

                        if (offer.order_id == lastOrderId.toString()) {
                            activeOrderExists = true
                        }
                    }

                    if (activeOrderExists) {

                        process.stdout.write(`@`.white.bgBlack)
                        process.stdout.write(`${lastOrderPrice.toFixed(2)}`.brightWhite.bgBlack)
                        process.stdout.write(`x`.grey.bgBlack)
                        process.stdout.write(`${lastOrderQty}`.white.bgBlack)
                        console.log()
                        skipLineFeedThisRound = true

                    } else if ((Math.abs(Number(pdist)) < Number(minPriceDistanceOrder)) && pdist != lastPrice && !autoManageOrderPrice) {

                        process.stdout.write(`Min pdist: ${minPriceDistanceOrder}`.yellow.bgBlack)

                    } else if (Number(pdist) > -5) { // protecao pra nao comprar com valor aproximado
                        process.stdout.write(`Price too close @ ${Number(pdist).toFixed(2).brightYellow.bgBlack} `)
                        console.log()

                    } else { // cria ordem long

                        bybitApiCalls++
                        if (enableSounds) sound.play("D:\\workspace\\bybit\\abbot\\buybit-machine\\tick.mp3", 0.3)
                        client.placeActiveOrder({ order_type: 'Limit', side: 'Buy', symbol: 'BTCUSD', qty: qtdContractsToBuy, price: price, time_in_force: 'GoodTillCancel' })
                            .then(response => {
                                debugFile(response, 'placeActiveOrder')
                                    //console.log("RESPONSE: ", response)
                                lastOrderId = response.result.order_id
                                lastOrderPrice = response.result.price
                                lastOrderCreatedAt = response.result.created_at
                                lastOrderQty = response.result.qty
                                lastOfferDate = new Date()
                                resolve('')
                            })
                            .catch(err => {
                                debugFile(err, 'placeActiveOrder')
                                console.error("placeActiveOrder error: ", err)
                                resolve('')
                            });

                    }
                    //console.log()

                }).catch(err => {
                    debugFile(err, 'placeActiveOrder')
                    console.error("queryActiveOrder inverse error: ", err)
                });


        })
    }

    async function closePosition(price) {

        await getPosition() // atualiza ownedContracts, isLongActive, etc..

        activeOrderExists = false

        return new Promise(resolve => {

            if (minOwnedContractsToStartClosingPosition != 0 && ownedContracts < minOwnedContractsToStartClosingPosition) {
                process.stdout.write(` [ACP] Min Contracts is ${minOwnedContractsToStartClosingPosition}`.brightRed.bgBlack)
            } else if (positionSide == 'Sell') {
                process.stdout.write(` [ACP] positionSide is Buy`.brightRed.bgBlack)
            } else if (qtdContractsToClosePosition > 0) {

                if (isLongActive && qtdContractsToClosePosition > ownedContracts) {
                    qtdContractsToClosePosition = ownedContracts
                }

                let qtdClosePositionOrders = 0
                bybitApiCalls++
                client.queryActiveOrder({ symbol: 'BTCUSD' })
                    .then(async response => { // verifica se ja existe oferta de short aguardando

                        debugFile(response, 'closePosition/queryActiveOrder')
                            //console.log("RESPONSE queryActiveOrder: ", response);

                        for (let i = 0; i < response.result.length; i++) {
                            activeOrderExists = true

                            const offer = response.result[i]

                            if (offer.side == 'Sell') {
                                qtdClosePositionOrders++
                            }

                        }

                        //console.log((new Date().getTime() - lastClosePositionOrderDate.getTime()))
                        if (qtdClosePositionOrders == 0 && ((new Date().getTime() - lastClosePositionOrderDate.getTime()) > 3000)) { //protecao para nao encavalar shorts
                            bybitApiCalls++
                            if (enableSounds) sound.play("D:\\workspace\\bybit\\abbot\\buybit-machine\\tick.mp3", 0.2)
                            client.placeActiveOrder({ order_type: 'Limit', side: 'Sell', symbol: 'BTCUSD', qty: qtdContractsToClosePosition, price: Number(lastPrice) + 1, time_in_force: 'GoodTillCancel' })
                                .then(response => {
                                    debugFile(response, 'closePosition')
                                        //console.log("RESPONSE: ", response)
                                    lastClosePositionOrderId = response.result.order_id
                                    lastClosePositionOrderPrice = response.result.price
                                    lastClosePositionOrderCreatedAt = response.result.created_at
                                })
                                .catch(err => {
                                    debugFile(err, 'closePosition')
                                    console.error("closePosition error: ", err)
                                });

                        }

                    }).catch(err => {
                        debugFile(err, 'placeActiveOrder')
                        console.error("queryActiveOrder inverse error: ", err)
                    });

            }
            resolve('')
        });
    }

    async function avoidLiquidation(price) {

        return new Promise(resolve => {
            bybitApiCalls++
            if (enableSounds) sound.play("D:\\workspace\\bybit\\abbot\\buybit-machine\\tick.mp3", 0.2)
            client.placeActiveOrder({ order_type: 'Limit', side: 'Buy', symbol: 'BTCUSD', qty: liquidationQtdOffer, price: price, time_in_force: 'GoodTillCancel' })
                .then(response => {
                    debugFile(response, 'avoidLiquidation')
                        //console.log("RESPONSE: ", response)
                        //lastClosePositionOrderId = response.result.order_id
                    resolve('')
                })
                .catch(err => {
                    debugFile(err, 'avoidLiquidation')
                    console.error("avoidLiquidation error: ", err)
                    resolve('')
                });

        });
    }

    async function closeOrderByID(orderId) {
        //console.log()
        return new Promise(resolve => {
            bybitApiCalls++
            client.cancelActiveOrder({ symbol: 'BTCUSD', order_id: orderId })
                .then(response => {
                    debugFile(response, 'closeOrderByID')
                        //console.log("RESPONSE removeOrderById : ", response)
                    resolve('')
                })
                .catch(err => {
                    debugFile(err, 'closeOrderByID')
                    console.error("cancelActiveOrder error: ", err)
                    resolve('')
                });
            //console.log()
        });
    }

    async function startLongPosition() {
        return new Promise(resolve => {

            startingLongPosition = true

            client.placeActiveOrder({ order_type: 'Market', side: 'Buy', symbol: 'BTCUSD', qty: 1, price: lastPrice, time_in_force: 'GoodTillCancel' })
                .then(response => {
                    debugFile(response, 'placeActiveOrder')
                        //console.log("RESPONSE: ", response)
                    lastOrderId = response.result.order_id
                    lastOrderPrice = response.result.price
                    lastOrderCreatedAt = response.result.created_at
                    lastOrderQty = response.result.qty
                    lastOfferDate = new Date()
                    resolve('')
                })
                .catch(err => {
                    debugFile(err, 'placeActiveOrder')
                    console.error("placeActiveOrder error: ", err)
                    resolve('')
                });

        });

    }

    async function calculations() {

        return new Promise(resolve => {

            if (ownedContracts != 0) {
                if (isLongActive)
                    pdist = Number(lastPrice - entryPrice).toFixed(2)
                else
                    pdist = Number(entryPrice - lastPrice).toFixed(2)

            }

            if (Number(pdist) >= Number(pdistMax)) pdistMax = pdist
            if (Number(pdist) <= Number(pdistMin)) pdistMin = pdist

            ldist = Number(lastPrice - liqPrice);

            let lastCommand = command;

            //prevent liquidation
            if (ldist > 0 && ldist < liquidationDistAlert) {
                command = 'Avoiding Liquidation!'

            } else if (pdist > considerClosingPositionPriceDistance) { // TODO is not working

                command = 'take profit!'

            } else {
                command = '';

                if (lastPrice > entryPrice) // quando o valor ainda é maior que o valor da posicao
                //command = 'Seeking'.yellow.bgBlack + '@'.brightYellow.bgBlack + Number(lowPriceGoodToBuy1).toFixed(2).toString().yellow.bgBlack
                    command = 'Reading market data...'.yellow.bgBlack

                if ((Math.abs((entryPrice - lastPrice))) > priceDiffMark_1) // quando atinge a diferenca desejada para comprar mais Mark_1
                    command = 'Mark #1';

                if ((Math.abs((entryPrice - lastPrice))) > priceDiffMark_2)
                    command = 'Mark #2';

                if ((Math.abs((entryPrice - lastPrice))) > priceDiffMark_3)
                    command = 'Mark #3';

                if (autoManageOrderPrice) {
                    // Verifica se o momento atual é oportuno para criar oferta
                    if (pdist < 0 && Math.abs(pdist) >= autoMinPriceDistance) {
                        command = `Auto`;
                    }
                } else if (Number(lastPrice) <= Number(lowPriceGoodToBuy1)) {
                    command = 'GBuy @ ' + lowPriceGoodToBuy1.toFixed(2);
                }

            }

            if (runningCycles > minCyclesExperience) {

                priceHistory.push(lastPrice)

                if (priceHistory.length == 10) {
                    let d = priceHistory[9] - priceHistory[0]
                    priceHistory.splice(0, 1);
                }

                PLNonRealized = (unrealizedPNL / positionMargin) * 100;

                PLNonRealizedOFTotal = (unrealizedPNL / walletBalance) * 100;

                bybitApiCallsPerMinute = (bybitApiCalls / ((new Date().getTime() - dtCalcApiCals.getTime()) / 1000) * 60)


                if (lastOrderCreatedAt != null) { // check ancient Long orders
                    let dt = new Date(lastOrderCreatedAt)
                    let timePassedOfActiveOrder = new Date().getTime() - dt.getTime()

                    if (timePassedOfActiveOrder > (ancientOrderMinutes * 1000 * 60)) {
                        closeOrderByID(lastOrderId)
                    }
                }

                if (lastClosePositionOrderCreatedAt != null) { // check ancient Short orders
                    let dtlcp = new Date(lastClosePositionOrderCreatedAt)
                    let timePassedOfClosePositionActiveOrder = new Date().getTime() - dtlcp.getTime()
                    if (timePassedOfClosePositionActiveOrder > (ancientClosePositionOrderMinutes * 1000 * 60)) {
                        closeOrderByID(lastClosePositionOrderId)
                    }
                }

            }

            if (lastPrice > currentMaxPrice) currentMaxPrice = lastPrice
            if (lastPrice < currentMinPrice) currentMinPrice = lastPrice

            resolve('');
        });
    }

    async function printLog() {

        if (headerCounter >= headerInterval || headerCounter == 0 || keyPressed_H || showheader) {
            keyPressed_H = false
            showheader = false
                //sound.play("D:\\workspace\\bybit\\bemtevi.mp3", 0.2);

            process.stdout.write('|'.brightMagenta.bgBlack)
            process.stdout.write('[24h:'.white.bgBlack)
            utils.printCurrPriceBars(highPrice24h, lowPrice24h, lastPrice)
            process.stdout.write(']'.white.bgBlack)
            process.stdout.write(` ${Number((((new Date().getTime() - dtStartApiCals) / 1000) / 60) / 60).toFixed(2)}`.grey.bgBlack + 'h')
            process.stdout.write(` ${autoManageOrderPrice}`.brightMagenta.bgBlack)
            process.stdout.write(`;`.grey.bgBlack)
            process.stdout.write(`${autoMinPriceDistance}`.brightMagenta.bgBlack)
            process.stdout.write(`;`.grey.bgBlack)
            process.stdout.write(`${qtdContractsToBuy}`.brightMagenta.bgBlack)
            process.stdout.write(`;`.grey.bgBlack)
            process.stdout.write(`${considerClosingPositionPriceDistance}`.brightMagenta.bgBlack)
            process.stdout.write(`;`.grey.bgBlack)
            process.stdout.write(`${qtdContractsToClosePosition}`.brightMagenta.bgBlack)
            process.stdout.write(' ' + Number(bybitApiCallsPerMinute).toFixed(0).toString().grey.bgBlack + '/m'.grey.bgBlack)
            process.stdout.write(` wb=${walletBalance} om=${orderMargin} pm=${positionMargin} m%=${PLNonRealized.toFixed(2)}% t%=${PLNonRealizedOFTotal.toFixed(2)}%`.grey.bgBlack)

            console.log()
            headerCounter = 0
        }
        headerCounter++;
        process.stdout.write('|'.magenta.bgBlack)
        process.stdout.write(`${ownedContracts}`.yellow.bgBlack)
        process.stdout.write(`@`.brightYellow.bgBlack)
        utils.printFancyPrice(colors, 'white', 'yellow', 'grey', Number(entryPrice).toFixed(2))

        process.stdout.write(` C`.brightGreen.bgBlack)
        process.stdout.write(`@`.green.bgBlack)
        utils.printFancyPrice(colors, 'white', 'green', 'grey', (Number(entryPrice) + Number(considerClosingPositionPriceDistance)).toFixed(2))
        process.stdout.write(` L`.brightRed.bgBlack)
        process.stdout.write(`@`.red.bgBlack)
        utils.printFancyPrice(colors, 'white', 'red', 'grey', Number(liqPrice).toFixed(2))

        if (Number(lastPrice) > Number(lastLastPrice)) {
            samePrice1x = false
            samePrice2x = false
            if (Math.abs(lastLastPrice - lastPrice) > highChangeThreshold) {
                process.stdout.write(` now`.brightGreen.bgBlack)

                if (lastPrice - lastOrderPrice < 12)
                    process.stdout.write(`@`.brightYellow.bgBlack)
                else if (lastPrice - lastOrderPrice < 25)
                    process.stdout.write(`@`.brightCyan.bgBlack)
                else if (lastOrderPrice > 0)
                    process.stdout.write(`@`.cyan.bgBlack)
                else
                    process.stdout.write(`@`.brightGreen.bgBlack)

                process.stdout.write(lastPrice.brightGreen.bgBlack)

            } else {
                process.stdout.write(` now`.white.bgBlack)
                if (lastPrice - lastOrderPrice < 12)
                    process.stdout.write(`@`.brightYellow.bgBlack)
                else if (lastPrice - lastOrderPrice < 25)
                    process.stdout.write(`@`.brightCyan.bgBlack)
                else if (lastOrderPrice > 0)
                    process.stdout.write(`@`.cyan.bgBlack)
                else
                    process.stdout.write(`@`.grey.bgBlack)


                process.stdout.write(lastPrice.green.bgBlack)
            }


        } else if (Number(lastPrice) < Number(lastLastPrice)) {
            samePrice1x = false
            samePrice2x = false

            if (Math.abs(lastLastPrice - lastPrice) > highChangeThreshold) {
                process.stdout.write(` now`.brightRed.bgBlack)

                if (lastPrice - lastOrderPrice < 12)
                    process.stdout.write(`@`.brightYellow.bgBlack)
                else if (lastPrice - lastOrderPrice < 25)
                    process.stdout.write(`@`.brightCyan.bgBlack)
                else if (lastOrderPrice > 0)
                    process.stdout.write(`@`.cyan.bgBlack)
                else
                    process.stdout.write(`@`.brightRed.bgBlack)

                process.stdout.write(lastPrice.brightRed.bgBlack)

            } else {
                process.stdout.write(` now`.white.bgBlack)

                if (lastPrice - lastOrderPrice < 12)
                    process.stdout.write(`@`.brightYellow.bgBlack)
                else if (lastPrice - lastOrderPrice < 25)
                    process.stdout.write(`@`.brightCyan.bgBlack)
                else if (lastOrderPrice > 0)
                    process.stdout.write(`@`.cyan.bgBlack)
                else
                    process.stdout.write(`@`.grey.bgBlack)

                process.stdout.write(lastPrice.red.bgBlack)
            }


        } else {
            process.stdout.write(` now`.white.bgBlack)

            if (lastPrice - lastOrderPrice < 12)
                process.stdout.write(`@`.brightYellow.bgBlack)
            else if (lastPrice - lastOrderPrice < 25)
                process.stdout.write(`@`.brightCyan.bgBlack)
            else if (lastOrderPrice > 0)
                process.stdout.write(`@`.cyan.bgBlack)
            else
                process.stdout.write(`@`.grey.bgBlack)

            if (samePrice2x)
                process.stdout.write(lastPrice.grey.bgBlack)
            else if (samePrice1x)
                process.stdout.write(lastPrice.white.bgBlack)
            else
                process.stdout.write(lastPrice.brightWhite.bgBlack)

            if (samePrice1x) samePrice2x = true
            samePrice1x = true

        }

        process.stdout.write(` M`.brightYellow.bgBlack)
        process.stdout.write(`@`.yellow.bgBlack)
            //process.stdout.write(lastMarkPrice.yellow.bgBlack)
        utils.printFancyPrice(colors, 'white', 'yellow', 'grey', lastMarkPrice)

        process.stdout.write(` `.grey.bgBlack)
        if (Number(pdist) >= Number(pdistMax)) {
            process.stdout.write(utils.indent(Number(pdist).toFixed(0), Number(pdist).toFixed(0).toString().length + 1, true).white.bgBlue)
        } else if (Number(pdist) <= Number(pdistMin)) {
            process.stdout.write(utils.indent(Number(pdist).toFixed(0), Number(pdist).toFixed(0).toString().length + 1, true).white.bgRed)
        } else if (Number(pdist) > 0)
            process.stdout.write(utils.indent(Number(pdist).toFixed(0), Number(pdist).toFixed(0).toString().length + 1, true).brightYellow.bgBlack)
        else
            process.stdout.write(utils.indent(Number(pdist).toFixed(0), Number(pdist).toFixed(0).toString().length + 1, true).white.bgBlack)

        //process.stdout.write(' ' + utils.indent((currentMaxPrice - currentMinPrice).toFixed(0), 4, true).black.bgGrey)
        process.stdout.write(' ['.cyan.bgBlack + considerClosingPositionPriceDistance.toString().grey.bgBlack)
        process.stdout.write('<'.grey.bgBlack)
        process.stdout.write('<'.white.bgBlack)
        process.stdout.write(Math.abs(Number(pdistMax).toFixed(0)).toString().cyan.bgBlack)
        process.stdout.write(' '.grey.bgBlack)
        utils.printPriceRangeBars(entryPrice, lastPrice, considerClosingPositionPriceDistance, priceDistThreshold, isLongActive)
        process.stdout.write(' '.grey.bgBlack)
        process.stdout.write(Math.abs(Number(pdistMin).toFixed(0)).toString().red.bgBlack)
        process.stdout.write('>'.white.bgBlack)
        process.stdout.write('>'.grey.bgBlack)
        process.stdout.write(autoMinPriceDistance.toString().grey.bgBlack + ']'.red.bgBlack)


        process.stdout.write(' ['.green.bgBlack)
            /*         if (!isLongActive && !shortExitRunning) {
                        await shortExit()
                    } */

        utils.printLiqBars(lastPrice, liqPrice, liqBarsThreshold, isLongActive)
        process.stdout.write('] '.green.bgBlack)

        if (Number(unrealizedPNL) > 0)
            process.stdout.write(utils.indent(Number(unrealizedPNL).toFixed(8), 9, true).yellow.bgBlack)
        else
            process.stdout.write(utils.indent(Number(unrealizedPNL).toFixed(8), 9, true).grey.bgBlack)

        process.stdout.write(' ' + utils.indent(Number(PLNonRealized).toFixed(1), 3, true).grey.bgBlack + '%'.grey.bgBlack)
        process.stdout.write(' '.bgBlack)

        if (command.search("Avoiding Liquidation!") == 0) {
            process.stdout.write(command.brightYellow.bgRed)
            avoidLiquidation(lastPrice)
        } else if (ownedContracts == 0 && !isLongActive & !startingLongPosition) {
            await startLongPosition()
        } else if (command.search("GBuy") == 0 || command.search("Auto") == 0) {
            process.stdout.write(command.white.bgBlack)
            process.stdout.write("_ ".grey.bgBlack)
            if (ownedContracts >= maxOwnContracts) {
                process.stdout.write(`maxOwnContracts reached.`)
            } else if (lastOfferDate != null && (new Date().getTime() - lastOfferDate.getTime() < minDelayBetweenOrders)) {
                process.stdout.write(`Delay ${new Date().getTime() - lastOfferDate.getTime()} of ${minDelayBetweenOrders}`)
            } else if (runningCycles < minRunningCyclesToPlaceOrder) {
                process.stdout.write(`runningCycles is ${runningCycles} of ${minRunningCyclesToPlaceOrder} `)
            } else {

                if (command.search("Auto") == 0) offerOffsetDown = autoOfferOffsetDown

                if (command.search("Auto") == 0 || command.search("GBuy") == 0) // Protecao para nao executar em outros comandos
                    await placeActiveOrder(Number(lastPrice) - Number(offerOffsetDown))

            }

        } else if (command.search("take profit!") == 0 && isLongActive) {
            process.stdout.write(command.brightYellow.bgBlack)
            await closePosition()

        } else {
            process.stdout.write(command.yellow.bgBlack)
        }

        process.stdout.write(" ".grey.bgBlack)

        if (!skipLineFeedThisRound) console.log()

    }

    function debugFile(object, source) {

        let dict = new Set(excludeFromDebugLog)

        if (!dict.has(source)) {
            let logOutput = "[" + source + "] \n"
            logOutput = logOutput + JSON.stringify(object, null, 2) + "}] \n"

            fs.appendFile('debug.log.json', logOutput, (err) => {
                if (err) throw err;
                //console.log('Debug file updated!');
            });

        }

    }

}